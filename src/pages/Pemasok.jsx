import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const empty = { nama:'', telp:'', email:'', alamat:'', kota:'', pic:'' }

export default function Pemasok() {
  const [data,   setData]   = useState([])
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState(empty)
  const [editId, setEditId] = useState(null)

  useEffect(() => { load() }, [search])

  const load = async () => {
    const { data: d } = await api.get('/suppliers', { params: { q: search } })
    setData(d)
  }

  const openAdd  = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = s => { setForm({ nama:s.nama, telp:s.telp||'', email:s.email||'', alamat:s.alamat||'', kota:s.kota||'', pic:s.pic||'' }); setEditId(s.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    try {
      if (editId) { await api.put(`/suppliers/${editId}`, form); toast.success('Data diperbarui') }
      else        { await api.post('/suppliers', form);           toast.success('Pemasok ditambahkan') }
      setModal(false); load()
    } catch(err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  const remove = async id => {
    if (!confirm('Hapus pemasok ini?')) return
    await api.delete(`/suppliers/${id}`)
    toast.success('Dihapus'); load()
  }

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Data Pemasok</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Digunakan saat input transaksi Pembelian</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/suppliers/export', 'pemasok.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Tambah Pemasok
          </button>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:16, maxWidth:380 }}>
        <Search size={15} style={{ position:'absolute', left:12, top:11, color:'var(--text3)' }}/>
        <input className="input" style={{ paddingLeft:36 }} placeholder="Cari nama, kode, atau telepon..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>Kode</th><th>Nama</th><th>PIC</th><th>Telepon</th><th>Kota</th><th></th>
          </tr></thead>
          <tbody>
            {data.map(s => (
              <tr key={s.id}>
                <td><span className="mono badge badge-blue">{s.kode}</span></td>
                <td style={{ fontWeight:600 }}>{s.nama}</td>
                <td style={{ color:'var(--text2)', fontSize:13 }}>{s.pic||'-'}</td>
                <td style={{ fontSize:13 }}>{s.telp||'-'}</td>
                <td style={{ fontSize:13 }}>{s.kota||'-'}</td>
                <td>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary" onClick={()=>openEdit(s)} style={{ padding:'6px 10px' }}><Pencil size={13}/></button>
                    <button className="btn btn-danger" onClick={()=>remove(s.id)} style={{ padding:'6px 10px' }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length===0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada pemasok</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:460, padding:28 }}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:20 }}>{editId?'Edit':'Tambah'} Pemasok</h2>
            <form onSubmit={save}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
                {[['Nama Pemasok/Perusahaan','nama',true,false],['PIC (Contact Person)','pic',false,false],['No. Telepon','telp',false,true],['Email','email',false,true],['Kota','kota',false,true],['Alamat','alamat',false,false]].map(([label,k,req,half])=>(
                  <div key={k} style={{ gridColumn:half?'span 1':'span 2', marginBottom:14 }}>
                    <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>{label}</label>
                    <input className="input" required={req} placeholder={label} value={form[k]}
                      onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
