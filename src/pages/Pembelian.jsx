import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, Pencil, X, CheckCircle, Download } from 'lucide-react'
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

const AKUN_BAYAR = [
  { kode:'111001', label:'Kas Kecil' },
  { kode:'112002', label:'Bank BCA' },
]

const emptyItem = { mode:'bebas', ingredient_id:'', nama_item:'', qty:'1', satuan:'pcs', harga:'' }

const emptyForm = {
  supplier_id:'', supplier_name:'', tanggal:today(),
  jatuh_tempo:'', catatan:'', diskon:'0', pajak:'0',
  metode_bayar:'cash', akun_bayar:'111001',
  items:[{ ...emptyItem }]
}

export default function Pembelian() {
  const [state, setState] = useState({
    purchases: [], suppliers: [], ingredients: [], filter: 'all',
    modal: null, selected: null, editMode: false,
    form: emptyForm,
    bayarForm: { tanggal:today(), jumlah:'', metode:'transfer', catatan:'' }
  })

  const set = patch => setState(s => ({ ...s, ...patch }))

  const load = useCallback(async (filter) => {
    try {
      const [purRes, supRes, ingRes] = await Promise.all([
        api.get('/purchases', { params: { status: filter || state.filter } }),
        api.get('/suppliers'),
        api.get('/ingredients')
      ])
      set({ purchases: purRes.data || [], suppliers: supRes.data || [], ingredients: ingRes.data || [] })
    } catch(e) {
      console.error(e)
      toast.error('Gagal memuat data')
    }
  }, [])

  useEffect(() => { load(state.filter) }, [state.filter])

  const subtotal = state.form.items.reduce((s,i) => s+(parseFloat(i.harga)||0)*(parseFloat(i.qty)||0), 0)
  const total    = subtotal - (parseFloat(state.form.diskon)||0) + subtotal*(parseFloat(state.form.pajak)||0)/100

  const openForm = (p=null) => {
    if (p) {
      set({
        form: {
          supplier_id: String(p.supplier_id||''),
          supplier_name: p.supplier_name||'',
          tanggal: p.tanggal,
          jatuh_tempo: p.jatuh_tempo||'',
          catatan: p.catatan||'',
          diskon: String(p.diskon||0),
          pajak: String(p.pajak||0),
          metode_bayar: p.metode_bayar,
          akun_bayar: p.akun_bayar || '111001',
          items: (p.items||[]).map(i=>({
            mode: i.ingredient_id ? 'bahan' : 'bebas',
            ingredient_id: i.ingredient_id ? String(i.ingredient_id) : '',
            nama_item:i.nama_item, qty:String(i.qty), satuan:i.satuan||'', harga:String(i.harga)
          }))
        },
        selected: p, editMode: true, modal: 'form'
      })
    } else {
      set({ form: emptyForm, selected: null, editMode: false, modal: 'form' })
    }
  }

  const openDetail = async id => {
    try {
      const { data } = await api.get(`/purchases/${id}`)
      set({ selected: data, modal: 'detail' })
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

  const savePurchase = async e => {
    e.preventDefault()
    if (state.form.metode_bayar === 'cash' && !state.form.akun_bayar) {
      toast.error('Pilih akun pembayaran (Kas atau Bank)'); return
    }
    const payload = {
      ...state.form,
      diskon: parseFloat(state.form.diskon)||0,
      pajak:  parseFloat(state.form.pajak)||0,
      akun_bayar: state.form.metode_bayar === 'tempo' ? undefined : state.form.akun_bayar,
      items: state.form.items.map(i => ({
        ingredient_id: i.mode === 'bahan' && i.ingredient_id ? parseInt(i.ingredient_id) : null,
        nama_item: i.nama_item, qty: parseFloat(i.qty)||1, satuan: i.satuan, harga: parseFloat(i.harga)||0
      }))
    }
    try {
      if (state.editMode && state.selected) {
        await api.put(`/purchases/${state.selected.id}`, payload)
        toast.success('Pembelian diperbarui')
      } else {
        await api.post('/purchases', payload)
        toast.success('Pembelian dicatat')
      }
      set({ modal: null })
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const saveBayar = async e => {
    e.preventDefault()
    try {
      await api.post(`/purchases/${state.selected.id}/bayar`, {
        ...state.bayarForm, jumlah: parseFloat(state.bayarForm.jumlah)
      })
      toast.success('Pembayaran dicatat')
      set({ modal: null })
      load(state.filter)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const hapus = async id => {
    if (!confirm('Hapus transaksi pembelian ini? Stok persediaan terkait akan dikembalikan.')) return
    await api.delete(`/purchases/${id}`)
    toast.success('Pembelian dihapus')
    load(state.filter)
  }

  const { purchases, suppliers, ingredients, filter, modal, selected, editMode, form, bayarForm } = state
  const totalHutang = purchases.filter(p=>p.metode_bayar==='tempo' && p.status!=='paid').reduce((s,p)=>s+(p.sisa||0),0)

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Pembelian</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            Total hutang dagang aktif: <strong style={{ color:'var(--danger)' }}>{fmt(totalHutang)}</strong>
            {' \u00b7 '}{purchases.length} transaksi
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/purchases/export', 'pembelian.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => openForm()} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Catat Pembelian
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
            <th>No. Pembelian</th><th>Pemasok</th><th>Tanggal</th><th>Metode</th>
            <th style={{ textAlign:'right' }}>Total</th><th style={{ textAlign:'right' }}>Sisa</th>
            <th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {purchases.length === 0
              ? <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada transaksi pembelian</td></tr>
              : purchases.map(p => (
                <tr key={p.id}>
                  <td><span className="mono" style={{ fontSize:12, fontWeight:600 }}>{p.nomor}</span></td>
                  <td style={{ fontWeight:600 }}>{p.supplier_name||'-'}</td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{p.tanggal}</td>
                  <td><span className={`badge ${p.metode_bayar==='tempo'?'badge-blue':'badge-teal'}`}>{p.metode_bayar==='tempo'?'Tempo':'Cash'}</span></td>
                  <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(p.total)}</td>
                  <td style={{ textAlign:'right', fontWeight:600, color:(p.sisa||0)>0?'var(--danger)':'var(--teal)' }}>{p.metode_bayar==='tempo' ? fmt(p.sisa||0) : '-'}</td>
                  <td><span className={`badge ${STATUS[p.status]?.cls||'badge-blue'}`}>{STATUS[p.status]?.label||p.status}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      <button className="btn btn-secondary" title="Detail" onClick={() => openDetail(p.id)} style={{ padding:'6px 9px' }}><Eye size={13}/></button>
                      {p.metode_bayar==='tempo' && p.status!=='paid' && (
                        <button className="btn btn-primary" onClick={() => set({ selected:p, bayarForm:{tanggal:today(),jumlah:String(p.sisa||0),metode:'transfer',catatan:''}, modal:'bayar' })}
                          style={{ padding:'6px 9px', fontSize:11 }}>Bayar</button>
                      )}
                      <button className="btn btn-secondary" onClick={() => openForm(p)} style={{ padding:'6px 9px' }}><Pencil size={13}/></button>
                      <button className="btn btn-danger" onClick={() => hapus(p.id)} style={{ padding:'6px 9px' }}><Trash2 size={13}/></button>
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
          <div className="card" style={{ width:760, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editMode?'Edit Pembelian':'Catat Pembelian Baru'}</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <form onSubmit={savePurchase}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Pemasok</label>
                  <select className="input" value={form.supplier_id} onChange={e => {
                    const s = suppliers.find(s => String(s.id) === e.target.value)
                    set({ form: { ...form, supplier_id:e.target.value, supplier_name:s?.nama||form.supplier_name } })
                  }}>
                    <option value="">-- Pilih pemasok --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.kode} {s.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama (jika tidak ada)</label>
                  <input className="input" placeholder="Nama pemasok" value={form.supplier_name}
                    onChange={e => set({ form: { ...form, supplier_name:e.target.value } })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Pembelian</label>
                  <input className="input" type="date" required value={form.tanggal}
                    onChange={e => set({ form: { ...form, tanggal:e.target.value } })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jatuh Tempo (jika tempo)</label>
                  <input className="input" type="date" value={form.jatuh_tempo}
                    onChange={e => set({ form: { ...form, jatuh_tempo:e.target.value } })}/>
                </div>
              </div>

              <div style={{ background:'var(--bg)', borderRadius:8, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Metode Pembayaran</div>
                <div style={{ display:'flex', gap:10, marginBottom:form.metode_bayar==='cash'?12:0 }}>
                  {[['cash','Cash'],['tempo','Tempo']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set({ form:{...form, metode_bayar:v} })}
                      className={`btn ${form.metode_bayar===v?'btn-primary':'btn-secondary'}`} style={{ flex:1 }}>{l}</button>
                  ))}
                </div>
                {form.metode_bayar === 'cash' && (
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Bayar dari Akun</label>
                    <select className="input" required value={form.akun_bayar} onChange={e => set({ form:{...form, akun_bayar:e.target.value} })}>
                      {AKUN_BAYAR.map(a => <option key={a.kode} value={a.kode}>{a.label}</option>)}
                    </select>
                  </div>
                )}
                {form.metode_bayar === 'tempo' && (
                  <p style={{ fontSize:12, color:'var(--text2)', marginTop:6 }}>
                    Pembelian akan tercatat sebagai Hutang Usaha hingga dilunasi.
                  </p>
                )}
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Item Pembelian</div>
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
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>{editMode?'Simpan Perubahan':'Catat Pembelian'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'bayar' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:380, padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>Bayar Hutang Dagang</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={18}/></button>
            </div>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              {selected.nomor} {'\u00b7'} Sisa: <strong style={{ color:'var(--danger)' }}>{fmt(selected.sisa||0)}</strong>
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
                  {['tunai','transfer','cek','giro'].map(m => <option key={m}>{m}</option>)}
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

      {modal === 'detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:540, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{selected.nomor}</div>
                <span className={`badge ${STATUS[selected.status]?.cls}`} style={{ marginTop:4, display:'inline-block' }}>{STATUS[selected.status]?.label}</span>
                <span className={`badge ${selected.metode_bayar==='tempo'?'badge-blue':'badge-teal'}`} style={{ marginTop:4, marginLeft:6, display:'inline-block' }}>{selected.metode_bayar==='tempo'?'Tempo':'Cash'}</span>
              </div>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              <div><strong>Pemasok:</strong> {selected.supplier_name||'-'}</div>
              <div><strong>Tanggal:</strong> {selected.tanggal}{selected.jatuh_tempo?` \u00b7 Jatuh Tempo: ${selected.jatuh_tempo}`:''}</div>
              {selected.metode_bayar==='cash' && <div><strong>Dibayar dari:</strong> {AKUN_BAYAR.find(a=>a.kode===selected.akun_bayar)?.label||selected.akun_bayar}</div>}
            </div>
            <table style={{ marginBottom:14 }}>
              <thead><tr><th>Item</th><th>Qty</th><th style={{ textAlign:'right' }}>Harga</th><th style={{ textAlign:'right' }}>Subtotal</th></tr></thead>
              <tbody>
                {(selected.items||[]).map((item,i) => (
                  <tr key={i}>
                    <td>{item.nama_item}{item.ingredient_id ? <span className="badge badge-blue" style={{ marginLeft:6, fontSize:10 }}>Persediaan</span> : null}</td>
                    <td>{item.qty} {item.satuan}</td>
                    <td style={{ textAlign:'right' }}>{fmt(item.harga)}</td>
                    <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign:'right', marginBottom:14 }}>
              <div style={{ fontSize:13, color:'var(--text2)' }}>Subtotal: {fmt(selected.subtotal)}</div>
              <div style={{ fontSize:16, fontWeight:700 }}>Total: {fmt(selected.total)}</div>
              {selected.metode_bayar==='tempo' && (
                <>
                  <div style={{ fontSize:13, color:'var(--teal)', fontWeight:600 }}>Terbayar: {fmt(selected.paid||0)}</div>
                  {(selected.sisa||0)>0 && <div style={{ fontSize:13, color:'var(--danger)', fontWeight:600 }}>Sisa: {fmt(selected.sisa)}</div>}
                </>
              )}
            </div>
            {(selected.payments||[]).length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Riwayat Pembayaran</div>
                {selected.payments.map((pay,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                    <span>{pay.tanggal} {'\u00b7'} {pay.metode}</span>
                    <span style={{ fontWeight:600, color:'var(--teal)' }}>{fmt(pay.jumlah)}</span>
                  </div>
                ))}
              </div>
            )}
            {selected.metode_bayar==='tempo' && selected.status !== 'paid' && (
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
