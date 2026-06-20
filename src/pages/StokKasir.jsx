import { useState, useEffect, useRef } from 'react'
import { FlaskConical, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../api'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function StokKasir() {
  const [products,    setProducts]    = useState([])
  const [ingredients, setIngredients] = useState([])
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const intervalRef = useRef()

  useEffect(() => {
    load()
    // Auto-refresh setiap 30 detik (real-time stok)
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [p, i] = await Promise.all([
        api.get('/products'),
        api.get('/ingredients')
      ])
      setProducts(p.data)
      setIngredients(i.data)
      setLastUpdate(new Date())
    } finally { setLoading(false) }
  }

  const lowStock   = products.filter(p => p.stock <= 2)
  const lowIngred  = ingredients.filter(i => i.min_stock > 0 && i.stock <= i.min_stock)
  const hasAlert   = lowStock.length > 0 || lowIngred.length > 0

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Stok Produk</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            Update otomatis setiap 30 detik
            {lastUpdate && <span style={{ marginLeft:8, color:'var(--text3)' }}>· terakhir {lastUpdate.toLocaleTimeString('id-ID')}</span>}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}
          style={{ display:'flex', alignItems:'center', gap:6 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
          Refresh
        </button>
      </div>

      {/* Alert stok menipis */}
      {hasAlert && (
        <div style={{ background:'var(--danger-light)', border:'1px solid var(--danger)', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <AlertTriangle size={16} color="var(--danger)"/>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--danger)' }}>Perhatian — Stok Menipis</span>
          </div>
          {lowStock.length > 0 && (
            <div style={{ fontSize:13, marginBottom:6 }}>
              <span style={{ color:'var(--danger)', fontWeight:600 }}>Produk:</span>{' '}
              {lowStock.map(p => `${p.name} (${p.stock} ${p.stock_source==='resep'?'porsi':'pcs'})`).join(', ')}
            </div>
          )}
          {lowIngred.length > 0 && (
            <div style={{ fontSize:13 }}>
              <span style={{ color:'var(--danger)', fontWeight:600 }}>Persediaan:</span>{' '}
              {lowIngred.map(i => `${i.name} (${i.stock}${i.unit})`).join(', ')}
            </div>
          )}
          <div style={{ fontSize:12, color:'var(--danger)', marginTop:8, opacity:0.8 }}>
            Hubungi admin untuk melakukan restock.
          </div>
        </div>
      )}

      {/* Grid produk */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14, marginBottom:28 }}>
        {products.map(p => {
          const pct = p.stock_source === 'resep' ? Math.min(100, (p.stock / 20) * 100) : Math.min(100, (p.stock / 50) * 100)
          const color = p.stock === 0 ? 'var(--danger)' : p.stock <= 2 ? '#b45309' : 'var(--teal)'
          return (
            <div key={p.id} className="card" style={{ padding:'16px 18px', opacity: p.stock===0?0.7:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, lineHeight:1.3 }}>{p.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{fmt(p.price)}</div>
                </div>
                {p.stock_source === 'resep' && (
                  <FlaskConical size={14} color="var(--text3)" style={{ marginTop:2, flexShrink:0 }}/>
                )}
              </div>

              {/* Progress bar stok */}
              <div style={{ background:'var(--border)', borderRadius:4, height:6, marginBottom:8, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.5s' }}/>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:700, color }}>
                  {p.stock} {p.stock_source==='resep' ? 'porsi' : 'pcs'}
                </span>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:12, background: p.stock===0?'var(--danger-light)':p.stock<=2?'#fff8e1':'var(--teal-light)', color: p.stock===0?'var(--danger)':p.stock<=2?'#b45309':'var(--teal-dark)', fontWeight:600 }}>
                  {p.stock===0 ? 'Habis' : p.stock<=2 ? 'Menipis' : 'Aman'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabel persediaan */}
      <div style={{ marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Stok Persediaan</h2>
        <div className="card" style={{ overflow:'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Satuan</th>
                <th style={{ textAlign:'right' }}>Stok</th>
                <th style={{ textAlign:'right' }}>Min. Alert</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map(i => {
                const isLow = i.min_stock > 0 && i.stock <= i.min_stock
                return (
                  <tr key={i.id}>
                    <td style={{ fontWeight:600 }}>{i.name}</td>
                    <td><span className="badge badge-blue">{i.unit}</span></td>
                    <td style={{ textAlign:'right', fontWeight:600, fontFamily:'DM Mono,monospace' }}>{i.stock}</td>
                    <td style={{ textAlign:'right', color:'var(--text3)', fontFamily:'DM Mono,monospace' }}>{i.min_stock||'-'}</td>
                    <td>
                      <span className={`badge ${i.stock<=0?'badge-danger':isLow?'badge-blue':'badge-teal'}`}>
                        {i.stock<=0 ? 'Habis' : isLow ? 'Menipis' : 'Aman'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {ingredients.length===0 && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text3)', padding:32 }}>Belum ada persediaan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
