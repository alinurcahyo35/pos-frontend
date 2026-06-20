import { useState, useEffect } from 'react'
import { Save, Building2 } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const empty = { nama:'', alamat:'', telp:'', email:'', website:'', npwp:'', rekening:'', bank:'', atas_nama:'' }

export default function ProfilUsaha() {
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await api.get('/profile')
    if (data) setForm({ ...empty, ...data })
  }

  const save = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/profile', form)
      toast.success('Profil usaha disimpan')
    } catch { toast.error('Gagal menyimpan') }
    finally { setLoading(false) }
  }

  const F = ({ label, k, placeholder, half }) => (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2', marginBottom: 14 }}>
      <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>{label}</label>
      <input className="input" placeholder={placeholder||label} value={form[k]||''}
        onChange={e => setForm(f=>({...f,[k]:e.target.value}))}/>
    </div>
  )

  return (
    <div style={{ padding:28, maxWidth:780 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'var(--purple-50)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Building2 size={20} color="var(--purple-600)"/>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Profil Usaha</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Data ini akan tampil di header invoice</p>
        </div>
      </div>

      <form onSubmit={save}>
        <div className="card" style={{ padding:24, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:16 }}>Identitas Usaha</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <F label="Nama Usaha" k="nama" half={false}/>
            <F label="Alamat" k="alamat" half={false}/>
            <F label="No. Telepon" k="telp" placeholder="08xx" half/>
            <F label="Email" k="email" placeholder="email@usaha.com" half/>
            <F label="Website" k="website" placeholder="www.usaha.com" half/>
            <F label="NPWP" k="npwp" placeholder="xx.xxx.xxx.x-xxx.xxx" half/>
          </div>
        </div>

        <div className="card" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:16 }}>Informasi Rekening</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <F label="Nama Bank" k="bank" placeholder="BCA / Mandiri / BRI..." half/>
            <F label="No. Rekening" k="rekening" placeholder="xxxx-xxxx-xxxx" half/>
            <F label="Atas Nama" k="atas_nama" half={false}/>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px' }}>
          <Save size={15}/> {loading ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </form>
    </div>
  )
}
