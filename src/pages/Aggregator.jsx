import { useState, useEffect } from 'react'
import { Percent, Save } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const PLATFORM_COLOR = {
  GoFood: '#00AA13',
  ShopeeFood: '#EE4D2D',
  GrabFood: '#00B14F',
}

export default function Aggregator() {
  const [settings, setSettings] = useState([])
  const [edited, setEdited] = useState({})

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const { data } = await api.get('/aggregator-settings')
      setSettings(data)
    } catch { toast.error('Gagal memuat pengaturan aggregator') }
  }

  const save = async (id) => {
    try {
      await api.put(`/aggregator-settings/${id}`, { default_fee_percent: parseFloat(edited[id]) })
      toast.success('Persentase potongan disimpan')
      setEdited(e => { const n = {...e}; delete n[id]; return n })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
  }

  return (
    <div style={{ padding:28, maxWidth:640 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'var(--blue-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Percent size={20} color="var(--blue)"/>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Aggregator</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Persentase potongan default per platform - akan otomatis terisi di Kasir, namun tetap bisa diubah manual saat transaksi</p>
        </div>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr><th>Platform</th><th>Persentase Potongan Default</th><th>Akun Piutang</th><th></th></tr></thead>
          <tbody>
            {settings.map(s => (
              <tr key={s.id}>
                <td>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:8, fontWeight:600 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:PLATFORM_COLOR[s.platform]||'var(--text3)' }}/>
                    {s.platform}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input className="input" type="number" min="0" max="100" step="0.5" style={{ width:90 }}
                      value={edited[s.id] !== undefined ? edited[s.id] : s.default_fee_percent}
                      onChange={e => setEdited(ed => ({ ...ed, [s.id]: e.target.value }))}/>
                    <span style={{ color:'var(--text2)', fontSize:13 }}>%</span>
                  </div>
                </td>
                <td style={{ fontSize:13, color:'var(--text2)' }}>Piutang {s.platform}</td>
                <td>
                  {edited[s.id] !== undefined && edited[s.id] !== String(s.default_fee_percent) && (
                    <button className="btn btn-primary" onClick={() => save(s.id)} style={{ padding:'6px 10px', display:'flex', alignItems:'center', gap:6 }}>
                      <Save size={13}/> Simpan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize:12, color:'var(--text3)', marginTop:14 }}>
        Catatan: persentase ini hanya digunakan sebagai nilai awal otomatis. Karena potongan aktual dari setiap platform bisa berbeda-beda tergantung promo atau kebijakan saat itu, kasir tetap dapat mengubah nominal potongan secara manual saat memproses transaksi.
      </p>
    </div>
  )
}
