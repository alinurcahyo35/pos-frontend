import { useState, useEffect, useRef } from 'react'
import { TrendingUp, ShoppingBag, BarChart2, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const pct = (a,b) => b > 0 ? (((a-b)/b)*100).toFixed(1) : null

const OUTLETS = ['Semua Outlet', 'Banjarsari Selatan', 'Tirto Agung', 'Veteran']
const PERIODS = [
  { label:'Hari ini', days:0 },
  { label:'7 hari', days:6 },
  { label:'30 hari', days:29 },
  { label:'Bulan ini', days:-1 },
]

function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate()-n);
  return d.toISOString().split('T')[0]
}
function firstOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0]
}

const AGGR_COLOR = { GoFood:'#00AA13', ShopeeFood:'#EE4D2D', GrabFood:'#00B14F' }
const METHOD_COLOR = { tunai:'#888780', kartu:'#534AB7', qris:'#185FA5', gofood:'#00AA13', shopeefood:'#EE4D2D', grabfood:'#00B14F' }
const METHOD_LABEL = { tunai:'Tunai', kartu:'Kartu', qris:'QRIS', gofood:'GoFood', shopeefood:'ShopeeFood', grabfood:'GrabFood' }

export default function Dashboard() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [period, setPeriod]     = useState(0)
  const [outlet, setOutlet]     = useState('Semua Outlet')
  const [customFrom, setCustomFrom] = useState(today())
  const [customTo, setCustomTo]     = useState(today())
  const [showCustom, setShowCustom] = useState(false)
  const hourChartRef  = useRef(null)
  const dailyChartRef = useRef(null)
  const hourChart     = useRef(null)
  const dailyChart    = useRef(null)

  useEffect(() => { load() }, [period, outlet])

  const getRange = () => {
    if (showCustom) return { from: customFrom, to: customTo }
    if (period === 3) return { from: firstOfMonth(), to: today() }
    return { from: daysAgo(PERIODS[period].days), to: today() }
  }

  const load = async () => {
    setLoading(true)
    try {
      const { from, to } = getRange()
      const params = { from, to }
      if (outlet !== 'Semua Outlet') params.outlet = outlet
      const { data: d } = await api.get('/reports/dashboard', { params })
      setData(d)
    } catch { toast.error('Gagal memuat dashboard') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!data || !window.Chart) return
    renderHourChart()
    renderDailyChart()
  }, [data])

  const renderHourChart = () => {
    if (!hourChartRef.current) return
    if (hourChart.current) { hourChart.current.destroy(); hourChart.current = null }
    const hours = Array.from({length:24},(_,i)=>i)
    const counts = hours.map(h => {
      const row = data.byHour.find(r => r.jam === h)
      return row ? row.jumlah : 0
    })
    const maxCount = Math.max(...counts, 1)
    hourChart.current = new window.Chart(hourChartRef.current, {
      type: 'bar',
      data: {
        labels: hours.map(h => h.toString().padStart(2,'0')),
        datasets: [{
          label: 'Transaksi',
          data: counts,
          backgroundColor: counts.map(c => {
            const ratio = c / maxCount
            if (ratio > 0.7) return '#0F6E56'
            if (ratio > 0.4) return '#1D9E75'
            if (ratio > 0.1) return '#5DCAA5'
            return '#E1F5EE'
          }),
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } }
        }
      }
    })
  }

  const renderDailyChart = () => {
    if (!dailyChartRef.current) return
    if (dailyChart.current) { dailyChart.current.destroy(); dailyChart.current = null }
    const labels = data.byDay.map(d => d.tanggal.slice(5))
    const values = data.byDay.map(d => d.total)
    dailyChart.current = new window.Chart(dailyChartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Penjualan',
          data: values,
          borderColor: '#0F6E56',
          backgroundColor: 'rgba(15,110,86,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: labels.length <= 7 ? 4 : 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: v => 'Rp '+Number(v/1000).toFixed(0)+'rb' } }
        }
      }
    })
  }

  const maxProduct = data?.topProducts?.[0]?.revenue || 1
  const maxMethod  = data?.byMethod?.[0]?.jumlah || 1

  const pctTxn  = data ? pct(data.summary?.total_transaksi, data.prevSummary?.total_transaksi) : null
  const pctRev  = data ? pct(data.summary?.total_penjualan, data.prevSummary?.total_penjualan) : null
  const margin  = data?.summary?.total_penjualan > 0 ? ((data.summary.laba_kotor / data.summary.total_penjualan)*100).toFixed(1) : 0

  return (
    <div style={{ padding:28 }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Dashboard Performance</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Penjualan, produk terlaris, dan jam ramai per outlet</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {PERIODS.map((p,i) => (
          <button key={i} className={`btn ${period===i&&!showCustom?'btn-primary':'btn-secondary'}`}
            onClick={() => { setPeriod(i); setShowCustom(false) }}
            style={{ fontSize:13 }}>{p.label}
          </button>
        ))}
        <button className={`btn ${showCustom?'btn-primary':'btn-secondary'}`}
          onClick={() => setShowCustom(true)} style={{ fontSize:13 }}>Custom</button>
        <select className="input" value={outlet} onChange={e=>setOutlet(e.target.value)} style={{ width:'auto', fontSize:13 }}>
          {OUTLETS.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {showCustom && (
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16 }}>
          <input className="input" type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{ width:148 }}/>
          <span style={{ color:'var(--text3)' }}>–</span>
          <input className="input" type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{ width:148 }}/>
          <button className="btn btn-primary" onClick={load} style={{ fontSize:13 }}>Tampilkan</button>
        </div>
      )}

      {loading && <p style={{ color:'var(--text3)', marginBottom:16 }}>Memuat...</p>}

      {data && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Total Penjualan', val:fmt(data.summary.total_penjualan), sub: pctRev ? `${pctRev>0?'↑':'↓'} ${Math.abs(pctRev)}% vs periode sebelumnya` : '', color: parseFloat(pctRev)>=0?'var(--teal)':'var(--danger)' },
              { label:'Jumlah Transaksi (Nota)', val:data.summary.total_transaksi, sub: pctTxn ? `${pctTxn>0?'↑':'↓'} ${Math.abs(pctTxn)}% vs periode sebelumnya` : '', color: parseFloat(pctTxn)>=0?'var(--teal)':'var(--danger)' },
              { label:'Rata-rata per Nota', val:fmt(data.summary.rata_rata), sub:'', color:'var(--text2)' },
              { label:'Laba Kotor (est.)', val:fmt(data.summary.laba_kotor), sub:`Margin ${margin}%`, color:'var(--text2)' },
            ].map((c,i) => (
              <div key={i} className="card" style={{ padding:16 }}>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>{c.label}</div>
                <div style={{ fontSize:20, fontWeight:700 }}>{c.val}</div>
                {c.sub && <div style={{ fontSize:12, color:c.color, marginTop:3 }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Produk terlaris (qty)</div>
              {data.topProducts.slice(0,7).map((p,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:13 }}>
                  <span style={{ color:'var(--text2)', width:16, textAlign:'right', fontSize:11 }}>{i+1}</span>
                  <span style={{ width:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text2)' }}>{p.product_name}</span>
                  <div style={{ flex:1, height:8, background:'var(--bg)', borderRadius:3 }}>
                    <div style={{ height:8, borderRadius:3, background:'#1D9E75', width:`${(p.revenue/maxProduct*100).toFixed(1)}%` }}/>
                  </div>
                  <span style={{ minWidth:70, textAlign:'right', fontWeight:600 }}>{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Metode pembayaran</div>
              {data.byMethod.map((m,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:13 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:METHOD_COLOR[m.payment_method]||'#888', flexShrink:0 }}/>
                  <span style={{ width:110, color:'var(--text2)' }}>{METHOD_LABEL[m.payment_method]||m.payment_method}</span>
                  <div style={{ flex:1, height:8, background:'var(--bg)', borderRadius:3 }}>
                    <div style={{ height:8, borderRadius:3, background:METHOD_COLOR[m.payment_method]||'#888', width:`${(m.jumlah/maxMethod*100).toFixed(1)}%` }}/>
                  </div>
                  <span style={{ minWidth:80, textAlign:'right', fontWeight:600 }}>{m.jumlah} nota ({Math.round(m.jumlah/data.summary.total_transaksi*100)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding:16, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Transaksi per jam</div>
            <div style={{ position:'relative', height:120 }}>
              <canvas ref={hourChartRef} role="img" aria-label="Grafik transaksi per jam"/>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11, color:'var(--text2)' }}>
              <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#0F6E56', marginRight:4 }}/>Jam ramai</span>
              <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#1D9E75', marginRight:4 }}/>Sedang</span>
              <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#5DCAA5', marginRight:4 }}/>Sepi</span>
            </div>
          </div>

          {data.byDay.length > 1 && (
            <div className="card" style={{ padding:16, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Tren penjualan harian</div>
              <div style={{ position:'relative', height:140 }}>
                <canvas ref={dailyChartRef} role="img" aria-label="Grafik tren penjualan harian"/>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Aggregator online</div>
              {data.byAggregator.length === 0
                ? <p style={{ fontSize:13, color:'var(--text3)' }}>Belum ada transaksi via aggregator</p>
                : data.byAggregator.map((a,i) => (
                  <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom: i<data.byAggregator.length-1?'0.5px solid var(--border)':'' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontWeight:600, color:AGGR_COLOR[a.platform]||'var(--text)', fontSize:13 }}>{a.platform}</span>
                      <span style={{ fontWeight:700, fontSize:13 }}>{fmt(a.gross)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)' }}>
                      <span>{a.jumlah} transaksi</span>
                      <span>Potongan: {fmt(a.potongan)}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--teal)', textAlign:'right', fontWeight:600 }}>Bersih: {fmt(a.net)}</div>
                  </div>
                ))
              }
            </div>

            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Per outlet</div>
              {data.byOutlet.length === 0
                ? <p style={{ fontSize:13, color:'var(--text3)' }}>Belum ada data</p>
                : data.byOutlet.map((o,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontSize:13 }}>
                    <span style={{ color:'var(--text2)' }}>{o.outlet}</span>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700 }}>{fmt(o.total)}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{o.jumlah} nota</div>
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                <AlertTriangle size={15} color="var(--danger)"/> Stok bahan kritis
              </div>
              {data.lowStock.length === 0
                ? <p style={{ fontSize:13, color:'var(--teal)' }}>✓ Semua stok aman</p>
                : data.lowStock.map((s,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, fontSize:12 }}>
                    <span style={{ color:'var(--text2)' }}>{s.name}</span>
                    <span className="badge badge-danger" style={{ fontSize:11 }}>{s.stock} {s.unit}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}
