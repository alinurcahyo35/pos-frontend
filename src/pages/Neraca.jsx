import { useState, useEffect } from 'react'
import { Scale, CheckCircle2, AlertTriangle, Wallet, Building2, CreditCard, PiggyBank } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

export default function Neraca() {
  const [to,      setTo]      = useState(today())
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [to])

  const load = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/financial/neraca', { params:{ to } })
      setData(d)
    } catch { toast.error('Gagal memuat neraca') }
    finally { setLoading(false) }
  }

  const AccRow = ({ acc }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', fontSize:13 }}>
      <span style={{ color:'var(--text2)' }}><span className="mono" style={{ fontSize:11, color:'var(--text3)', marginRight:8 }}>{acc.kode}</span>{acc.nama}</span>
      <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color: acc.saldo_akhir<0 ? 'var(--danger)' : 'var(--text)' }}>
        {acc.saldo_akhir<0 ? `(${fmt(Math.abs(acc.saldo_akhir))})` : fmt(acc.saldo_akhir)}
      </span>
    </div>
  )

  const SubTotal = ({ label, val, color }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', marginTop:4, borderTop:'1px solid var(--border)', fontWeight:700, fontSize:13 }}>
      <span style={{ color: color||'var(--text)' }}>{label}</span>
      <span style={{ fontFamily:'DM Mono,monospace', color: color||'var(--text)' }}>{val<0?`(${fmt(Math.abs(val))})`:fmt(val)}</span>
    </div>
  )

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--purple-50)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scale size={20} color="var(--purple-600)"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Neraca</h1>
            <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Laporan posisi keuangan (Balance Sheet)</p>
          </div>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Per Tanggal</label>
          <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:160 }}/>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat...</div>}

      {data && !loading && <>
        {/* Hero summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Total Aset', data.total_aset, Wallet, 'var(--blue)','var(--blue-light)'],
            ['Total Kewajiban', data.total_kewajiban, CreditCard, 'var(--danger)','var(--danger-light)'],
            ['Total Modal', data.total_modal, PiggyBank, 'var(--teal)','var(--teal-light)'],
            ['Laba Berjalan', data.laba_berjalan, Building2, data.laba_berjalan>=0?'var(--success)':'var(--danger)', data.laba_berjalan>=0?'var(--success-light)':'var(--danger-light)'],
          ].map(([label,val,Icon,color,bg]) => (
            <div key={label} className="card" style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={16} color={color}/>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
              </div>
              <div style={{ fontSize:17, fontWeight:700, color }}>{val<0?`(${fmt(Math.abs(val))})`:fmt(val)}</div>
            </div>
          ))}
        </div>

        {/* Balance check */}
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderRadius:10, marginBottom:20,
          background: data.balanced ? 'var(--teal-light)' : 'var(--danger-light)'
        }}>
          {data.balanced ? <CheckCircle2 size={18} color="var(--teal-dark)"/> : <AlertTriangle size={18} color="var(--danger)"/>}
          <span style={{ fontSize:13, fontWeight:600, color: data.balanced ? 'var(--teal-dark)' : 'var(--danger)' }}>
            {data.balanced
              ? 'Neraca seimbang — Total Aset = Total Kewajiban + Modal'
              : `Neraca tidak seimbang. Selisih: ${fmt(Math.abs(data.selisih))}`}
          </span>
        </div>

        {/* Main neraca: 2 columns */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* ASET */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ background:'#1a1916', padding:'14px 20px' }}>
              <span style={{ color:'white', fontWeight:700, fontSize:14 }}>ASET</span>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Aset Lancar</div>
              {data.aset_lancar.length===0 && <div style={{ fontSize:12, color:'var(--text3)', padding:'4px 0' }}>— Tidak ada akun</div>}
              {data.aset_lancar.map(a => <AccRow key={a.kode} acc={a}/>)}
              <SubTotal label="Total Aset Lancar" val={data.total_aset_lancar} color="var(--blue)"/>

              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', margin:'18px 0 6px' }}>Aset Tetap</div>
              {data.aset_tetap.length===0 && <div style={{ fontSize:12, color:'var(--text3)', padding:'4px 0' }}>— Tidak ada akun</div>}
              {data.aset_tetap.map(a => <AccRow key={a.kode} acc={a}/>)}
              <SubTotal label="Total Aset Tetap" val={data.total_aset_tetap} color="var(--blue)"/>

              <div style={{ marginTop:18, paddingTop:14, borderTop:'2px solid #1a1916', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:800, fontSize:15 }}>TOTAL ASET</span>
                <span style={{ fontWeight:800, fontSize:18, color:'var(--blue)', fontFamily:'DM Mono,monospace' }}>{fmt(data.total_aset)}</span>
              </div>
            </div>
          </div>

          {/* KEWAJIBAN & MODAL */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ background:'#1a1916', padding:'14px 20px' }}>
              <span style={{ color:'white', fontWeight:700, fontSize:14 }}>KEWAJIBAN & MODAL</span>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Kewajiban</div>
              {data.kewajiban.length===0 && <div style={{ fontSize:12, color:'var(--text3)', padding:'4px 0' }}>— Tidak ada akun</div>}
              {data.kewajiban.map(a => <AccRow key={a.kode} acc={a}/>)}
              <SubTotal label="Total Kewajiban" val={data.total_kewajiban} color="var(--danger)"/>

              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', margin:'18px 0 6px' }}>Modal</div>
              {data.modal.length===0 && <div style={{ fontSize:12, color:'var(--text3)', padding:'4px 0' }}>— Tidak ada akun</div>}
              {data.modal.map(a => <AccRow key={a.kode} acc={a}/>)}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', fontSize:13 }}>
                <span style={{ color:'var(--text2)', fontStyle:'italic' }}>Laba/Rugi Berjalan (periode ini)</span>
                <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color: data.laba_berjalan<0?'var(--danger)':'var(--success)' }}>
                  {data.laba_berjalan<0 ? `(${fmt(Math.abs(data.laba_berjalan))})` : fmt(data.laba_berjalan)}
                </span>
              </div>
              <SubTotal label="Total Modal" val={data.total_modal} color="var(--teal)"/>

              <div style={{ marginTop:18, paddingTop:14, borderTop:'2px solid #1a1916', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:800, fontSize:15 }}>TOTAL KEWAJIBAN & MODAL</span>
                <span style={{ fontWeight:800, fontSize:18, color:'var(--teal)', fontFamily:'DM Mono,monospace' }}>{fmt(data.total_kewajiban_modal)}</span>
              </div>
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}
