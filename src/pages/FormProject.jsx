import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, X, DollarSign, Download, Search, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

const STATUS_BADGE = {
  draft:       { cls:'badge-blue',   label:'Draft' },
  konfirmasi:  { cls:'badge-purple', label:'Dikonfirmasi' },
  dp_masuk:    { cls:'badge-teal',   label:'DP Masuk' },
  lunas:       { cls:'badge-teal',   label:'Lunas' },
  batal:       { cls:'badge-danger', label:'Dibatalkan' },
}

const STATUS_FLOW = ['draft','konfirmasi','dp_masuk','lunas','batal']

const emptyItem = { nama_item:'', product_id:null, qty:1, harga:0, diskon_item:0, diskon_item_persen:0 }
const emptyCost = { nama_biaya:'', jumlah:0, keterangan:'' }

const emptyForm = {
  nama_event:'', tanggal_event:'', tanggal_order:today(), lokasi:'', pic_kontak:'',
  estimasi_porsi:'', customer_name:'', customer_telp:'',
  diskon_total:0, diskon_total_persen:0, dp:0, catatan:'',
  items:[{...emptyItem}], costs:[]
}

function calcItem(i) {
  const hargaNet = i.diskon_item_persen > 0
    ? i.harga * (1 - i.diskon_item_persen/100)
    : Math.max(i.harga - (i.diskon_item||0), 0)
  return hargaNet * (i.qty||1)
}

