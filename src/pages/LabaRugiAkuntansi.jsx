import { useState, useEffect } from 'react'
import { FileBarChart, TrendingUp, TrendingDown } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
const today = () => new Date().toISOString().split('T')[0]

export default function LabaRugiAkuntansi() {
  const [from,    setFrom]    = useState(firstOfMonth())
  const [to,      setTo]      = useState(today())
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [from, to])

  const load = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/financial/laba-rugi', { params:{ from, to } })
      setData(d)
    } catch { toast.error('Gagal memuat laporan') }
    finally { setLoading(false) }
  }

  const AccRow = ({ acc }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', fontSize:13, paddingLeft:16 }}>
      <span style={{ color:'var(--text2)' }}><span className="mono" style={{ fontSize:11, color:'var(--text3)', marginRight:8 }}>{acc.kode}</span>{acc.nama}</span>
      <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600 }}>{acc.saldo<0?`(${fmt(Math.abs(acc.saldo))})`:fmt(acc.saldo)}</span>
    </div>
  )

  const SectionHeader = ({ label }) => (
    <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4, marginTop:14 }}>{label}</div>
  )

  const TotalRow = ({ label, val, big, color }) => (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding: big?'12px 0':'9px 0', marginTop:big?8:4,
      borderTop: big ? '2px solid #1a1916' : '1px solid var(--border)',
      fontWeight:700, fontSize: big?15:13
    }}>
      <span style={{ color: color||'var(--text)' }}>{label}</span>
      <span style={{ fontFamily:'DM Mono,monospace', fontSize: big?18:13, color: color||'var(--text)' }}>
        {val<0?`(${fmt(Math.abs(val))})`:fmt(val)}
      </span>
    </div>
  )

  const isLaba = data?.laba_bersih >= 0

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--purple-50)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileBarChart size={20} color="var(--purple-600)"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Laporan Laba Rugi</h1>
            <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Berdasarkan jurnal akuntansi (Income Statement)</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Dari</label>
            <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ width:148 }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Sampai</label>
            <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:148 }}/>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat...</div>}

      {data && !loading && <>
        {/* Hero */}
        <div style={{ background:isLaba?'var(--teal)':'var(--danger)', borderRadius:14, padding:'20px 24px', marginBottom:20, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
              {isLaba?'Laba Bersih':'Rugi Bersih'} · {data.periode.from||'Awal'} s/d {data.periode.to}
            </div>
            <div style={{ fontSize:32, fontWeight:800, letterSpacing:'-1px' }}>
              {data.laba_bersih<0?`(${fmt(Math.abs(data.laba_bersih))})`:fmt(data.laba_bersih)}
            </div>
            <div style={{ fontSize:13, opacity:0.85, marginTop:4 }}>
              Margin {data.total_pendapatan>0 ? ((data.laba_bersih/data.total_pendapatan)*100).toFixed(1) : 0}% dari pendapatan
            </div>
          </div>
          {isLaba ? <TrendingUp size={56} opacity={0.3}/> : <TrendingDown size={56} opacity={0.3}/>}
        </div>

        {/* Income statement */}
        <div className="card" style={{ padding:0, overflow:'hidden', maxWidth:640 }}>
          <div style={{ background:'#1a1916', padding:'14px 20px' }}>
            <span style={{ color:'white', fontWeight:700, fontSize:14 }}>LAPORAN LABA RUGI</span>
          </div>
          <div style={{ padding:'18px 24px' }}>

            <SectionHeader label="Pendapatan (Penjualan Kasir & B2B)"/>
            {data.pendapatan.length===0 && <div style={{ fontSize:12, color:'var(--text3)', paddingLeft:16 }}>— Tidak ada akun</div>}
            {data.pendapatan.map(a => <AccRow key={a.kode} acc={a}/>)}
            <TotalRow label="Total Pendapatan" val={data.total_pendapatan}/>

            <SectionHeader label="Beban Atas Pendapatan (HPP)"/>
            {data.hpp.length===0 && <div style={{ fontSize:12, color:'var(--text3)', paddingLeft:16 }}>— Tidak ada akun</div>}
            {data.hpp.map(a => <AccRow key={a.kode} acc={a}/>)}
            <TotalRow label="Total HPP" val={data.total_hpp}/>

            <TotalRow label="LABA KOTOR" val={data.laba_kotor} big color={data.laba_kotor>=0?'var(--teal)':'var(--danger)'}/>

            <SectionHeader label="Beban Operasional"/>
            {data.beban.length===0 && <div style={{ fontSize:12, color:'var(--text3)', paddingLeft:16 }}>— Tidak ada akun</div>}
            {data.beban.map(a => <AccRow key={a.kode} acc={a}/>)}
            <TotalRow label="Total Beban Operasional" val={data.total_beban}/>

            <TotalRow label="LABA OPERASIONAL" val={data.laba_operasional} big color={data.laba_operasional>=0?'var(--teal)':'var(--danger)'}/>

            {(data.pendapatan_lain.length>0 || data.beban_lain.length>0) && <>
              <SectionHeader label="Pendapatan & Beban Lainnya"/>
              {data.pendapatan_lain.map(a => <AccRow key={a.kode} acc={a}/>)}
              {data.beban_lain.map(a => <AccRow key={a.kode} acc={{...a, saldo:-a.saldo}}/>)}
            </>}

            <TotalRow label={isLaba?'LABA BERSIH':'RUGI BERSIH'} val={data.laba_bersih} big color={isLaba?'var(--success)':'var(--danger)'}/>
          </div>
        </div>
      </>}
    </div>
  )
}
