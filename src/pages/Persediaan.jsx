import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, PackagePlus, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import ImportCsv from '../components/ImportCsv'
import toast from 'react-hot-toast'

const UNITS    = ['gr','ml','klip','pcs','liter','kg','sachet','botol']
const BUY_UNITS = ['gr','ml','klip','pcs','liter','kg','sachet','botol']
const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtDec = n => Number(n).toFixed(4).replace(/\.?0+$/, '')
const empty = { name:'', unit:'gr', stock:'', min_stock:'', buy_price:'', buy_qty:'', buy_unit:'kg', is_packing:false }

// Mapping satuan beli → satuan pakai
const BUY_TO_USE = { kg:'gr', liter:'ml', gr:'gr', ml:'ml', pcs:'pcs', klip:'klip', sachet:'sachet', botol:'botol' }

export default function Persediaan() {
  const [items,       setItems]       = useState([])
  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState('bahan') // 'bahan' | 'packing'
  const [modal,       setModal]       = useState(false)
  const [restockMdl,  setRestockMdl]  = useState(null)
  const [form,        setForm]        = useState(empty)
  const [editId,      setEditId]      = useState(null)
  const [restockData, setRestockData] = useState({ amount:'', buy_price:'', buy_qty:'', buy_unit:'' })

  useEffect(() => { load() }, [search, filterType])

  const load = async () => {
    const { data } = await api.get('/ingredients', { params: { q: search, type: filterType } })
    setItems(data)
  }

  // Auto-set buy_unit saat unit berubah
  const handleUnitChange = (unit) => {
    const suggestedBuyUnit = Object.entries(BUY_TO_USE).find(([k,v]) => v===unit)?.[0] || unit
    setForm(f => ({ ...f, unit, buy_unit: suggestedBuyUnit }))
  }

  const openAdd  = () => { setForm({ ...empty, is_packing: filterType==='packing' }); setEditId(null); setModal(true) }
  const openEdit = p => {
    setForm({ ...p, stock:String(p.stock), min_stock:String(p.min_stock), buy_price:String(p.buy_price||''), buy_qty:String(p.buy_qty||''), buy_unit:p.buy_unit||p.unit, is_packing: !!p.is_packing })
    setEditId(p.id); setModal(true)
  }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, stock:parseFloat(form.stock)||0, min_stock:parseFloat(form.min_stock)||0, buy_price:parseFloat(form.buy_price)||0, buy_qty:parseFloat(form.buy_qty)||1, is_packing: form.is_packing?1:0 }
    try {
      if (editId) { await api.put(`/ingredients/${editId}`, payload); toast.success('Persediaan diperbarui') }
      else        { await api.post('/ingredients', payload);          toast.success('Persediaan ditambahkan') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  const remove = async id => {
    if (!confirm('Hapus persediaan ini?')) return
    await api.delete(`/ingredients/${id}`); toast.success('Dihapus'); load()
  }

  const openRestock = item => {
    setRestockMdl(item)
    setRestockData({ amount:'', buy_price:String(item.buy_price||''), buy_qty:String(item.buy_qty||''), buy_unit:item.buy_unit||item.unit })
  }

  const restock = async () => {
    if (!restockData.amount || parseFloat(restockData.amount)<=0) { toast.error('Isi jumlah'); return }
    await api.post(`/ingredients/${restockMdl.id}/restock`, {
      amount: parseFloat(restockData.amount),
      buy_price: parseFloat(restockData.buy_price)||0,
      buy_qty: parseFloat(restockData.buy_qty)||1,
      buy_unit: restockData.buy_unit
    })
    toast.success('Stok ditambahkan'); setRestockMdl(null); load()
  }

  // Preview harga satuan
  const previewUnitPrice = (buy_price, buy_qty, buy_unit, unit) => {
    if (!buy_price || !buy_qty) return null
    const conversions = { kg:{gr:1000,kg:1}, gr:{gr:1}, liter:{ml:1000,liter:1}, ml:{ml:1}, pcs:{pcs:1}, klip:{klip:1}, sachet:{sachet:1}, botol:{botol:1} }
    const conv = conversions[buy_unit]?.[unit]
    const price = conv ? buy_price/(buy_qty*conv) : buy_price/buy_qty
    return price
  }

  const statusBadge = i => i.stock<=0 ? 'badge-danger' : i.min_stock>0&&i.stock<=i.min_stock ? 'badge-blue' : 'badge-teal'
  const statusText  = i => i.stock<=0 ? 'Habis' : i.min_stock>0&&i.stock<=i.min_stock ? 'Hampir habis' : 'Aman'

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Persediaan</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Harga beli dicatat per batch, otomatis hitung harga per satuan untuk HPP</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <ImportCsv templateEndpoint="/ingredients/import-template" importEndpoint="/ingredients/import"
            templateFilename="template_import_persediaan.csv" title="Persediaan" onSuccess={load}/>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/ingredients/export', 'persediaan.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15} /> Tambah Persediaan
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <button className={`btn ${filterType==='bahan'?'btn-primary':'btn-secondary'}`} onClick={() => setFilterType('bahan')}>Bahan Baku</button>
        <button className={`btn ${filterType==='packing'?'btn-primary':'btn-secondary'}`} onClick={() => setFilterType('packing')}>Item Packing</button>
      </div>

      <div style={{ position:'relative', marginBottom:16, maxWidth:380 }}>
        <Search size={15} style={{ position:'absolute', left:12, top:11, color:'var(--text3)' }} />
        <input className="input" style={{ paddingLeft:36 }} placeholder="Cari persediaan..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Nama Item</th>
              <th>Satuan</th>
              <th style={{ textAlign:'right' }}>Stok</th>
              <th>Harga Beli</th>
              <th style={{ textAlign:'right' }}>Harga/Satuan</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight:600 }}>{i.name}</td>
                <td><span className="badge badge-blue">{i.unit}</span></td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontWeight:600 }}>{i.stock} {i.unit}</td>
                <td style={{ fontSize:12, color:'var(--text2)' }}>
                  {i.buy_price>0 ? `${fmt(i.buy_price)} / ${i.buy_qty}${i.buy_unit}` : '-'}
                </td>
                <td style={{ textAlign:'right', fontWeight:600, fontSize:13 }}>
                  {i.unit_price>0 ? <span style={{ color:'var(--teal)' }}>{fmt(i.unit_price)}/{i.unit}</span> : '-'}
                </td>
                <td><span className={`badge ${statusBadge(i)}`}>{statusText(i)}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary" title="Restock" onClick={() => openRestock(i)} style={{ padding:'6px 10px' }}><PackagePlus size={13} /></button>
                    <button className="btn btn-secondary" onClick={() => openEdit(i)} style={{ padding:'6px 10px' }}><Pencil size={13} /></button>
                    <button className="btn btn-danger" onClick={() => remove(i.id)} style={{ padding:'6px 10px' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada persediaan</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal tambah/edit */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:460, padding:28, maxHeight:'90vh', overflow:'auto' }}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:20 }}>{editId?'Edit':'Tambah'} Persediaan</h2>
            <form onSubmit={save}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Item</label>
                  <input className="input" required placeholder="cth: Mangga" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Satuan Pakai</label>
                  <select className="input" value={form.unit} onChange={e => handleUnitChange(e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_packing} onChange={e => setForm(f=>({...f,is_packing:e.target.checked}))} />
                Item ini untuk packing (cup/sedotan/plastik) - akan muncul sebagai opsi packing di Kasir
              </label>

              <div style={{ background:'var(--bg)', borderRadius:8, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Harga Beli (untuk hitung HPP)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Harga Beli (Rp)</label>
                    <input className="input" type="number" min="0" placeholder="15000" value={form.buy_price} onChange={e => setForm(f=>({...f,buy_price:e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Per Qty</label>
                    <input className="input" type="number" min="0.01" step="0.01" placeholder="1" value={form.buy_qty} onChange={e => setForm(f=>({...f,buy_qty:e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Satuan Beli</label>
                    <select className="input" value={form.buy_unit} onChange={e => setForm(f=>({...f,buy_unit:e.target.value}))}>
                      {BUY_UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                {form.buy_price && form.buy_qty && (
                  <div style={{ marginTop:10, padding:'8px 12px', background:'var(--teal-light)', borderRadius:6, fontSize:12 }}>
                    💡 Harga per <strong>{form.unit}</strong> = <strong style={{ color:'var(--teal-dark)' }}>{fmt(previewUnitPrice(parseFloat(form.buy_price),parseFloat(form.buy_qty),form.buy_unit,form.unit)||0)}</strong>
                    <span style={{ color:'var(--text3)', marginLeft:4 }}>({form.buy_price} ÷ {form.buy_qty}{form.buy_unit} → per {form.unit})</span>
                  </div>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Stok Awal ({form.unit})</label>
                  <input className="input" type="number" min="0" step="0.1" placeholder="0" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Min. Stok Alert</label>
                  <input className="input" type="number" min="0" step="0.1" placeholder="0" value={form.min_stock} onChange={e => setForm(f=>({...f,min_stock:e.target.value}))} />
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal restock */}
      {restockMdl && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:400, padding:28 }}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>Restock: {restockMdl.name}</h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Stok saat ini: <strong>{restockMdl.stock} {restockMdl.unit}</strong></p>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jumlah ditambah ({restockMdl.unit})</label>
              <input className="input" type="number" min="0.1" step="0.1" autoFocus placeholder="0"
                value={restockData.amount} onChange={e => setRestockData(d=>({...d,amount:e.target.value}))}
                style={{ fontSize:18, fontWeight:600 }} />
            </div>
            <div style={{ background:'var(--bg)', borderRadius:8, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', marginBottom:8 }}>Update Harga Beli (opsional)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:11, display:'block', marginBottom:3 }}>Harga (Rp)</label>
                  <input className="input" type="number" placeholder={restockMdl.buy_price}
                    value={restockData.buy_price} onChange={e => setRestockData(d=>({...d,buy_price:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:11, display:'block', marginBottom:3 }}>Per Qty</label>
                  <input className="input" type="number" placeholder={restockMdl.buy_qty}
                    value={restockData.buy_qty} onChange={e => setRestockData(d=>({...d,buy_qty:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:11, display:'block', marginBottom:3 }}>Satuan</label>
                  <select className="input" value={restockData.buy_unit} onChange={e => setRestockData(d=>({...d,buy_unit:e.target.value}))}>
                    {BUY_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" onClick={() => setRestockMdl(null)} style={{ flex:1 }}>Batal</button>
              <button className="btn btn-primary" onClick={restock} style={{ flex:1 }}>Tambah Stok</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
