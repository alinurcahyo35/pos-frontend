import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]

export default function Laporan() {
  const [data,    setData]    = useState(null)
  const [from,    setFrom]    = useState(today())
  const [to,      setTo]      = useState(today())
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [from, to])

  const load = async () => {
    setLoading(true)
    try { const { data:d } = await api.get('/reports/summary', { params:{from,to} }); setData(d) }
    finally { setLoading(false) }
  }

  const COLORS = ['#0f6e56','#185fa5','#534ab7','#993c1d','#3b6d11']
  const marginPct = data?.summary ? (data.summary.total_revenue > 0 ? ((data.summary.total_laba/data.summary.total_revenue)*100).toFixed(1) : 0) : 0

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Laporan Penjualan & Laba Rugi</h1>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width:148 }} />
          <span style={{ color:'var(--text3)' }}>–</span>
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width:148 }} />
          <button className="btn btn-secondary" onClick={() => downloadCsv(`/transactions/export?from=${from}&to=${to}`, 'transaksi_kasir.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat...</div>}

      {data && !loading && <>
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
          {[
            ['Total Transaksi', data.summary.total_transactions, '', 'var(--text)'],
            ['Total Penjualan', fmt(data.summary.total_revenue), '', 'var(--text)'],
            ['Total HPP', fmt(data.summary.total_hpp), '', 'var(--danger)'],
            ['Laba Bersih', fmt(data.summary.total_laba), `Margin ${marginPct}%`, data.summary.total_laba>=0?'var(--success)':'var(--danger)'],
          ].map(([label,val,sub,color]) => (
            <div key={label} className="card" style={{ padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:700, color, letterSpacing:'-0.3px' }}>{val}</div>
              {sub && <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Revenue + HPP + Laba chart */}
        <div className="card" style={{ padding:'20px 16px', marginBottom:20 }}>
          <div style={{ fontWeight:700, marginBottom:16, paddingLeft:4 }}>Penjualan vs HPP vs Laba (Harian)</div>
          {data.daily.length>0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.daily} margin={{ left:0, right:0 }}>
                <XAxis dataKey="date" tick={{ fontSize:11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => 'Rp'+(v/1000).toFixed(0)+'k'} width={60} />
                <Tooltip formatter={v => fmt(v)} />
                <Legend wrapperStyle={{ fontSize:12 }} />
                <Bar dataKey="revenue" name="Penjualan" fill="#185fa5" radius={[4,4,0,0]} />
                <Bar dataKey="hpp"     name="HPP"       fill="#993c1d" radius={[4,4,0,0]} />
                <Bar dataKey="laba"    name="Laba"      fill="#0f6e56" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>Tidak ada data</div>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
          {/* Top products dengan laba */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', fontWeight:700 }}>Produk Terlaris + Laba</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produk</th>
                  <th style={{ textAlign:'right' }}>Terjual</th>
                  <th style={{ textAlign:'right' }}>Revenue</th>
                  <th style={{ textAlign:'right' }}>HPP</th>
                  <th style={{ textAlign:'right' }}>Laba</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((p,i) => (
                  <tr key={p.product_name}>
                    <td style={{ color:'var(--text3)', fontSize:12 }}>{i+1}</td>
                    <td style={{ fontWeight:600, fontSize:13 }}>{p.product_name}</td>
                    <td style={{ textAlign:'right' }}><span className="badge badge-teal">{p.qty_sold}</span></td>
                    <td style={{ textAlign:'right', fontSize:13 }}>{fmt(p.revenue)}</td>
                    <td style={{ textAlign:'right', fontSize:13, color:'var(--danger)' }}>{fmt(p.total_hpp||0)}</td>
                    <td style={{ textAlign:'right', fontSize:13, fontWeight:700, color:(p.laba||0)>=0?'var(--success)':'var(--danger)' }}>{fmt(p.laba||0)}</td>
                  </tr>
                ))}
                {data.top_products.length===0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:24 }}>Tidak ada data</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Metode + stok menipis */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="card" style={{ padding:'16px' }}>
              <div style={{ fontWeight:700, marginBottom:12 }}>Metode Bayar</div>
              {data.by_method.length>0 ? (
                <>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={data.by_method} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" outerRadius={50}>
                        {data.by_method.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  {data.by_method.map((m,i) => (
                    <div key={m.payment_method} style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:COLORS[i%COLORS.length], flexShrink:0 }} />
                      <span style={{ fontSize:12, flex:1, textTransform:'capitalize' }}>{m.payment_method}</span>
                      <span style={{ fontSize:12, fontWeight:600 }}>{m.count}x</span>
                    </div>
                  ))}
                </>
              ) : <div style={{ color:'var(--text3)', fontSize:13 }}>Tidak ada data</div>}
            </div>

            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14 }}>Stok Menipis</div>
              {data.low_stock.length===0
                ? <div style={{ padding:'16px', fontSize:13, color:'var(--text2)', textAlign:'center' }}>Semua stok aman ✅</div>
                : data.low_stock.map(p => (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{p.name}</span>
                    <span className={`badge ${p.stock===0?'badge-danger':'badge-blue'}`}>{p.stock}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}
