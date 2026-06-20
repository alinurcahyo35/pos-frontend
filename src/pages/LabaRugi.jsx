import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, Receipt, Wallet, Building2, Smartphone, Banknote } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api'
import toast from 'react-hot-toast'

const fmt        = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const today      = () => new Date().toISOString().split('T')[0]
const firstMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }

const KATEGORI = ['Gaji Karyawan','Sewa Tempat','Listrik & Air','Gas','Transportasi','Pemasaran','Peralatan','Lain-lain']
const OUTLETS  = ['Tirto Agung', 'Banjarsari Selatan', 'Veteran']
const emptyBiaya = { nama:'', kategori:'Gaji Karyawan', nominal:'', tanggal:today(), keterangan:'', outlet:'' }

const OUTLET_COLORS = {
  'Tirto Agung':        { bg:'#eef6ff', color:'#185fa5' },
  'Banjarsari Selatan': { bg:'#f0fdf4', color:'#0f6e56' },
  'Veteran':            { bg:'#fff7ed', color:'#b45309' },
}

// ── Mini card outlet ──
function OutletCard({ name, data, selected, onSelect }) {
  if (!data) return null
  const isLaba = data.laba_bersih >= 0
  const c      = OUTLET_COLORS[name] || { bg:'#f5f5f5', color:'#555' }
  return (
    <div onClick={onSelect} style={{
      background: selected ? c.color : 'var(--card)',
      border: `2px solid ${selected ? c.color : 'var(--border)'}`,
      borderRadius:14, padding:'18px 20px', cursor:'pointer', flex:1,
      transition:'all 0.18s',
      boxShadow: selected ? `0 4px 18px ${c.color}33` : '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, background: selected?'rgba(255,255,255,0.18)':c.bg, borderRadius:8, padding:'5px 10px' }}>
          <Building2 size={13} color={selected?'#fff':c.color}/>
          <span style={{ fontSize:12, fontWeight:700, color:selected?'#fff':c.color }}>{name}</span>
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20,
          background: isLaba?(selected?'rgba(255,255,255,0.25)':'#dcfce7'):(selected?'rgba(255,255,255,0.25)':'#fee2e2'),
          color: selected?'#fff':(isLaba?'#166534':'#991b1b') }}>
          {isLaba?'▲ LABA':'▼ RUGI'}
        </span>
      </div>
      <div style={{ marginBottom:4 }}>
        <div style={{ fontSize:10, fontWeight:600, color:selected?'rgba(255,255,255,0.7)':'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>Laba Bersih</div>
        <div style={{ fontSize:20, fontWeight:800, color:selected?'#fff':(isLaba?'var(--success)':'var(--danger)'), letterSpacing:'-0.5px' }}>
          {isLaba?'':'- '}{fmt(Math.abs(data.laba_bersih))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12, paddingTop:12, borderTop:`1px solid ${selected?'rgba(255,255,255,0.2)':'var(--border)'}` }}>
        <div>
          <div style={{ fontSize:10, color:selected?'rgba(255,255,255,0.65)':'var(--text3)', marginBottom:2 }}>Penjualan</div>
          <div style={{ fontSize:12, fontWeight:700, color:selected?'#fff':'var(--text)', fontFamily:'DM Mono,monospace' }}>{fmt(data.penjualan.total_penjualan)}</div>
        </div>
        <div>
          <div style={{ fontSize:10, color:selected?'rgba(255,255,255,0.65)':'var(--text3)', marginBottom:2 }}>Margin</div>
          <div style={{ fontSize:12, fontWeight:700, color:selected?'#fff':'var(--text)' }}>{data.margin_bersih}%</div>
        </div>
      </div>
    </div>
  )
}

// ── Rincian L/R lengkap ──
function RincianLR({ data, title }) {
  if (!data) return null
  const isLaba = data.laba_bersih >= 0
  const COLORS = { penjualan:'#185fa5', hpp:'#993c1d', laba_kotor:'#0f6e56', biaya:'#f4a261' }

  const chartData = (() => {
    const map = {}
    data.penjualan_harian.forEach(d => { map[d.date] = { date:d.date, penjualan:d.penjualan, hpp:d.hpp, laba_kotor:d.laba_kotor, biaya:d.biaya||0 } })
    return Object.values(map).sort((a,b)=>a.date.localeCompare(b.date))
  })()

  const biayaOps     = data.biaya_operasional
  const hasAggregator= (biayaOps.total_aggregator||0) > 0
  const hasPacking   = (biayaOps.total_packing||0) > 0

  return (
    <div>
      {/* Hero */}
      <div style={{ background:isLaba?'var(--teal)':'var(--danger)', borderRadius:14, padding:'20px 24px', marginBottom:20, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
            {isLaba?'Laba Bersih':'Rugi Bersih'} · {title} · {data.periode.from} s/d {data.periode.to}
          </div>
          <div style={{ fontSize:32, fontWeight:800, letterSpacing:'-1px' }}>{fmt(data.laba_bersih)}</div>
          <div style={{ fontSize:13, opacity:0.85, marginTop:4 }}>Margin {data.margin_bersih}% dari total penjualan</div>
        </div>
        {isLaba ? <TrendingUp size={56} opacity={0.3}/> : <TrendingDown size={56} opacity={0.3}/>}
      </div>

      {/* 4 metric cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Penjualan Kotor', data.penjualan.total_penjualan, DollarSign,'var(--blue)','var(--blue-light)'],
          ['HPP Persediaan',  data.penjualan.total_hpp,       Receipt,   'var(--danger)','var(--danger-light)'],
          ['Laba Kotor',      data.laba_kotor,                TrendingUp,'var(--teal)','var(--teal-light)'],
          ['Total Biaya Ops', biayaOps.total,                 Wallet,    '#b45309','#fff8e1'],
        ].map(([label,val,Icon,c,bg])=>(
          <div key={label} className="card" style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={16} color={c}/>
              </div>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:c }}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {/* Grafik */}
      {chartData.length > 0 && (
        <div className="card" style={{ padding:'20px 16px', marginBottom:20 }}>
          <div style={{ fontWeight:700, marginBottom:16 }}>Tren Harian</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{fontSize:11}} tickFormatter={d=>d.slice(5)}/>
              <YAxis tick={{fontSize:11}} tickFormatter={v=>'Rp'+(v/1000).toFixed(0)+'k'} width={60}/>
              <Tooltip formatter={v=>fmt(v)}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Bar dataKey="penjualan"  name="Penjualan"  fill={COLORS.penjualan}  radius={[3,3,0,0]}/>
              <Bar dataKey="hpp"        name="HPP"        fill={COLORS.hpp}        radius={[3,3,0,0]}/>
              <Bar dataKey="laba_kotor" name="Laba Kotor" fill={COLORS.laba_kotor} radius={[3,3,0,0]}/>
              <Bar dataKey="biaya"      name="Biaya Ops"  fill={COLORS.biaya}      radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Rincian L/R */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:700 }}>Rincian Laba Rugi</div>
          <div style={{ padding:18 }}>

            {/* Penjualan breakdown */}
            <Row label="Penjualan Tunai" val={data.penjualan.total_penjualan_tunai} indent icon={<Banknote size={12} color="#185fa5"/>} />
            <Row label="Penjualan Online" val={data.penjualan.total_penjualan_online} indent icon={<Smartphone size={12} color="#0f6e56"/>} />
            <Row label="Diskon" val={-data.penjualan.total_diskon} indent />
            <Row label="Penjualan Neto" val={data.penjualan.total_penjualan - data.penjualan.total_diskon} bold />
            <div style={{ borderTop:'1px dashed var(--border)', margin:'10px 0' }}/>

            {/* HPP */}
            <Row label="HPP Persediaan" val={-data.penjualan.total_hpp} color="var(--danger)" indent />
            <Row label="Laba Kotor" val={data.laba_kotor} bold color={data.laba_kotor>=0?'var(--teal)':'var(--danger)'} />
            <div style={{ borderTop:'1px dashed var(--border)', margin:'10px 0' }}/>

            {/* Biaya Operasional */}
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Biaya Operasional</div>

            {/* Aggregator & Packing — otomatis dari transaksi */}
            {hasAggregator && (
              <Row label="Biaya Aggregator" val={-biayaOps.total_aggregator} color="var(--danger)" indent
                badge={{ text:'Otomatis', color:'#b45309', bg:'#fff8e1' }} />
            )}
            {hasPacking && (
              <Row label="Biaya Packing" val={-biayaOps.total_packing} color="var(--danger)" indent
                badge={{ text:'Otomatis', color:'#b45309', bg:'#fff8e1' }} />
            )}

            {/* Biaya manual per kategori */}
            {biayaOps.list.map(b=>(
              <Row key={b.kategori} label={b.kategori} val={-b.total} color="var(--danger)" indent />
            ))}
            {biayaOps.list.length === 0 && !hasAggregator && !hasPacking && (
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>— Belum ada biaya operasional</div>
            )}

            <div style={{ borderTop:'2px solid var(--border)', margin:'10px 0' }}/>
            <Row label={isLaba?'✅ Laba Bersih':'❌ Rugi Bersih'} val={data.laba_bersih} bold
              color={isLaba?'var(--success)':'var(--danger)'} large />
          </div>
        </div>

        {/* Per produk */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:700 }}>Laba per Produk</div>
          <table>
            <thead><tr>
              <th>Produk</th>
              <th style={{textAlign:'right'}}>Qty</th>
              <th style={{textAlign:'right'}}>Revenue</th>
              <th style={{textAlign:'right'}}>Laba</th>
            </tr></thead>
            <tbody>
              {data.per_produk.map(p=>(
                <tr key={p.product_name}>
                  <td style={{fontSize:13,fontWeight:600}}>{p.product_name}</td>
                  <td style={{textAlign:'right'}}><span className="badge badge-blue">{p.qty}</span></td>
                  <td style={{textAlign:'right',fontSize:13}}>{fmt(p.revenue)}</td>
                  <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:p.laba_kotor>=0?'var(--success)':'var(--danger)'}}>{fmt(p.laba_kotor)}</td>
                </tr>
              ))}
              {data.per_produk.length===0&&<tr><td colSpan={4} style={{textAlign:'center',color:'var(--text3)',padding:24}}>Belum ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function LabaRugi() {
  const [laporan,    setLaporan]    = useState(null)
  const [biaya,      setBiaya]      = useState([])
  const [from,       setFrom]       = useState(firstMonth())
  const [to,         setTo]         = useState(today())
  const [loading,    setLoading]    = useState(false)
  const [tab,        setTab]        = useState('laporan')
  const [activeView, setActiveView] = useState('holding')
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(emptyBiaya)
  const [editId,     setEditId]     = useState(null)

  useEffect(() => { loadLaporan(); loadBiaya() }, [from, to])

  const loadLaporan = async () => {
    setLoading(true)
    try { const { data } = await api.get('/labarugi/laporan', { params:{from,to} }); setLaporan(data) }
    finally { setLoading(false) }
  }

  const loadBiaya = async () => {
    const { data } = await api.get('/labarugi/biaya', { params:{from,to} })
    setBiaya(data)
  }

  const openAdd  = () => { setForm(emptyBiaya); setEditId(null); setModal(true) }
  const openEdit = b => { setForm({ ...b, nominal:String(b.nominal) }); setEditId(b.id); setModal(true) }

  const saveBiaya = async e => {
    e.preventDefault()
    const payload = { ...form, nominal: parseFloat(form.nominal) }
    try {
      if (editId) { await api.put(`/labarugi/biaya/${editId}`, payload); toast.success('Biaya diperbarui') }
      else        { await api.post('/labarugi/biaya', payload);           toast.success('Biaya ditambahkan') }
      setModal(false); loadBiaya(); loadLaporan()
    } catch(err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  const removeBiaya = async id => {
    if (!confirm('Hapus biaya ini?')) return
    await api.delete(`/labarugi/biaya/${id}`)
    toast.success('Dihapus'); loadBiaya(); loadLaporan()
  }

  const activeData  = laporan ? (activeView==='holding' ? laporan.holding : laporan.outlets?.[activeView]) : null
  const activeTitle = activeView==='holding' ? 'Semua Outlet (Holding)' : activeView

  return (
    <div style={{ padding:28 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Laba Rugi</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Laporan keuangan per outlet & gabungan (holding)</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ width:148 }}/>
          <span style={{ color:'var(--text3)' }}>–</span>
          <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:148 }}/>
        </div>
      </div>

      {/* Tab */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg)', borderRadius:10, padding:4, width:'fit-content' }}>
        {[['laporan','📊 Laporan L/R'],['biaya','💸 Input Biaya']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:'8px 20px', borderRadius:7, border:'none', cursor:'pointer',
            background:tab===k?'var(--card)':'transparent',
            fontWeight:tab===k?600:400, fontSize:13,
            color:tab===k?'var(--text)':'var(--text2)',
            boxShadow:tab===k?'0 1px 4px rgba(0,0,0,0.08)':'none',
            fontFamily:'Plus Jakarta Sans,sans-serif', transition:'all 0.15s'
          }}>{l}</button>
        ))}
      </div>

      {/* ── TAB LAPORAN ── */}
      {tab==='laporan' && <>
        {loading && <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat data...</div>}
        {laporan && !loading && <>

          {/* 3 card outlet sejajar */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
              Pencapaian per Outlet — klik untuk detail
            </div>
            <div style={{ display:'flex', gap:14 }}>
              {OUTLETS.map(o=>(
                <OutletCard key={o} name={o} data={laporan.outlets?.[o]}
                  selected={activeView===o} onSelect={()=>setActiveView(activeView===o?'holding':o)} />
              ))}
            </div>
          </div>

          {/* Tombol Holding */}
          <div style={{ marginBottom:24 }}>
            <button onClick={()=>setActiveView('holding')} style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
              borderRadius:10, cursor:'pointer', fontWeight:600, fontSize:13,
              background:activeView==='holding'?'var(--teal)':'var(--card)',
              color:activeView==='holding'?'#fff':'var(--text)',
              border:activeView==='holding'?'none':'1px solid var(--border)',
              transition:'all 0.15s',
              boxShadow:activeView==='holding'?'0 3px 12px rgba(15,110,86,0.3)':'0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <Building2 size={15}/>
              🏢 Holding — Semua Outlet Gabungan
              {activeView==='holding'&&<span style={{ fontSize:11, background:'rgba(255,255,255,0.25)', padding:'2px 8px', borderRadius:20 }}>Aktif</span>}
            </button>
          </div>

          <RincianLR data={activeData} title={activeTitle} />
        </>}
      </>}

      {/* ── TAB BIAYA ── */}
      {tab==='biaya' && <>
        <div style={{ marginBottom:12, padding:'10px 14px', background:'#fff8e1', borderRadius:8, border:'1px solid #f59e0b33', fontSize:12, color:'#92400e' }}>
          💡 <strong>Biaya Aggregator</strong> dan <strong>Biaya Packing</strong> sudah otomatis dihitung dari transaksi kasir — tidak perlu diinput di sini. Halaman ini untuk biaya operasional lainnya (gaji, sewa, listrik, dll).
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Tambah Biaya
          </button>
        </div>

        <div className="card" style={{ overflow:'hidden' }}>
          <table>
            <thead><tr>
              <th>Tanggal</th><th>Nama Biaya</th><th>Kategori</th><th>Outlet</th>
              <th style={{textAlign:'right'}}>Nominal</th><th>Keterangan</th><th></th>
            </tr></thead>
            <tbody>
              {biaya.map(b=>(
                <tr key={b.id}>
                  <td style={{color:'var(--text3)',fontSize:12,fontFamily:'DM Mono,monospace'}}>{b.tanggal}</td>
                  <td style={{fontWeight:600}}>{b.nama}</td>
                  <td><span className="badge badge-blue">{b.kategori}</span></td>
                  <td>{b.outlet
                    ? <span className="badge" style={{ background:OUTLET_COLORS[b.outlet]?.bg||'#f5f5f5', color:OUTLET_COLORS[b.outlet]?.color||'#555' }}>{b.outlet}</span>
                    : <span style={{fontSize:12,color:'var(--text3)'}}>Semua</span>}
                  </td>
                  <td style={{textAlign:'right',fontWeight:600,color:'var(--danger)'}}>{fmt(b.nominal)}</td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{b.keterangan||'-'}</td>
                  <td>
                    <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                      <button className="btn btn-secondary" onClick={()=>openEdit(b)} style={{padding:'6px 10px'}}><Pencil size={13}/></button>
                      <button className="btn btn-danger" onClick={()=>removeBiaya(b.id)} style={{padding:'6px 10px'}}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {biaya.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'var(--text3)',padding:40}}>
                Belum ada biaya operasional. Klik "Tambah Biaya" untuk mencatat.
              </td></tr>}
            </tbody>
          </table>
        </div>

        {biaya.length>0&&(
          <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 20px', display:'flex', gap:16, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text2)' }}>Total biaya periode ini:</span>
              <span style={{ fontSize:18, fontWeight:700, color:'var(--danger)' }}>{fmt(biaya.reduce((s,b)=>s+b.nominal,0))}</span>
            </div>
          </div>
        )}
      </>}

      {/* Modal biaya */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div className="card" style={{width:460,padding:28}}>
            <h2 style={{fontSize:17,fontWeight:700,marginBottom:20}}>{editId?'Edit':'Tambah'} Biaya Operasional</h2>
            <form onSubmit={saveBiaya}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>Nama Biaya</label>
                  <input className="input" required placeholder="cth: Gaji April" value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))}/>
                </div>
                <div>
                  <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>Kategori</label>
                  <select className="input" value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                    {KATEGORI.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>Nominal (Rp)</label>
                  <input className="input" type="number" min="0" required placeholder="0"
                    value={form.nominal} onChange={e=>setForm(f=>({...f,nominal:e.target.value}))} style={{fontSize:16,fontWeight:600}}/>
                </div>
                <div>
                  <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>Tanggal</label>
                  <input className="input" type="date" required value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))}/>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>Outlet (opsional)</label>
                <select className="input" value={form.outlet} onChange={e=>setForm(f=>({...f,outlet:e.target.value}))}>
                  <option value="">— Semua Outlet (Holding) —</option>
                  {OUTLETS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Kosongkan jika biaya berlaku untuk semua outlet.</div>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>Keterangan (opsional)</label>
                <input className="input" placeholder="cth: 2 karyawan × Rp 1.500.000" value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))}/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)} style={{flex:1}}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{flex:1}}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, val, indent, bold, color, large, icon, badge }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, paddingLeft:indent?16:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {icon && icon}
        <span style={{ fontSize:large?15:13, fontWeight:bold?700:400, color:'var(--text)' }}>{label}</span>
        {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:12, background:badge.bg, color:badge.color }}>{badge.text}</span>}
      </div>
      <span style={{ fontSize:large?17:13, fontWeight:bold?700:500, color:color||(val<0?'var(--danger)':'var(--text)'), fontFamily:'DM Mono,monospace' }}>
        {val<0?`- ${fmt(Math.abs(val))}`:fmt(val)}
      </span>
    </div>
  )
}