export default function FormProject() {
  const [projects, setProjects] = useState([])
  const [products, setProducts] = useState([])
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal]       = useState(null) // 'form'|'detail'|'payment'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [editId, setEditId]     = useState(null)
  const [payForm, setPayForm]   = useState({ tanggal:today(), jumlah:'', jenis:'pelunasan', metode:'transfer', catatan:'' })
  const [loading, setLoading]   = useState(false)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => { load(); loadProducts() }, [search, filterStatus])

  const load = async () => {
    const { data } = await api.get('/projects', { params: { q:search, status:filterStatus } })
    setProjects(data)
  }

  const loadProducts = async () => {
    const { data } = await api.get('/products', { params: { q:productSearch } })
    setProducts(data)
  }

  useEffect(() => { loadProducts() }, [productSearch])

  const set = patch => setForm(f => ({ ...f, ...patch }))

  const openForm = (p=null) => {
    if (p) {
      setForm({ ...p, items: p.items.map(i=>({...i})), costs: (p.costs||[]).map(c=>({...c})), diskon_total: p.diskon_total||0, diskon_total_persen: p.diskon_total_persen||0, dp: p.dp||0 })
      setEditId(p.id)
    } else {
      setForm(emptyForm); setEditId(null)
    }
    setModal('form')
  }

  const openDetail = async (id) => {
    const { data } = await api.get(`/projects/${id}`)
    setSelected(data); setModal('detail')
  }

  const addItem = () => set({ items:[...form.items, {...emptyItem}] })
  const removeItem = i => set({ items: form.items.filter((_,idx)=>idx!==i) })
  const setItem = (i, patch) => set({ items: form.items.map((it,idx) => idx===i?{...it,...patch}:it) })

  const addCost = () => set({ costs:[...(form.costs||[]), {...emptyCost}] })
  const removeCost = i => set({ costs: (form.costs||[]).filter((_,idx)=>idx!==i) })
  const setCost = (i, patch) => set({ costs: (form.costs||[]).map((c,idx) => idx===i?{...c,...patch}:c) })

  const pickProduct = (itemIdx, prod) => {
    setItem(itemIdx, { nama_item:prod.name, product_id:prod.id, harga:prod.price })
    setProductSearch('')
  }

  // Kalkulasi live
  const itemsCalc = form.items.map(i => ({ ...i, subtotal:calcItem(i) }))
  const subtotalItems = itemsCalc.reduce((s,i)=>s+i.subtotal,0)
  const subtotalCosts = (form.costs||[]).reduce((s,c)=>s+(parseFloat(c.jumlah)||0),0)
  const subtotal = subtotalItems + subtotalCosts
  const disc = form.diskon_total_persen > 0
    ? subtotal * form.diskon_total_persen / 100
    : (parseFloat(form.diskon_total)||0)
  const total = Math.max(subtotal - disc, 0)
  const sisa = Math.max(total - (parseFloat(form.dp)||0), 0)

  const save = async () => {
    if (!form.nama_event || !form.tanggal_event) return toast.error('Nama event dan tanggal wajib diisi')
    if (!form.items.some(i=>i.nama_item)) return toast.error('Minimal satu item harus diisi')
    setLoading(true)
    try {
      const payload = { ...form, items: form.items.filter(i=>i.nama_item) }
      if (editId) { await api.put(`/projects/${editId}`, payload); toast.success('Project diperbarui') }
      else        { await api.post('/projects', payload); toast.success('Project dibuat') }
      setModal(null); load()
    } catch(err) { toast.error(err.response?.data?.error||'Gagal menyimpan') }
    finally { setLoading(false) }
  }

  const updateStatus = async (id, status) => {
    await api.put(`/projects/${id}`, { status })
    toast.success('Status diperbarui'); load()
    if (selected?.id===id) openDetail(id)
  }

  const addPayment = async () => {
    if (!payForm.jumlah || parseFloat(payForm.jumlah)<=0) return toast.error('Jumlah pembayaran harus diisi')
    setLoading(true)
    try {
      await api.post(`/projects/${selected.id}/payments`, { ...payForm, jumlah:parseFloat(payForm.jumlah) })
      toast.success('Pembayaran dicatat'); setModal('detail'); openDetail(selected.id)
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
    finally { setLoading(false) }
  }

  const del = async (id, nama) => {
    if (!confirm(`Hapus project "${nama}"?`)) return
    await api.delete(`/projects/${id}`)
    toast.success('Project dihapus'); load()
  }

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Form Project</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Orderan besar untuk event, arisan, katering, dan pesanan khusus</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/projects/export', 'form_project.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => openForm()} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Buat Project
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <div style={{ position:'relative', flex:1, maxWidth:360 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}/>
          <input className="input" placeholder="Cari nama event, nomor, konsumen..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32 }}/>
        </div>
        <select className="input" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ width:'auto' }}>
          <option value="">Semua Status</option>
          {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_BADGE[s]?.label}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>Nomor</th><th>Nama Event</th><th>Tgl Event</th><th>Konsumen</th><th>Est. Porsi</th>
            <th style={{ textAlign:'right' }}>Total</th><th style={{ textAlign:'right' }}>Sisa</th>
            <th>Status</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {projects.length === 0
              ? <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada project</td></tr>
              : projects.map(p => (
                <tr key={p.id}>
                  <td><span className="mono" style={{ fontSize:12 }}>{p.nomor}</span></td>
                  <td style={{ fontWeight:600 }}>{p.nama_event}</td>
                  <td style={{ fontSize:13 }}>{p.tanggal_event}</td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{p.customer_name||'-'}</td>
                  <td style={{ textAlign:'center', fontSize:13 }}>{p.estimasi_porsi||'-'}</td>
                  <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(p.total)}</td>
                  <td style={{ textAlign:'right', color: p.sisa>0?'var(--danger)':'var(--teal)', fontWeight:600 }}>{fmt(p.sisa)}</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status]?.cls||'badge-blue'}`}>{STATUS_BADGE[p.status]?.label||p.status}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-secondary" onClick={() => openDetail(p.id)} style={{ padding:'4px 8px' }} title="Detail"><Eye size={13}/></button>
                      <button className="btn btn-secondary" onClick={() => openForm(p)} style={{ padding:'4px 8px' }} title="Edit">✏️</button>
                      <button className="btn btn-danger" onClick={() => del(p.id, p.nama_event)} style={{ padding:'4px 8px' }}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* FORM MODAL */}
      {modal === 'form' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:200, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:680, padding:24, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editId ? 'Edit Project' : 'Buat Form Project'}</h2>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Event / Acara</label>
                <input className="input" required placeholder="cth: Arisan RT Bulan Juni" value={form.nama_event} onChange={e=>set({nama_event:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Event</label>
                <input className="input" type="date" value={form.tanggal_event} onChange={e=>set({tanggal_event:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Estimasi Porsi</label>
                <input className="input" type="number" min="1" placeholder="0" value={form.estimasi_porsi} onChange={e=>set({estimasi_porsi:e.target.value})}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Lokasi Pengiriman</label>
                <input className="input" placeholder="Alamat lengkap lokasi event" value={form.lokasi} onChange={e=>set({lokasi:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Konsumen</label>
                <input className="input" placeholder="Nama pemesan / organisasi" value={form.customer_name} onChange={e=>set({customer_name:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>PIC & Kontak</label>
                <input className="input" placeholder="cth: Bu Siti - 08122345678" value={form.pic_kontak} onChange={e=>set({pic_kontak:e.target.value})}/>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{ fontSize:13, fontWeight:600 }}>Item Pesanan</label>
                <button className="btn btn-secondary" onClick={addItem} style={{ padding:'4px 10px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                  <Plus size={13}/> Tambah Item
                </button>
              </div>
              <div style={{ position:'relative', marginBottom:8 }}>
                <Search size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}/>
                <input className="input" placeholder="Cari produk untuk dipilih..." value={productSearch} onChange={e=>setProductSearch(e.target.value)} style={{ paddingLeft:26, fontSize:12 }}/>
              </div>
              {productSearch && products.length > 0 && (
                <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, marginBottom:8, maxHeight:140, overflowY:'auto' }}>
                  {products.slice(0,8).map(p => (
                    <div key={p.id} style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, display:'flex', justifyContent:'space-between' }}
                      onMouseDown={() => {
                        const emptyIdx = form.items.findIndex(i => !i.nama_item)
                        const idx = emptyIdx >= 0 ? emptyIdx : form.items.length - 1
                        if (emptyIdx < 0) addItem()
                        setTimeout(() => pickProduct(emptyIdx >= 0 ? emptyIdx : form.items.length, p), 0)
                      }}>
                      <span>{p.name}</span><span style={{ color:'var(--text2)' }}>{fmt(p.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {form.items.map((item, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 60px 100px 100px 90px 30px', gap:6, marginBottom:6, alignItems:'start' }}>
                  <input className="input" placeholder="Nama item" style={{ fontSize:12 }} value={item.nama_item} onChange={e=>setItem(i,{nama_item:e.target.value})}/>
                  <input className="input" type="number" min="1" placeholder="Qty" style={{ fontSize:12, textAlign:'center' }} value={item.qty} onChange={e=>setItem(i,{qty:parseInt(e.target.value)||1})}/>
                  <input className="input" type="number" placeholder="Harga" style={{ fontSize:12 }} value={item.harga} onChange={e=>setItem(i,{harga:parseFloat(e.target.value)||0})}/>
                  <input className="input" type="number" placeholder="Diskon (Rp)" style={{ fontSize:12 }} value={item.diskon_item} onChange={e=>setItem(i,{diskon_item:parseFloat(e.target.value)||0,diskon_item_persen:0})}/>
                  <input className="input" type="number" min="0" max="100" placeholder="Diskon %" style={{ fontSize:12 }} value={item.diskon_item_persen} onChange={e=>setItem(i,{diskon_item_persen:parseInt(e.target.value)||0,diskon_item:0})}/>
                  <button onClick={()=>removeItem(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:4 }}><Trash2 size={14}/></button>
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 60px 100px 100px 90px 30px', gap:6, fontSize:11, color:'var(--text3)', paddingLeft:2, marginTop:2 }}>
                <span>Nama item (atau pilih produk di atas)</span><span style={{ textAlign:'center' }}>Qty</span><span>Harga Satuan</span><span>Diskon (Rp)</span><span>Diskon (%)</span><span/>
              </div>
            </div>

            {/* SECTION: BIAYA TAMBAHAN */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{ fontSize:13, fontWeight:600 }}>Biaya Tambahan</label>
                <button className="btn btn-secondary" onClick={addCost} style={{ padding:'4px 10px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                  <Plus size={13}/> Tambah Biaya
                </button>
              </div>
              {(form.costs||[]).length === 0 && (
                <p style={{ fontSize:12, color:'var(--text3)', padding:'8px 0' }}>Belum ada biaya tambahan. Contoh: biaya transportasi, sewa peralatan, dekorasi, dll.</p>
              )}
              {(form.costs||[]).map((cost, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 120px 2fr 30px', gap:6, marginBottom:6, alignItems:'center' }}>
                  <input className="input" placeholder="Nama biaya (cth: Transportasi)" style={{ fontSize:12 }}
                    value={cost.nama_biaya} onChange={e=>setCost(i,{nama_biaya:e.target.value})}/>
                  <input className="input" type="number" placeholder="Jumlah (Rp)" style={{ fontSize:12 }}
                    value={cost.jumlah} onChange={e=>setCost(i,{jumlah:parseFloat(e.target.value)||0})}/>
                  <input className="input" placeholder="Keterangan (opsional)" style={{ fontSize:12 }}
                    value={cost.keterangan} onChange={e=>setCost(i,{keterangan:e.target.value})}/>
                  <button onClick={()=>removeCost(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:4 }}><Trash2 size={14}/></button>
                </div>
              ))}
              {(form.costs||[]).length > 0 && (
                <div style={{ fontSize:11, color:'var(--text3)', paddingLeft:2, marginTop:2 }}>
                  Nama biaya · Jumlah (Rp) · Keterangan
                </div>
              )}
            </div>

            <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Diskon Total (Rp)</label>
                  <input className="input" type="number" value={form.diskon_total} onChange={e=>set({diskon_total:parseFloat(e.target.value)||0,diskon_total_persen:0})}/>
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Diskon Total (%)</label>
                  <input className="input" type="number" min="0" max="100" value={form.diskon_total_persen} onChange={e=>set({diskon_total_persen:parseInt(e.target.value)||0,diskon_total:0})}/>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}><span style={{ color:'var(--text2)' }}>Subtotal produk</span><span>{fmt(subtotalItems)}</span></div>
              {subtotalCosts > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}><span style={{ color:'var(--text2)' }}>Biaya tambahan</span><span>{fmt(subtotalCosts)}</span></div>}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4, fontWeight:600 }}><span style={{ color:'var(--text2)' }}>Subtotal</span><strong>{fmt(subtotal)}</strong></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:'var(--danger)' }}>Diskon</span><span style={{ color:'var(--danger)' }}>- {fmt(disc)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:700, borderTop:'1px solid var(--border)', paddingTop:8 }}><span>Total</span><span>{fmt(total)}</span></div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>DP (Uang Muka)</label>
                <input className="input" type="number" placeholder="0" value={form.dp} onChange={e=>set({dp:parseFloat(e.target.value)||0})}/>
                {parseFloat(form.dp)>0 && <div style={{ fontSize:12, color:'var(--teal)', marginTop:3 }}>Sisa tagihan: {fmt(sisa)}</div>}
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Catatan</label>
                <input className="input" placeholder="Instruksi khusus, dll" value={form.catatan} onChange={e=>set({catatan:e.target.value})}/>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Menyimpan...':'Simpan Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {modal === 'detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:200, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:620, padding:24, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <span className="mono" style={{ fontSize:12, color:'var(--text2)' }}>{selected.nomor}</span>
                <h2 style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{selected.nama_event}</h2>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span className={`badge ${STATUS_BADGE[selected.status]?.cls}`}>{STATUS_BADGE[selected.status]?.label}</span>
                <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16, fontSize:13 }}>
              <div style={{ color:'var(--text2)' }}>Tanggal Event: <strong style={{ color:'var(--text)' }}>{selected.tanggal_event}</strong></div>
              <div style={{ color:'var(--text2)' }}>Estimasi Porsi: <strong style={{ color:'var(--text)' }}>{selected.estimasi_porsi||'-'}</strong></div>
              <div style={{ color:'var(--text2)' }}>Lokasi: <strong style={{ color:'var(--text)' }}>{selected.lokasi||'-'}</strong></div>
              <div style={{ color:'var(--text2)' }}>PIC: <strong style={{ color:'var(--text)' }}>{selected.pic_kontak||'-'}</strong></div>
              <div style={{ color:'var(--text2)' }}>Konsumen: <strong style={{ color:'var(--text)' }}>{selected.customer_name||'-'}</strong></div>
              {selected.catatan && <div style={{ gridColumn:'1/-1', color:'var(--text2)' }}>Catatan: <strong style={{ color:'var(--text)' }}>{selected.catatan}</strong></div>}
            </div>

            <table style={{ width:'100%', marginBottom:14 }}>
              <thead><tr>
                <th>Item</th><th style={{ textAlign:'center' }}>Qty</th><th style={{ textAlign:'right' }}>Harga</th>
                <th style={{ textAlign:'right' }}>Diskon</th><th style={{ textAlign:'right' }}>Subtotal</th>
              </tr></thead>
              <tbody>
                {selected.items.map((item,i) => (
                  <tr key={i}>
                    <td style={{ fontSize:13 }}>{item.nama_item}</td>
                    <td style={{ textAlign:'center', fontSize:13 }}>{item.qty}</td>
                    <td style={{ textAlign:'right', fontSize:13 }}>{fmt(item.harga)}</td>
                    <td style={{ textAlign:'right', fontSize:12, color:'var(--danger)' }}>
                      {item.diskon_item_persen > 0 ? `${item.diskon_item_persen}%` : item.diskon_item > 0 ? fmt(item.diskon_item) : '-'}
                    </td>
                    <td style={{ textAlign:'right', fontWeight:600, fontSize:13 }}>{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selected.costs?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Biaya Tambahan</div>
                {selected.costs.map((c,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, padding:'5px 0', borderBottom:'0.5px solid var(--border)' }}>
                    <span>
                      <span style={{ color:'var(--text)' }}>{c.nama_biaya}</span>
                      {c.keterangan && <span style={{ fontSize:12, color:'var(--text3)', marginLeft:8 }}>{c.keterangan}</span>}
                    </span>
                    <span style={{ fontWeight:600 }}>{fmt(c.jumlah)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:'var(--bg)', borderRadius:8, padding:12, marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}><span style={{ color:'var(--text2)' }}>Subtotal produk</span><span>{fmt(selected.items.reduce((s,i)=>s+i.subtotal,0))}</span></div>
              {selected.costs?.length > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}><span style={{ color:'var(--text2)' }}>Biaya tambahan</span><span>{fmt(selected.costs.reduce((s,c)=>s+c.jumlah,0))}</span></div>}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4, fontWeight:600 }}><span style={{ color:'var(--text2)' }}>Subtotal</span><span>{fmt(selected.subtotal)}</span></div>
              {selected.diskon_total>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:'var(--danger)' }}>Diskon {selected.diskon_total_persen>0?`(${selected.diskon_total_persen}%)`:''}</span><span style={{ color:'var(--danger)' }}>- {fmt(selected.diskon_total)}</span></div>}
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:15, borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4 }}><span>Total</span><span>{fmt(selected.total)}</span></div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Riwayat Pembayaran</div>
              {selected.payments?.length === 0
                ? <p style={{ fontSize:13, color:'var(--text3)' }}>Belum ada pembayaran</p>
                : selected.payments.map((pay,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'0.5px solid var(--border)' }}>
                    <span style={{ color:'var(--text2)' }}>{pay.tanggal} · {pay.jenis==='dp'?'Uang Muka':'Pelunasan'} via {pay.metode}</span>
                    <span style={{ fontWeight:600, color:'var(--teal)' }}>{fmt(pay.jumlah)}</span>
                  </div>
                ))
              }
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, marginTop:8 }}>
                <span>Sisa Tagihan</span>
                <span style={{ color: selected.sisa>0?'var(--danger)':'var(--teal)' }}>{fmt(selected.sisa)}</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {selected.status !== 'lunas' && selected.status !== 'batal' && selected.sisa > 0 && (
                <button className="btn btn-primary" onClick={() => { setPayForm({tanggal:today(),jumlah:String(selected.sisa),jenis:'pelunasan',metode:'transfer',catatan:''}); setModal('payment') }} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <DollarSign size={14}/> Catat Pembayaran
                </button>
              )}
              {selected.status === 'draft' && <button className="btn btn-secondary" onClick={() => updateStatus(selected.id,'konfirmasi')}>Konfirmasi</button>}
              {selected.status !== 'batal' && selected.status !== 'lunas' && <button className="btn btn-danger" onClick={() => updateStatus(selected.id,'batal')}>Batalkan</button>}
              <button className="btn btn-secondary" onClick={() => { openForm(selected); }} style={{ marginLeft:'auto' }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {modal === 'payment' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:380, padding:24 }}>
            <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Catat Pembayaran</h2>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Bayar</label>
            <input className="input" type="date" value={payForm.tanggal} onChange={e=>setPayForm(f=>({...f,tanggal:e.target.value}))} style={{ marginBottom:12 }}/>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jumlah (Rp)</label>
            <input className="input" type="number" value={payForm.jumlah} onChange={e=>setPayForm(f=>({...f,jumlah:e.target.value}))} style={{ fontSize:18, fontWeight:700, marginBottom:12 }}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Jenis</label>
                <select className="input" value={payForm.jenis} onChange={e=>setPayForm(f=>({...f,jenis:e.target.value}))}>
                  <option value="dp">Uang Muka (DP)</option>
                  <option value="pelunasan">Pelunasan</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Metode</label>
                <select className="input" value={payForm.metode} onChange={e=>setPayForm(f=>({...f,metode:e.target.value}))}>
                  <option value="transfer">Transfer</option>
                  <option value="tunai">Tunai</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
            </div>
            <input className="input" placeholder="Catatan (opsional)" value={payForm.catatan} onChange={e=>setPayForm(f=>({...f,catatan:e.target.value}))} style={{ marginBottom:16 }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary" onClick={() => setModal('detail')} style={{ flex:1 }}>Batal</button>
              <button className="btn btn-primary" onClick={addPayment} disabled={loading} style={{ flex:1 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
