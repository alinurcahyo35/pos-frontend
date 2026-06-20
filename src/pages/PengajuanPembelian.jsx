import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, Pencil, X, Check, XCircle, RotateCcw, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt   = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

const STATUS = {
  diajukan:  { label:'Menunggu Persetujuan', cls:'badge-blue' },
  disetujui: { label:'Disetujui',            cls:'badge-teal' },
  ditolak:   { label:'Ditolak',               cls:'badge-danger' },
  revisi:    { label:'Perlu Revisi',          cls:'badge-purple' },
}

const KEPUTUSAN_OPTIONS = [
  { v:'disetujui', l:'Setuju' },
  { v:'revisi',    l:'Revisi' },
  { v:'ditolak',   l:'Tolak' },
]

const emptyItem = { mode:'bebas', ingredient_id:'', nama_item:'', qty:'1', satuan:'pcs', harga:'' }

const emptyForm = {
  kategori:'persediaan', supplier_name:'', tanggal:today(), alasan:'',
  items:[{ ...emptyItem }]
}

function KeputusanIcon({ v }) {
  if (v === 'disetujui') return <Check size={14}/>
  if (v === 'revisi') return <RotateCcw size={14}/>
  return <XCircle size={14}/>
}

export default function PengajuanPembelian() {
  const me = JSON.parse(localStorage.getItem('pos_user') || '{}')
  const isDireksi = me.role === 'direksi'

  const [state, setState] = useState({
    requests: [], ingredients: [], filter: 'all',
    modal: null, selected: null, editMode: false,
    form: emptyForm,
    keputusanForm: { keputusan:'disetujui', catatan_direksi:'' }
  })

  const set = patch => setState(s => ({ ...s, ...patch }))

  const load = useCallback(async (filter) => {
    try {
      const [reqRes, ingRes] = await Promise.all([
        api.get('/purchase-requests', { params: { status: filter || state.filter } }),
        api.get('/ingredients')
      ])
      set({ requests: reqRes.data || [], ingredients: ingRes.data || [] })
    } catch(e) {
      console.error(e)
      toast.error('Gagal memuat data')
    }
  }, [])

  useEffect(() => { load(state.filter) }, [state.filter])

  const total = state.form.items.reduce((s,i) => s+(parseFloat(i.harga)||0)*(parseFloat(i.qty)||0), 0)

  const openForm = (r) => {
    if (r) {
      set({
        form: {
          kategori: r.kategori,
          supplier_name: r.supplier_name||'',
          tanggal: r.tanggal,
          alasan: r.alasan||'',
          items: (r.items||[]).map(i=>({
            mode: i.ingredient_id ? 'bahan' : 'bebas',
            ingredient_id: i.ingredient_id ? String(i.ingredient_id) : '',
            nama_item:i.nama_item, qty:String(i.qty), satuan:i.satuan||'', harga:String(i.harga)
          }))
        },
        selected: r, editMode: true, modal: 'form'
      })
    } else {
      set({ form: emptyForm, selected: null, editMode: false, modal: 'form' })
    }
  }

  const openDetail = async id => {
    try {
      const { data } = await api.get(`/purchase-requests/${id}`)
      set({ selected: data, modal: 'detail', keputusanForm: { keputusan:'disetujui', catatan_direksi:'' } })
    } catch { toast.error('Gagal memuat detail') }
  }

  const setFormItem = (idx, k, v) => set({
    form: { ...state.form, items: state.form.items.map((it,i) => i===idx ? {...it,[k]:v} : it) }
  })

  const setItemMode = (idx, mode) => set({
    form: { ...state.form, items: state.form.items.map((it,i) => i===idx ? { ...emptyItem, mode } : it) }
  })

  const pickIngredient = (idx, ingId) => {
    const ing = state.ingredients.find(x => String(x.id) === ingId)
    setState(s => ({
      ...s,
      form: { ...s.form, items: s.form.items.map((it,i) => i===idx ? {
        ...it, ingredient_id: ingId, nama_item: ing?.name||'', satuan: ing?.unit||'',
        harga: it.harga || String(ing?.buy_price||'')
      } : it) }
    }))
  }

  const addItem    = () => set({ form: { ...state.form, items: [...state.form.items, { ...emptyItem }] } })
  const removeItem = idx => set({ form: { ...state.form, items: state.form.items.filter((_,i)=>i!==idx) } })

  const saveRequest = async e => {
    e.preventDefault()
    const payload = {
      ...state.form,
      items: state.form.items.map(i => ({
        ingredient_id: i.mode === 'bahan' && i.ingredient_id ? parseInt(i.ingredient_id) : null,
        nama_item: i.nama_item, qty: parseFloat(i.qty)||1, satuan: i.satuan, harga: parseFloat(i.harga)||0
      }))
    }
    try {
      if (state.editMode && state.selected) {
        await api.put(`/purchase-requests/${state.selected.id}`, payload)
        toast.success('Pengajuan diperbarui & dikirim ulang')
      } else {
        await api.post('/purchase-requests', payload)
        toast.success('Pengajuan dikirim')
      }
      set({ modal: null })
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const saveKeputusan = async e => {
    e.preventDefault()
    try {
      const { data } = await api.post(`/purchase-requests/${state.selected.id}/keputusan`, state.keputusanForm)
      if (data.generated_purchase) {
        toast.success('Disetujui, transaksi Pembelian ' + data.generated_purchase.nomor + ' dibuat otomatis')
      } else {
        toast.success('Keputusan disimpan')
      }
      set({ modal: null })
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const hapus = async id => {
    if (!confirm('Hapus pengajuan ini?')) return
    try {
      await api.delete(`/purchase-requests/${id}`)
      toast.success('Pengajuan dihapus')
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const { requests, ingredients, filter, modal, selected, editMode, form, keputusanForm } = state
  const canEdit = r => r.diajukan_oleh === me.id && ['diajukan','revisi'].includes(r.status)
  const pendingCount = requests.filter(r=>r.status==='diajukan').length

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Pengajuan Pembelian</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            {isDireksi
              ? ('Menunggu persetujuan Anda: ' + pendingCount)
              : 'Ajukan pembelian aset atau persediaan untuk disetujui Direksi'}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/purchase-requests/export', 'pengajuan_pembelian.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => openForm(null)} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Buat Pengajuan
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['all','Semua'],['diajukan','Menunggu'],['disetujui','Disetujui'],['ditolak','Ditolak'],['revisi','Revisi']].map(([v,l]) => (
          <button key={v} onClick={() => set({ filter:v })} className={`btn ${filter===v?'btn-primary':'btn-secondary'}`}
            style={{ fontSize:12, padding:'6px 14px' }}>{l}</button>
        ))}
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>No. Pengajuan</th><th>Kategori</th><th>Diajukan Oleh</th><th>Tanggal</th>
            <th style={{ textAlign:'right' }}>Total</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {requests.length === 0
              ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada pengajuan</td></tr>
              : requests.map(r => (
                <tr key={r.id}>
                  <td><span className="mono" style={{ fontSize:12, fontWeight:600 }}>{r.nomor}</span></td>
                  <td><span className={`badge ${r.kategori==='aset'?'badge-blue':'badge-teal'}`}>{r.kategori==='aset'?'Aset':'Persediaan'}</span></td>
                  <td style={{ fontSize:13 }}>{r.diajukan_oleh_nama}</td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{r.tanggal}</td>
                  <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(r.total)}</td>
                  <td><span className={`badge ${STATUS[r.status]?.cls||'badge-blue'}`}>{STATUS[r.status]?.label||r.status}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      <button className="btn btn-secondary" title="Detail" onClick={() => openDetail(r.id)} style={{ padding:'6px 9px' }}><Eye size={13}/></button>
                      {canEdit(r) && (
                        <button className="btn btn-secondary" onClick={() => openForm(r)} style={{ padding:'6px 9px' }}><Pencil size={13}/></button>
                      )}
                      {(r.diajukan_oleh === me.id || isDireksi) && ['diajukan','revisi','ditolak'].includes(r.status) && (
                        <button className="btn btn-danger" onClick={() => hapus(r.id)} style={{ padding:'6px 9px' }}><Trash2 size={13}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal === 'form' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:720, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editMode?'Edit & Kirim Ulang Pengajuan':'Buat Pengajuan Baru'}</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <form onSubmit={saveRequest}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Kategori</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[['persediaan','Persediaan'],['aset','Aset']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set({ form:{...form, kategori:v} })}
                      className={`btn ${form.kategori===v?'btn-primary':'btn-secondary'}`} style={{ flex:1 }}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Pemasok (opsional)</label>
                  <input className="input" placeholder="Nama pemasok" value={form.supplier_name}
                    onChange={e => set({ form: { ...form, supplier_name:e.target.value } })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal</label>
                  <input className="input" type="date" required value={form.tanggal}
                    onChange={e => set({ form: { ...form, tanggal:e.target.value } })}/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Alasan Pengajuan</label>
                <input className="input" required placeholder="cth: Stok mangga menipis / Blender rusak" value={form.alasan}
                  onChange={e => set({ form: { ...form, alasan:e.target.value } })}/>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Item Pengajuan</div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ border:'1px solid var(--border)', borderRadius:8, padding:10, marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                      {[['bebas','Input Bebas'],['bahan','Dari Persediaan']].map(([v,l]) => (
                        <button key={v} type="button" onClick={() => setItemMode(idx, v)}
                          className={`btn ${item.mode===v?'btn-primary':'btn-secondary'}`} style={{ fontSize:11, padding:'4px 10px' }}>{l}</button>
                      ))}
                      <div style={{ flex:1 }}/>
                      <button type="button" onClick={() => removeItem(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)' }}><Trash2 size={14}/></button>
                    </div>

                    {item.mode === 'bahan' ? (
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1.4fr', gap:6 }}>
                        <select className="input" required value={item.ingredient_id} onChange={e => pickIngredient(idx, e.target.value)}>
                          <option value="">-- Pilih persediaan --</option>
                          {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                        </select>
                        <input className="input" type="number" required min="0.01" step="0.01" placeholder="Qty" value={item.qty} onChange={e => setFormItem(idx,'qty',e.target.value)}/>
                        <input className="input" placeholder="Satuan" value={item.satuan} onChange={e => setFormItem(idx,'satuan',e.target.value)}/>
                        <input className="input" type="number" required min="0" placeholder="Harga" value={item.harga} onChange={e => setFormItem(idx,'harga',e.target.value)}/>
                      </div>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1.4fr', gap:6 }}>
                        <input className="input" required placeholder="Nama item" value={item.nama_item} onChange={e => setFormItem(idx,'nama_item',e.target.value)}/>
                        <input className="input" type="number" required min="0.01" step="0.01" placeholder="Qty" value={item.qty} onChange={e => setFormItem(idx,'qty',e.target.value)}/>
                        <input className="input" placeholder="Satuan" value={item.satuan} onChange={e => setFormItem(idx,'satuan',e.target.value)}/>
                        <input className="input" type="number" required min="0" placeholder="Harga" value={item.harga} onChange={e => setFormItem(idx,'harga',e.target.value)}/>
                      </div>
                    )}
                    {item.qty && item.harga && (
                      <div style={{ textAlign:'right', fontSize:12, color:'var(--text2)', marginTop:6 }}>
                        Subtotal: <strong>{fmt((parseFloat(item.qty)||0)*(parseFloat(item.harga)||0))}</strong>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addItem} style={{ fontSize:12, padding:'6px 14px', marginTop:4 }}>+ Tambah Item</button>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                <div style={{ background:'var(--teal-light)', borderRadius:8, padding:'10px 14px', textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'var(--teal-dark)' }}>Total Estimasi</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--teal-dark)' }}>{fmt(total)}</div>
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => set({ modal:null })} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>{editMode?'Kirim Ulang':'Kirim Pengajuan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:560, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{selected.nomor}</div>
                <span className={`badge ${STATUS[selected.status]?.cls}`} style={{ marginTop:4, display:'inline-block' }}>{STATUS[selected.status]?.label}</span>
                <span className={`badge ${selected.kategori==='aset'?'badge-blue':'badge-teal'}`} style={{ marginTop:4, marginLeft:6, display:'inline-block' }}>{selected.kategori==='aset'?'Aset':'Persediaan'}</span>
              </div>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              <div><strong>Diajukan oleh:</strong> {selected.diajukan_oleh_nama}</div>
              <div><strong>Pemasok:</strong> {selected.supplier_name||'-'}</div>
              <div><strong>Tanggal:</strong> {selected.tanggal}</div>
              <div><strong>Alasan:</strong> {selected.alasan||'-'}</div>
              {selected.diputuskan_oleh_nama && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'var(--bg)', borderRadius:6 }}>
                  <strong>Keputusan oleh {selected.diputuskan_oleh_nama}:</strong> {STATUS[selected.status]?.label}
                  {selected.catatan_direksi && <div style={{ marginTop:4 }}>Catatan: "{selected.catatan_direksi}"</div>}
                </div>
              )}
              {selected.purchase_id && (
                <div style={{ marginTop:8, fontSize:12, color:'var(--teal)' }}>
                  Sudah dibuatkan transaksi Pembelian (lihat menu Pembelian)
                </div>
              )}
            </div>
            <table style={{ marginBottom:14 }}>
              <thead><tr><th>Item</th><th>Qty</th><th style={{ textAlign:'right' }}>Harga</th><th style={{ textAlign:'right' }}>Subtotal</th></tr></thead>
              <tbody>
                {(selected.items||[]).map((item,i) => (
                  <tr key={i}>
                    <td>{item.nama_item}</td>
                    <td>{item.qty} {item.satuan}</td>
                    <td style={{ textAlign:'right' }}>{fmt(item.harga)}</td>
                    <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign:'right', marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>Total: {fmt(selected.total)}</div>
            </div>

            {isDireksi && selected.status === 'diajukan' && (
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Keputusan Direksi</div>
                <form onSubmit={saveKeputusan}>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    {KEPUTUSAN_OPTIONS.map(opt => (
                      <button key={opt.v} type="button" onClick={() => set({ keputusanForm:{...keputusanForm, keputusan:opt.v} })}
                        className={`btn ${keputusanForm.keputusan===opt.v?'btn-primary':'btn-secondary'}`}
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:13 }}>
                        <KeputusanIcon v={opt.v}/>{opt.l}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Catatan (opsional)</label>
                    <input className="input" placeholder="cth: Disetujui, segera proses / Qty terlalu banyak"
                      value={keputusanForm.catatan_direksi} onChange={e => set({ keputusanForm:{...keputusanForm, catatan_direksi:e.target.value} })}/>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width:'100%' }}>Simpan Keputusan</button>
                </form>
              </div>
            )}

            {!isDireksi && selected.status === 'diajukan' && (
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, fontSize:13, color:'var(--text2)', textAlign:'center' }}>
                Menunggu keputusan Direksi
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
