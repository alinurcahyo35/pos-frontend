import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, Download, Pencil, X, CheckCircle } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt   = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

const STATUS = {
  unpaid:  { label:'Belum Bayar', cls:'badge-danger' },
  partial: { label:'Sebagian',    cls:'badge-blue' },
  paid:    { label:'Lunas',       cls:'badge-teal' },
}

const emptyForm = {
  customer_id:'', customer_name:'', tanggal:today(),
  jatuh_tempo:'', catatan:'', diskon:'0', pajak:'0',
  items:[{ nama_item:'', qty:'1', satuan:'pcs', harga:'', hpp:'' }]
}

export default function PenjualanKredit() {
  const [state, setState] = useState({
    invoices: [], customers: [], filter: 'all',
    modal: null, selected: null, editMode: false,
    form: emptyForm,
    bayarForm: { tanggal:today(), jumlah:'', metode:'transfer', catatan:'' }
  })

  const set = patch => setState(s => ({ ...s, ...patch }))

  const load = useCallback(async (filter) => {
    try {
      const [invRes, custRes] = await Promise.all([
        api.get('/invoices', { params: { status: filter || state.filter } }),
        api.get('/customers')
      ])
      set({ invoices: invRes.data || [], customers: custRes.data || [] })
    } catch(e) {
      console.error(e)
      toast.error('Gagal memuat data')
    }
  }, [])

  useEffect(() => { load(state.filter) }, [state.filter])

  const subtotal = state.form.items.reduce((s,i) => s+(parseFloat(i.harga)||0)*(parseFloat(i.qty)||0), 0)
  const total    = subtotal - (parseFloat(state.form.diskon)||0) + subtotal*(parseFloat(state.form.pajak)||0)/100

  const openForm = (inv=null) => {
    if (inv) {
      set({
        form: {
          customer_id: String(inv.customer_id||''),
          customer_name: inv.customer_name||'',
          tanggal: inv.tanggal,
          jatuh_tempo: inv.jatuh_tempo||'',
          catatan: inv.catatan||'',
          diskon: String(inv.diskon||0),
          pajak: String(inv.pajak||0),
          items: (inv.items||[]).map(i=>({ nama_item:i.nama_item, qty:String(i.qty), satuan:i.satuan||'', harga:String(i.harga), hpp:String(i.hpp||0) }))
        },
        selected: inv, editMode: true, modal: 'form'
      })
    } else {
      set({ form: emptyForm, selected: null, editMode: false, modal: 'form' })
    }
  }

  const openDetail = async id => {
    try {
      const { data } = await api.get(`/invoices/${id}`)
      set({ selected: data, modal: 'detail' })
    } catch { toast.error('Gagal memuat detail') }
  }

  const [hppSuggestions, setHppSuggestions] = useState({}) // { idx: { hpp, nama } }

  const setFormItem = (idx, k, v) => set({
    form: { ...state.form, items: state.form.items.map((it, i) => i === idx ? { ...it, [k]: v } : it) }
  })

  // Fetch HPP suggestion saat nama item kehilangan fokus (onBlur)
  const fetchHppSuggestion = async (idx, nama) => {
    if (!nama || nama.trim().length < 2) return
    try {
      const { data } = await api.get('/products/hpp-lookup', { params: { nama: nama.trim() } })
      if (data.found && data.hpp > 0) {
        setHppSuggestions(s => ({ ...s, [idx]: { hpp: data.hpp, nama: data.product_name } }))
      } else {
        setHppSuggestions(s => { const n={...s}; delete n[idx]; return n })
      }
    } catch {}
  }

  const applySuggestion = (idx, hpp) => {
    set({ form: { ...state.form, items: state.form.items.map((it, i) => i === idx ? { ...it, hpp: String(hpp) } : it) } })
    setHppSuggestions(s => { const n={...s}; delete n[idx]; return n })
  }

  const addItem    = () => set({ form: { ...state.form, items: [...state.form.items, { nama_item:'', qty:'1', satuan:'pcs', harga:'', hpp:'' }] } })
  const removeItem = idx => set({ form: { ...state.form, items: state.form.items.filter((_,i)=>i!==idx) } })

  const saveInvoice = async e => {
    e.preventDefault()
    const payload = {
      ...state.form,
      diskon: parseFloat(state.form.diskon)||0,
      pajak:  parseFloat(state.form.pajak)||0,
      items:  state.form.items.map(i=>({ ...i, qty:parseFloat(i.qty)||1, harga:parseFloat(i.harga)||0, hpp:parseFloat(i.hpp)||0 }))
    }
    try {
      if (state.editMode && state.selected) {
        await api.put(`/invoices/${state.selected.id}`, payload)
        toast.success('Invoice diperbarui')
      } else {
        await api.post('/invoices', payload)
        toast.success('Invoice dibuat')
      }
      set({ modal: null })
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const saveBayar = async e => {
    e.preventDefault()
    try {
      await api.post(`/invoices/${state.selected.id}/bayar`, {
        ...state.bayarForm, jumlah: parseFloat(state.bayarForm.jumlah)
      })
      toast.success('Pembayaran dicatat')
      set({ modal: null })
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const hapus = async id => {
    if (!confirm('Hapus invoice ini?')) return
    await api.delete(`/invoices/${id}`)
    toast.success('Invoice dihapus')
    load(state.filter)
  }

  const printInvoice = async id => {
    try {
      const { data: inv } = await api.get(`/invoices/${id}`)
      const p = inv.profile || {}
      const win = window.open('', '_blank')
      win.document.write(buildHTML(inv, p))
      win.document.close()
      setTimeout(() => { win.focus(); win.print() }, 600)
    } catch { toast.error('Gagal generate PDF') }
  }

  const buildHTML = (inv, p) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${inv.nomor}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:32px}
.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0f6e56;padding-bottom:20px;margin-bottom:24px}
.co h1{font-size:20px;color:#0f6e56;margin-bottom:4px}.co p{font-size:12px;color:#555;line-height:1.6}
.inv{text-align:right}.inv .no{font-size:15px;font-weight:700;color:#0f6e56}.inv p{font-size:12px;color:#555;margin-top:3px}
.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;margin-top:4px}
.unpaid{background:#faece7;color:#993c1d}.partial{background:#e6f1fb;color:#185fa5}.paid{background:#e1f5ee;color:#085041}
.to{margin-bottom:20px}.to label{font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px}
.to p{font-size:14px;font-weight:700;margin-top:3px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#f5f3ee;padding:8px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;border-bottom:1px solid #e2dfd6}
td{padding:8px 12px;border-bottom:1px solid #e2dfd6}
.tots{margin-left:auto;width:260px}.tots td{border:none;padding:4px 12px}
.tots tr:last-child td{font-weight:700;font-size:15px;border-top:2px solid #0f6e56;padding-top:8px}
.ftr{margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end}
.bank{background:#f5f3ee;padding:12px 16px;border-radius:8px;font-size:12px;line-height:1.6}
.ttd{text-align:center}.ttd .line{margin-top:48px;border-top:1px solid #222;padding-top:6px;font-size:12px}
@media print{body{padding:16px}}</style></head><body>
<div class="hdr">
  <div class="co"><h1>${p.nama||'Nama Usaha'}</h1><p>${p.alamat||''}<br>${p.telp||''}${p.email?' · '+p.email:''}</p></div>
  <div class="inv"><div class="no">INVOICE</div><div class="no" style="font-size:13px">${inv.nomor}</div>
  <p>Tanggal: ${inv.tanggal}</p>${inv.jatuh_tempo?`<p>Jatuh Tempo: ${inv.jatuh_tempo}</p>`:''}
  <span class="badge ${inv.status}">${STATUS[inv.status]?.label||inv.status}</span></div>
</div>
<div class="to"><label>Kepada:</label><p>${inv.customer_name||'—'}</p></div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Satuan</th><th style="text-align:right">Harga</th><th style="text-align:right">Subtotal</th></tr></thead>
<tbody>${(inv.items||[]).map(i=>`<tr><td>${i.nama_item}</td><td>${i.qty}</td><td>${i.satuan||''}</td><td style="text-align:right">${fmt(i.harga)}</td><td style="text-align:right">${fmt(i.subtotal)}</td></tr>`).join('')}</tbody></table>
<table class="tots">
<tr><td>Subtotal</td><td style="text-align:right">${fmt(inv.subtotal)}</td></tr>
${inv.diskon>0?`<tr><td>Diskon</td><td style="text-align:right">- ${fmt(inv.diskon)}</td></tr>`:''}
${inv.pajak>0?`<tr><td>Pajak (${inv.pajak}%)</td><td style="text-align:right">${fmt(inv.subtotal*inv.pajak/100)}</td></tr>`:''}
<tr><td>Total</td><td style="text-align:right">${fmt(inv.total)}</td></tr>
${(inv.paid||0)>0?`<tr><td style="color:#0f6e56">Terbayar</td><td style="text-align:right;color:#0f6e56">- ${fmt(inv.paid)}</td></tr>`:''}
${(inv.sisa||0)>0?`<tr><td style="color:#993c1d">Sisa</td><td style="text-align:right;color:#993c1d">${fmt(inv.sisa)}</td></tr>`:''}
</table>
${inv.catatan?`<p style="font-size:12px;color:#666;margin-bottom:16px">Catatan: ${inv.catatan}</p>`:''}
<div class="ftr">
<div class="bank">${p.bank?`<strong>Transfer ke:</strong><br>${p.bank} · ${p.rekening||''}<br>a.n. ${p.atas_nama||''}`:''}</div>
<div class="ttd"><div class="line">Hormat Kami,<br><strong>${p.nama||''}</strong></div></div>
</div></body></html>`

  const { invoices, customers, filter, modal, selected, editMode, form, bayarForm } = state
  const totalPiutang = invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+(i.sisa||0),0)

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Penjualan Kredit & Piutang</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            Total piutang aktif: <strong style={{ color:'var(--danger)' }}>{fmt(totalPiutang)}</strong>
            {' · '}{invoices.length} invoice
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/invoices/export', 'penjualan_kredit.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => openForm()} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Buat Invoice
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['all','Semua'],['unpaid','Belum Bayar'],['partial','Sebagian'],['paid','Lunas']].map(([v,l]) => (
          <button key={v} onClick={() => set({ filter:v })} className={`btn ${filter===v?'btn-primary':'btn-secondary'}`}
            style={{ fontSize:12, padding:'6px 14px' }}>{l}</button>
        ))}
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>No. Invoice</th><th>Konsumen</th><th>Tanggal</th><th>Jatuh Tempo</th>
            <th style={{ textAlign:'right' }}>Total</th><th style={{ textAlign:'right' }}>Sisa</th>
            <th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {invoices.length === 0
              ? <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada invoice</td></tr>
              : invoices.map(inv => (
                <tr key={inv.id}>
                  <td><span className="mono" style={{ fontSize:12, fontWeight:600 }}>{inv.nomor}</span></td>
                  <td style={{ fontWeight:600 }}>{inv.customer_name||'-'}</td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{inv.tanggal}</td>
                  <td style={{ fontSize:13, color: inv.jatuh_tempo&&inv.jatuh_tempo<today()&&inv.status!=='paid'?'var(--danger)':'var(--text2)' }}>
                    {inv.jatuh_tempo||'-'}
                  </td>
                  <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(inv.total)}</td>
                  <td style={{ textAlign:'right', fontWeight:600, color:(inv.sisa||0)>0?'var(--danger)':'var(--teal)' }}>{fmt(inv.sisa||0)}</td>
                  <td><span className={`badge ${STATUS[inv.status]?.cls||'badge-blue'}`}>{STATUS[inv.status]?.label||inv.status}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      <button className="btn btn-secondary" title="Detail" onClick={() => openDetail(inv.id)} style={{ padding:'6px 9px' }}><Eye size={13}/></button>
                      <button className="btn btn-secondary" title="PDF" onClick={() => printInvoice(inv.id)} style={{ padding:'6px 9px' }}><Download size={13}/></button>
                      {inv.status!=='paid' && (
                        <button className="btn btn-primary" onClick={() => set({ selected:inv, bayarForm:{tanggal:today(),jumlah:String(inv.sisa||0),metode:'transfer',catatan:''}, modal:'bayar' })}
                          style={{ padding:'6px 9px', fontSize:11 }}>Bayar</button>
                      )}
                      <button className="btn btn-secondary" onClick={() => openForm(inv)} style={{ padding:'6px 9px' }}><Pencil size={13}/></button>
                      <button className="btn btn-danger" onClick={() => hapus(inv.id)} style={{ padding:'6px 9px' }}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* ── Modal Form ── */}
      {modal === 'form' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:700, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editMode?'Edit Invoice':'Buat Invoice Baru'}</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <form onSubmit={saveInvoice}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Konsumen</label>
                  <select className="input" value={form.customer_id} onChange={e => {
                    const c = customers.find(c => String(c.id) === e.target.value)
                    set({ form: { ...form, customer_id:e.target.value, customer_name:c?.nama||form.customer_name } })
                  }}>
                    <option value="">-- Pilih konsumen --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.kode} · {c.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama (jika tidak ada)</label>
                  <input className="input" placeholder="Nama konsumen" value={form.customer_name}
                    onChange={e => set({ form: { ...form, customer_name:e.target.value } })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Invoice</label>
                  <input className="input" type="date" required value={form.tanggal}
                    onChange={e => set({ form: { ...form, tanggal:e.target.value } })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jatuh Tempo</label>
                  <input className="input" type="date" value={form.jatuh_tempo}
                    onChange={e => set({ form: { ...form, jatuh_tempo:e.target.value } })}/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Item</div>
                <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 2fr 2fr 20px', gap:6, marginBottom:4 }}>
                  {['Nama Item','Qty','Satuan','Harga Jual','HPP',''].map((h,i) => (
                    <div key={i} style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.3px' }}>{h}</div>
                  ))}
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 2fr 2fr 20px', gap:6 }}>
                      <input className="input" required placeholder="Nama item" value={item.nama_item}
                        onChange={e => setFormItem(idx,'nama_item',e.target.value)}
                        onBlur={e => fetchHppSuggestion(idx, e.target.value)}/>
                      <input className="input" type="number" required min="0.01" step="0.01" placeholder="1" value={item.qty} onChange={e => setFormItem(idx,'qty',e.target.value)}/>
                      <input className="input" placeholder="pcs" value={item.satuan} onChange={e => setFormItem(idx,'satuan',e.target.value)}/>
                      <input className="input" type="number" required min="0" placeholder="0" value={item.harga} onChange={e => setFormItem(idx,'harga',e.target.value)}/>
                      <div style={{ position: 'relative' }}>
                        <input className="input" type="number" min="0" placeholder="0"
                          value={item.hpp} onChange={e => { setFormItem(idx,'hpp',e.target.value); setHppSuggestions(s=>{const n={...s};delete n[idx];return n}) }}
                          style={{ borderColor: item.hpp && item.hpp !== '0' ? 'var(--teal)' : undefined, width: '100%' }}/>
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)' }}><Trash2 size={14}/></button>
                    </div>
                    {/* Suggestion HPP dari resep */}
                    {hppSuggestions[idx] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, paddingLeft: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>💡 HPP dari resep <strong>{hppSuggestions[idx].nama}</strong>:</span>
                        <button type="button" onClick={() => applySuggestion(idx, hppSuggestions[idx].hpp)} style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                          background: '#f0fdf4', color: '#0f6e56', border: '1px solid #22c55e44',
                          cursor: 'pointer', fontFamily: 'Plus Jakarta Sans,sans-serif',
                        }}>
                          Pakai {fmt(hppSuggestions[idx].hpp)} →
                        </button>
                        <button type="button" onClick={() => setHppSuggestions(s=>{const n={...s};delete n[idx];return n})} style={{
                          fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer',
                        }}>✕ abaikan</button>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addItem} style={{ fontSize:12, padding:'6px 14px', marginTop:4 }}>+ Tambah Item</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Diskon (Rp)</label>
                  <input className="input" type="number" min="0" value={form.diskon} onChange={e => set({ form:{...form,diskon:e.target.value} })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Pajak (%)</label>
                  <input className="input" type="number" min="0" max="100" value={form.pajak} onChange={e => set({ form:{...form,pajak:e.target.value} })}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                  <div style={{ background:'var(--teal-light)', borderRadius:8, padding:'10px 14px', textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--teal-dark)' }}>Total</div>
                    <div style={{ fontSize:18, fontWeight:700, color:'var(--teal-dark)' }}>{fmt(total)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Catatan</label>
                <input className="input" placeholder="Opsional" value={form.catatan} onChange={e => set({ form:{...form,catatan:e.target.value} })}/>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => set({ modal:null })} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>{editMode?'Simpan Perubahan':'Buat Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Bayar ── */}
      {modal === 'bayar' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:380, padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>Catat Pembayaran</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={18}/></button>
            </div>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              {selected.nomor} · Sisa: <strong style={{ color:'var(--danger)' }}>{fmt(selected.sisa||0)}</strong>
            </p>
            <form onSubmit={saveBayar}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Bayar</label>
                <input className="input" type="date" required value={bayarForm.tanggal} onChange={e => set({ bayarForm:{...bayarForm,tanggal:e.target.value} })}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jumlah (Rp)</label>
                <input className="input" type="number" required min="1" value={bayarForm.jumlah}
                  onChange={e => set({ bayarForm:{...bayarForm,jumlah:e.target.value} })} style={{ fontSize:18, fontWeight:600 }}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Metode</label>
                <select className="input" value={bayarForm.metode} onChange={e => set({ bayarForm:{...bayarForm,metode:e.target.value} })}>
                  {['transfer','tunai','cek','giro'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Catatan</label>
                <input className="input" placeholder="Opsional" value={bayarForm.catatan} onChange={e => set({ bayarForm:{...bayarForm,catatan:e.target.value} })}/>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => set({ modal:null })} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Detail ── */}
      {modal === 'detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:540, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{selected.nomor}</div>
                <span className={`badge ${STATUS[selected.status]?.cls}`} style={{ marginTop:4, display:'inline-block' }}>{STATUS[selected.status]?.label}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-secondary" onClick={() => printInvoice(selected.id)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
                  <Download size={14}/> PDF
                </button>
                <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
              </div>
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              <div><strong>Konsumen:</strong> {selected.customer_name||'-'}</div>
              <div><strong>Tanggal:</strong> {selected.tanggal}{selected.jatuh_tempo?` · Jatuh Tempo: ${selected.jatuh_tempo}`:''}</div>
            </div>
            <table style={{ marginBottom:14 }}>
              <thead><tr><th>Item</th><th>Qty</th><th style={{ textAlign:'right' }}>Harga</th><th style={{ textAlign:'right' }}>Subtotal</th></tr></thead>
              <tbody>
                {(selected.items||[]).map((item,i) => (
                  <tr key={i}>
                    <td>{item.nama_item}</td><td>{item.qty} {item.satuan}</td>
                    <td style={{ textAlign:'right' }}>{fmt(item.harga)}</td>
                    <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign:'right', marginBottom:14 }}>
              <div style={{ fontSize:13, color:'var(--text2)' }}>Subtotal: {fmt(selected.subtotal)}</div>
              <div style={{ fontSize:16, fontWeight:700 }}>Total: {fmt(selected.total)}</div>
              <div style={{ fontSize:13, color:'var(--teal)', fontWeight:600 }}>Terbayar: {fmt(selected.paid||0)}</div>
              {(selected.sisa||0)>0 && <div style={{ fontSize:13, color:'var(--danger)', fontWeight:600 }}>Sisa: {fmt(selected.sisa)}</div>}
            </div>
            {(selected.payments||[]).length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Riwayat Pembayaran</div>
                {selected.payments.map((pay,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                    <span>{pay.tanggal} · {pay.metode}</span>
                    <span style={{ fontWeight:600, color:'var(--teal)' }}>{fmt(pay.jumlah)}</span>
                  </div>
                ))}
              </div>
            )}
            {selected.status !== 'paid' && (
              <button className="btn btn-primary" onClick={() => set({ bayarForm:{tanggal:today(),jumlah:String(selected.sisa||0),metode:'transfer',catatan:''}, modal:'bayar' })}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <CheckCircle size={15}/> Catat Pembayaran
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
