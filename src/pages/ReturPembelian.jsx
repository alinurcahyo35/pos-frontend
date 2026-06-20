import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, X, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt   = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

const AKUN_PENGEMBALIAN = [
  { kode:'111001', label:'Kas Kecil' },
  { kode:'112002', label:'Bank BCA' },
]

const emptyItem = { ingredient_id:'', nama_item:'', qty:'1', satuan:'pcs', harga:'' }

const emptyForm = {
  supplier_name:'', tanggal:today(), catatan:'',
  akun_pengembalian:'111001',
  items:[{ ...emptyItem }]
}

export default function ReturPembelian() {
  const [state, setState] = useState({
    returns: [], ingredients: [],
    modal: null, selected: null,
    form: emptyForm
  })

  const set = patch => setState(s => ({ ...s, ...patch }))

  const load = useCallback(async () => {
    try {
      const [retRes, ingRes] = await Promise.all([
        api.get('/purchase-returns'),
        api.get('/ingredients')
      ])
      set({ returns: retRes.data || [], ingredients: ingRes.data || [] })
    } catch(e) {
      console.error(e)
      toast.error('Gagal memuat data')
    }
  }, [])

  useEffect(() => { load() }, [])

  const total = state.form.items.reduce((s,i) => s+(parseFloat(i.harga)||0)*(parseFloat(i.qty)||0), 0)

  const openForm = () => set({ form: emptyForm, modal: 'form' })

  const openDetail = async id => {
    try {
      const { data } = await api.get(`/purchase-returns/${id}`)
      set({ selected: data, modal: 'detail' })
    } catch { toast.error('Gagal memuat detail') }
  }

  const setFormItem = (idx, k, v) => set({
    form: { ...state.form, items: state.form.items.map((it,i) => i===idx ? {...it,[k]:v} : it) }
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

  const saveReturn = async e => {
    e.preventDefault()
    const incomplete = state.form.items.some(i => !i.ingredient_id)
    if (incomplete) { toast.error('Setiap item harus dipilih dari Persediaan'); return }

    const payload = {
      ...state.form,
      items: state.form.items.map(i => ({
        ingredient_id: parseInt(i.ingredient_id),
        nama_item: i.nama_item, qty: parseFloat(i.qty)||1, satuan: i.satuan, harga: parseFloat(i.harga)||0
      }))
    }
    try {
      await api.post('/purchase-returns', payload)
      toast.success('Retur pembelian dicatat')
      set({ modal: null })
      load()
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const hapus = async id => {
    if (!confirm('Hapus retur ini? Stok persediaan akan dikembalikan seperti semula.')) return
    await api.delete(`/purchase-returns/${id}`)
    toast.success('Retur dihapus')
    load()
  }

  const { returns, ingredients, modal, selected, form } = state
  const totalRetur = returns.reduce((s,r)=>s+(r.total||0),0)

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Retur Pembelian</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            Total retur: <strong>{fmt(totalRetur)}</strong>
            {' \u00b7 '}{returns.length} transaksi
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/purchase-returns/export', 'retur_pembelian.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openForm} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Catat Retur
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>No. Retur</th><th>Pemasok</th><th>Tanggal</th>
            <th style={{ textAlign:'right' }}>Total</th><th></th>
          </tr></thead>
          <tbody>
            {returns.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada retur pembelian</td></tr>
              : returns.map(r => (
                <tr key={r.id}>
                  <td><span className="mono" style={{ fontSize:12, fontWeight:600 }}>{r.nomor}</span></td>
                  <td style={{ fontWeight:600 }}>{r.supplier_name||'-'}</td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{r.tanggal}</td>
                  <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(r.total)}</td>
                  <td>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      <button className="btn btn-secondary" title="Detail" onClick={() => openDetail(r.id)} style={{ padding:'6px 9px' }}><Eye size={13}/></button>
                      <button className="btn btn-danger" onClick={() => hapus(r.id)} style={{ padding:'6px 9px' }}><Trash2 size={13}/></button>
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
              <h2 style={{ fontSize:17, fontWeight:700 }}>Catat Retur Pembelian</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <form onSubmit={saveReturn}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Pemasok (opsional)</label>
                  <input className="input" placeholder="Nama pemasok" value={form.supplier_name}
                    onChange={e => set({ form: { ...form, supplier_name:e.target.value } })}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Retur</label>
                  <input className="input" type="date" required value={form.tanggal}
                    onChange={e => set({ form: { ...form, tanggal:e.target.value } })}/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Dana Dikembalikan ke Akun</label>
                <select className="input" required value={form.akun_pengembalian} onChange={e => set({ form:{...form, akun_pengembalian:e.target.value} })}>
                  {AKUN_PENGEMBALIAN.map(a => <option key={a.kode} value={a.kode}>{a.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Item yang Diretur (dari Persediaan)</div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ border:'1px solid var(--border)', borderRadius:8, padding:10, marginBottom:8 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1.4fr 20px', gap:6, alignItems:'center' }}>
                      <select className="input" required value={item.ingredient_id} onChange={e => pickIngredient(idx, e.target.value)}>
                        <option value="">-- Pilih persediaan --</option>
                        {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} (stok: {ing.stock} {ing.unit})</option>)}
                      </select>
                      <input className="input" type="number" required min="0.01" step="0.01" placeholder="Qty" value={item.qty} onChange={e => setFormItem(idx,'qty',e.target.value)}/>
                      <input className="input" placeholder="Satuan" value={item.satuan} onChange={e => setFormItem(idx,'satuan',e.target.value)}/>
                      <input className="input" type="number" required min="0" placeholder="Harga" value={item.harga} onChange={e => setFormItem(idx,'harga',e.target.value)}/>
                      <button type="button" onClick={() => removeItem(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)' }}><Trash2 size={14}/></button>
                    </div>
                    {item.qty && item.harga && (
                      <div style={{ textAlign:'right', fontSize:12, color:'var(--text2)', marginTop:6 }}>
                        Subtotal: <strong>{fmt((parseFloat(item.qty)||0)*(parseFloat(item.harga)||0))}</strong>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addItem} style={{ fontSize:12, padding:'6px 14px', marginTop:4 }}>+ Tambah Item</button>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
                <div style={{ background:'var(--teal-light)', borderRadius:8, padding:'10px 14px', textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'var(--teal-dark)' }}>Total Retur</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--teal-dark)' }}>{fmt(total)}</div>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Catatan</label>
                <input className="input" placeholder="Alasan retur (opsional)" value={form.catatan} onChange={e => set({ form:{...form,catatan:e.target.value} })}/>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => set({ modal:null })} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Catat Retur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Detail ── */}
      {modal === 'detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:520, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{selected.nomor}</div>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              <div><strong>Pemasok:</strong> {selected.supplier_name||'-'}</div>
              <div><strong>Tanggal:</strong> {selected.tanggal}</div>
              <div><strong>Dana dikembalikan ke:</strong> {AKUN_PENGEMBALIAN.find(a=>a.kode===selected.akun_pengembalian)?.label||selected.akun_pengembalian}</div>
              {selected.catatan && <div><strong>Catatan:</strong> {selected.catatan}</div>}
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
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:16, fontWeight:700 }}>Total: {fmt(selected.total)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
