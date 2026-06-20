import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import { Download } from 'lucide-react'
import ImportCsv from '../components/ImportCsv'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

const KATEGORI = ['Peralatan', 'Furnitur', 'Kendaraan', 'Elektronik', 'Bangunan', 'Lainnya']
const ACCOUNTS = [
  { kode:'116001', nama:'Perlengkapan Toko' },
  { kode:'115001', nama:'Sewa Bangunan' },
]

const empty = { nama:'', kategori:'Peralatan', tanggal_beli:today(), nilai_beli:'', nilai_residu:'0', masa_manfaat:'5', account_kode:'116001', keterangan:'' }

export default function AsetTetap() {
  const [assets, setAssets]   = useState([])
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(empty)
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [search])

  const load = async () => {
    const { data } = await api.get('/assets', { params: { q: search } })
    setAssets(data)
  }

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const openAdd  = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = a => { setForm({ ...a, nilai_beli:String(a.nilai_beli), nilai_residu:String(a.nilai_residu), masa_manfaat:String(a.masa_manfaat) }); setEditId(a.id); setModal(true) }

  const save = async () => {
    if (!form.nama || !form.nilai_beli || !form.tanggal_beli) return toast.error('Nama, nilai beli, dan tanggal beli wajib diisi')
    setLoading(true)
    try {
      const payload = { ...form, nilai_beli: parseFloat(form.nilai_beli)||0, nilai_residu: parseFloat(form.nilai_residu)||0, masa_manfaat: parseInt(form.masa_manfaat)||1 }
      if (editId) { await api.put(`/assets/${editId}`, payload); toast.success('Aset diperbarui') }
      else        { await api.post('/assets', payload); toast.success('Aset ditambahkan') }
      setModal(false); load()
    } catch(err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
    finally { setLoading(false) }
  }

  const del = async (id, nama) => {
    if (!confirm(`Hapus aset "${nama}"?`)) return
    await api.delete(`/assets/${id}`)
    toast.success('Aset dihapus'); load()
  }

  const totalNilaiBeli = assets.reduce((s,a) => s + a.nilai_beli, 0)
  const totalNilaiBuku = assets.reduce((s,a) => s + (a.nilai_buku||0), 0)
  const totalPenyusutan = assets.reduce((s,a) => s + (a.akumulasi_penyusutan||0), 0)

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--blue-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Package size={20} color="var(--blue)"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Aset Tetap</h1>
            <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{assets.length} aset terdaftar</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <ImportCsv templateEndpoint="/assets/import-template" importEndpoint="/assets/import"
            templateFilename="template_import_aset.csv" title="Aset Tetap" onSuccess={load} useRowsFormat={true}/>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/assets/export', 'aset_tetap.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Tambah Aset
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:12, color:'var(--text2)' }}>Total Nilai Beli</div>
          <div style={{ fontSize:18, fontWeight:700, marginTop:4 }}>{fmt(totalNilaiBeli)}</div>
        </div>
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:12, color:'var(--text2)' }}>Total Akumulasi Penyusutan</div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--danger)', marginTop:4 }}>{fmt(totalPenyusutan)}</div>
        </div>
        <div className="card" style={{ padding:16, background:'var(--teal-light)' }}>
          <div style={{ fontSize:12, color:'var(--teal-dark)' }}>Total Nilai Buku Sekarang</div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--teal-dark)', marginTop:4 }}>{fmt(totalNilaiBuku)}</div>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:16, maxWidth:380 }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}/>
        <input className="input" placeholder="Cari nama aset..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32 }}/>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>Kode</th><th>Nama Aset</th><th>Kategori</th><th>Tgl Beli</th>
            <th style={{ textAlign:'right' }}>Nilai Beli</th>
            <th style={{ textAlign:'right' }}>Penyusutan/Thn</th>
            <th style={{ textAlign:'right' }}>Nilai Buku</th>
            <th>Aksi</th>
          </tr></thead>
          <tbody>
            {assets.length === 0
              ? <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada aset terdaftar</td></tr>
              : assets.map(a => (
                <tr key={a.id}>
                  <td><span className="mono" style={{ fontSize:12 }}>{a.kode}</span></td>
                  <td style={{ fontWeight:600 }}>{a.nama}</td>
                  <td><span className="badge badge-blue">{a.kategori}</span></td>
                  <td style={{ fontSize:13 }}>{a.tanggal_beli}</td>
                  <td style={{ textAlign:'right', fontSize:13 }}>{fmt(a.nilai_beli)}</td>
                  <td style={{ textAlign:'right', fontSize:13, color:'var(--danger)' }}>{fmt(a.penyusutan_per_tahun)}</td>
                  <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(a.nilai_buku)}</td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-secondary" onClick={() => openEdit(a)} style={{ padding:'4px 8px' }}><Pencil size={13}/></button>
                      <button className="btn btn-danger" onClick={() => del(a.id, a.nama)} style={{ padding:'4px 8px' }}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:500, padding:24, maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:18 }}>{editId ? 'Edit Aset' : 'Tambah Aset Tetap'}</h2>

            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Aset</label>
                <input className="input" required placeholder="cth: Blender Commercial" value={form.nama} onChange={e=>set({nama:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Kategori</label>
                <select className="input" value={form.kategori} onChange={e=>set({kategori:e.target.value})}>
                  {KATEGORI.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal Beli</label>
                <input className="input" type="date" value={form.tanggal_beli} onChange={e=>set({tanggal_beli:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Akun Aktiva</label>
                <select className="input" value={form.account_kode} onChange={e=>set({account_kode:e.target.value})}>
                  {ACCOUNTS.map(a => <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nilai Beli (Rp)</label>
                <input className="input" type="number" placeholder="0" value={form.nilai_beli} onChange={e=>set({nilai_beli:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nilai Residu (Rp)</label>
                <input className="input" type="number" placeholder="0" value={form.nilai_residu} onChange={e=>set({nilai_residu:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Masa Manfaat (thn)</label>
                <input className="input" type="number" min="1" placeholder="5" value={form.masa_manfaat} onChange={e=>set({masa_manfaat:e.target.value})}/>
              </div>
            </div>

            {form.nilai_beli && form.masa_manfaat && (
              <div style={{ background:'var(--bg)', borderRadius:8, padding:12, marginBottom:14, fontSize:12, color:'var(--text2)' }}>
                Penyusutan/tahun: <strong>{fmt(((parseFloat(form.nilai_beli)||0) - (parseFloat(form.nilai_residu)||0)) / (parseInt(form.masa_manfaat)||1))}</strong>
                {' \u00b7 '}Metode: Garis Lurus
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Keterangan</label>
              <input className="input" placeholder="Opsional" value={form.keterangan} onChange={e=>set({keterangan:e.target.value})}/>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Menyimpan...':'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
