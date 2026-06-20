import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, User, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

export default function Pengguna() {
  const [users, setUsers]   = useState([])
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({ name: '', username: '', password: '', role: 'kasir' })

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await api.get('/auth/users')
    setUsers(data)
  }

  const save = async e => {
    e.preventDefault()
    try {
      await api.post('/auth/register', form)
      toast.success('Pengguna ditambahkan')
      setModal(false)
      setForm({ name: '', username: '', password: '', role: 'kasir' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  const remove = async id => {
    const me = JSON.parse(localStorage.getItem('pos_user') || '{}')
    if (id === me.id) { toast.error('Tidak bisa hapus akun sendiri'); return }
    if (!confirm('Hapus pengguna ini?')) return
    await api.delete(`/auth/users/${id}`)
    toast.success('Pengguna dihapus')
    load()
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Pengguna</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/auth/users/export', 'pengguna.csv')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Role</th>
              <th>Dibuat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'admin' ? 'var(--teal-light)' : u.role === 'direksi' ? '#f3e8ff' : 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {u.role === 'admin' ? <Shield size={14} color="#0f6e56" /> : u.role === 'direksi' ? <Shield size={14} color="#7c3aed" /> : <User size={14} color="#185fa5" />}
                  </div>
                  {u.name}
                </td>
                <td><span className="mono" style={{ fontSize: 13 }}>{u.username}</span></td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-teal' : u.role === 'direksi' ? 'badge-purple' : 'badge-blue'}`}>{u.role}</span></td>
                <td style={{ color: 'var(--text3)', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                <td>
                  {u.role !== 'admin' && (
                    <button className="btn btn-danger" onClick={() => remove(u.id)} style={{ padding: '6px 10px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ width: 380, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Tambah Pengguna</h2>
            <form onSubmit={save}>
              {[['Nama Lengkap', 'name'], ['Username', 'username']].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                  <input className="input" required placeholder={label}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Password</label>
                <input className="input" type="password" required placeholder="Min. 6 karakter"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="kasir">Kasir</option>
                  <option value="admin">Admin</option>
                  <option value="direksi">Direksi</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} style={{ flex: 1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
