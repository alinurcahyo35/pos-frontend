import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }

const AKTIVITAS_LABEL = {
  operasional: { label:'Operasional', cls:'badge-teal' },
  investasi:   { label:'Investasi',   cls:'badge-blue' },
  pendanaan:   { label:'Pendanaan',   cls:'badge-purple' },
}

function ActivityCard({ title, val, Icon, color }) {
  return (
    <div className="card" style={{ padding:18, flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Icon size={16} style={{ color }}/>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>{title}</span>
      </div>
      <div style={{ fontSize:13, color:'var(--text2)', marginBottom:4 }}>
        Masuk: <strong style={{ color:'var(--teal)' }}>{fmt(val.masuk)}</strong>
      </div>
      <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>
        Keluar: <strong style={{ color:'var(--danger)' }}>{fmt(val.keluar)}</strong>
      </div>
      <div style={{ fontSize:18, fontWeight:700, color: val.net>=0 ? 'var(--teal)' : 'var(--danger)' }}>
        {val.net<0 ? `(${fmt(Math.abs(val.net))})` : fmt(val.net)}
      </div>
    </div>
  )
}

export default function CashFlow() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to,   setTo]   = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [from, to])

  const load = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/financial/cashflow', { params: { from, to } })
      setData(d)
    } catch { toast.error('Gagal memuat laporan arus kas') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Wallet size={20} color="var(--teal)"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Cash Flow</h1>
            <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Arus kas masuk &amp; keluar dari akun Kas/Bank, dikelompokkan per aktivitas</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width:148 }} />
          <span style={{ color:'var(--text3)' }}>-</span>
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width:148 }} />
          <button className="btn btn-secondary" onClick={() => downloadCsv(`/financial/cashflow/export?from=${from}&to=${to}`, 'cash_flow.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
        </div>
      </div>

      {loading || !data ? (
        <p style={{ color:'var(--text3)' }}>Memuat...</p>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:20 }}>
            <div className="card" style={{ padding:18, background:'var(--teal-light)' }}>
              <div style={{ fontSize:12, color:'var(--teal-dark)', marginBottom:6 }}>Saldo Awal Periode</div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--teal-dark)' }}>{fmt(data.saldo_awal)}</div>
            </div>
            <ActivityCard title="Operasional" val={data.operasional} Icon={TrendingUp} color="var(--teal)"/>
            <ActivityCard title="Investasi" val={data.investasi} Icon={TrendingDown} color="var(--blue)"/>
            <ActivityCard title="Pendanaan" val={data.pendanaan} Icon={Wallet} color="#7c3aed"/>
          </div>

          <div className="card" style={{ padding:18, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>Total Masuk: <strong style={{ color:'var(--teal)' }}>{fmt(data.total_masuk)}</strong> {'\u00b7'} Total Keluar: <strong style={{ color:'var(--danger)' }}>{fmt(data.total_keluar)}</strong></div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'var(--text2)' }}>Saldo Akhir Periode</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--teal-dark)' }}>{fmt(data.saldo_akhir)}</div>
            </div>
          </div>

          <div className="card" style={{ overflow:'hidden' }}>
            <table>
              <thead><tr>
                <th>Tanggal</th><th>No Bukti</th><th>Keterangan</th><th>Akun</th><th>Aktivitas</th>
                <th style={{ textAlign:'right' }}>Masuk</th><th style={{ textAlign:'right' }}>Keluar</th><th style={{ textAlign:'right' }}>Saldo</th>
              </tr></thead>
              <tbody>
                {data.transaksi.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Tidak ada transaksi kas/bank pada periode ini</td></tr>
                  : data.transaksi.map((t,i) => (
                    <tr key={i}>
                      <td style={{ fontSize:13 }}>{t.tanggal}</td>
                      <td><span className="mono" style={{ fontSize:12 }}>{t.no_bukti}</span></td>
                      <td style={{ fontSize:13 }}>{t.keterangan}</td>
                      <td style={{ fontSize:13, color:'var(--text2)' }}>{t.account_nama}</td>
                      <td><span className={`badge ${AKTIVITAS_LABEL[t.aktivitas]?.cls}`}>{AKTIVITAS_LABEL[t.aktivitas]?.label}</span></td>
                      <td style={{ textAlign:'right', color: t.masuk>0 ? 'var(--teal)' : 'var(--text3)' }}>{t.masuk>0?fmt(t.masuk):'-'}</td>
                      <td style={{ textAlign:'right', color: t.keluar>0 ? 'var(--danger)' : 'var(--text3)' }}>{t.keluar>0?fmt(t.keluar):'-'}</td>
                      <td style={{ textAlign:'right', fontWeight:600 }}>{fmt(t.saldo_berjalan)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
