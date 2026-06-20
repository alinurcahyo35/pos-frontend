import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, CheckCircle, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt   = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]
const KATEGORI = ['Supplier Bahan','Sewa Tempat','Listrik & Air','Gas','Peralatan','Pinjaman Bank','Lain-lain']
const STATUS_BADGE = { unpaid:'badge-danger', partial:'badge-blue', paid:'badge-teal' }
const STATUS_LABEL = { unpaid:'Belum Bayar', partial:'Sebagian', paid:'Lunas' }
const emptyForm = { nama_kreditur:'', kategori:'Supplier Bahan', jumlah:'', tanggal:today(), jatuh_tempo:'', keterangan:'' }

export default function Hutang() {
  const [data,       setData]       = useState([])
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(emptyForm)
  const [editId,     setEditId]     = useState(null)
  const [bayarModal, setBayarModal] = useState(null)
  const [bayarForm,  setBayarForm]  = useState({ tanggal:today(), jumlah:'', metode:'transfer', catatan:'' })
  const [filter,     setFilter]     = useState('all')

  useEffect(() => { load() }, [filter])

  const load = async () => {
    const { data: d } = await api.get('/hutang', { params: { status: filter } })
    setData(d)
  }

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setModal(true) }
  const openEdit = h => { setForm({ nama_kreditur:h.nama_kreditur, kategori:h.kategori, jumlah:String(h.jumlah), tanggal:h.tanggal, jatuh_tempo:h.jatuh_tempo||'', keterangan:h.keterangan||'' }); setEditId(h.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, jumlah: parseFloat(form.jumlah) }
    try {
      if (editId) { await api.put(`/hutang/${editId}`, payload); toast.success('Hutang diperbarui') }
      else        { await api.post('/hutang', payload);           toast.success('Hutang ditambahkan') }
      setModal(false); load()
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const hapus = async id => {
    if (!confirm('Hapus data hutang ini?')) return
    await api.delete(`/hutang/${id}`)
    toast.success('Dihapus'); load()
  }

  const openBayar = h => {
    setBayarModal(h)
    setBayarForm({ tanggal:today(), jumlah:String(h.sisa), metode:'transfer', catatan:'' })
  }

  const bayar = async e => {
    e.preventDefault()
    try {
      await api.post(`/hutang/${bayarModal.id}/bayar`, { ...bayarForm, jumlah: parseFloat(bayarForm.jumlah) })
      toast.success('Pembayaran dicatat'); setBayarModal(null); load()
    } catch(err) { toast.error(err.response?.data?.error||'Gagal') }
  }

  const totalHutang = data.filter(h=>h.status!=='paid').reduce((s,h)=>s+h.sisa,0)

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Hutang</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            Total hutang aktif: <strong style={{ color:'var(--danger)' }}>{fmt(totalHutang)}</strong>
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/hutang/export', 'hutang.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Tambah Hutang
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['all','Semua'],['unpaid','Belum Bayar'],['partial','Sebagian'],['paid','Lunas']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`btn ${filter===v?'btn-primary':'btn-secondary'}`}
            style={{ fontSize:12, padding:'6px 14px' }}>{l}</button>
        ))}
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>Kode</th><th>Kreditur</th><th>Kategori</th><th>Tanggal</th><th>Jatuh Tempo</th>
            <th style={{ textAlign:'right' }}>Total</th><th style={{ textAlign:'right' }}>Sisa</th>
            <th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {data.map(h=>(
              <tr key={h.id}>
                <td><span className="mono badge badge-blue">{h.kode}</span></td>
                <td style={{ fontWeight:600 }}>{h.nama_kreditur}</td>
                <td style={{ fontSize:13 }}>{h.kategori}</td>
                <td style={{ fontSize:13, color:'var(--text2)' }}>{h.tanggal}</td>
                <td style={{ fontSize:13, color: h.jatuh_tempo && h.jatuh_tempo < today() && h.status!=='paid' ? 'var(--danger)' : 'var(--text2)' }}>
                  {h.jatuh_tempo||'-'}
                </td>
                <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(h.jumlah)}</td>
                <td style={{ textAlign:'right', fontWeight:600, color:h.sisa>0?'var(--danger)':'var(--teal)' }}>{fmt(h.sisa)}</td>
                <td><span className={`badge ${STATUS_BADGE[h.status]}`}>{STATUS_LABEL[h.status]}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    {h.status!=='paid' && <button className="btn btn-primary" onClick={()=>openBayar(h)} style={{ padding:'6px 10px', fontSize:11 }}>Bayar</button>}
                    <button className="btn btn-secondary" onClick={()=>openEdit(h)} style={{ padding:'6px 10px' }}><Pencil size={13}/></button>
                    <button className="btn btn-danger" onClick={()=>hapus(h.id)} style={{ padding:'6px 10px' }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length===0 && <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada data hutang</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal tambah/edit */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:460, padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editId?'Edit':'Tambah'} Hutang</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={18}/></button>
            </div>
            <form onSubmit={save}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Kreditur / Supplier</label>
                <input className="input" required placeholder="Nama pihak yang memberi hutang" value={form.nama_kreditur} onChange={e=>setForm(f=>({...f,nama_kreditur:e.target.value}))}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Kategori</label>
                  <select className="input" value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                    {KATEGORI.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jumlah (Rp)</label>
                  <input className="input" type="number" required min="0" value={form.jumlah} onChange={e=>setForm(f=>({...f,jumlah:e.target.value}))} style={{ fontWeight:600 }}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal</label>
                  <input className="input" type="date" required value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jatuh Tempo</label>
                  <input className="input" type="date" value={form.jatuh_tempo} onChange={e=>setForm(f=>({...f,jatuh_tempo:e.target.value}))}/>
                </div>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Keterangan</label>
                <input className="input" placeholder="Opsional" value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))}/>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal bayar */}
      {bayarModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:380, padding:28 }}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>Catat Pembayaran Hutang</h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              {bayarModal.nama_kreditur} · Sisa: <strong style={{ color:'var(--danger)' }}>{fmt(bayarModal.sisa)}</strong>
            </p>
            <form onSubmit={bayar}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Bayar</label>
                <input className="input" type="date" required value={bayarForm.tanggal} onChange={e=>setBayarForm(f=>({...f,tanggal:e.target.value}))}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jumlah (Rp)</label>
                <input className="input" type="number" required min="1" value={bayarForm.jumlah}
                  onChange={e=>setBayarForm(f=>({...f,jumlah:e.target.value}))} style={{ fontSize:18, fontWeight:600 }}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Metode</label>
                <select className="input" value={bayarForm.metode} onChange={e=>setBayarForm(f=>({...f,metode:e.target.value}))}>
                  {['transfer','tunai','cek','giro'].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Catatan</label>
                <input className="input" placeholder="Opsional" value={bayarForm.catatan} onChange={e=>setBayarForm(f=>({...f,catatan:e.target.value}))}/>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={()=>setBayarModal(null)} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
