import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('pos_token', data.token)
      localStorage.setItem('pos_user', JSON.stringify(data.user))
      if (['admin','direksi'].includes(data.user.role)) navigate('/admin')
      else navigate('/kasir')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login gagal')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ background:'#0f6e56', borderRadius:14, width:52, height:52, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Store size={26} color="white"/>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>POS System</h1>
          <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>Masuk ke akun Anda</p>
        </div>
        <div className="card" style={{ padding:28 }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6 }}>Username</label>
              <input className="input" placeholder="username" value={form.username}
                onChange={e => setForm(f=>({...f,username:e.target.value}))} required/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6 }}>Password</label>
              <input className="input" type="password" placeholder="password" value={form.password}
                onChange={e => setForm(f=>({...f,password:e.target.value}))} required/>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width:'100%', padding:'11px', fontSize:14 }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
          <div style={{ marginTop:16, padding:'12px 14px', background:'var(--bg)', borderRadius:8, fontSize:12, color:'var(--text3)' }}>
            <div>Admin: <span className="mono">admin</span> / <span className="mono">admin123</span></div>
            <div style={{ marginTop:4 }}>Kasir: gunakan akun yang dibuat admin</div>
          </div>
        </div>
      </div>
    </div>
  )
}
