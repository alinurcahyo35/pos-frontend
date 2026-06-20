import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, FileText, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
const today = () => new Date().toISOString().split('T')[0]

export default function LabaRugiKredit() {
  const [from,    setFrom]    = useState(firstOfMonth())
  const [to,      setTo]      = useState(today())
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [from, to])

  const load = async () => {
    setLoading(true)
    try {
      // Ambil semua invoice & hutang, filter di JS
      const [invRes, hutRes, biayaRes] = await Promise.all([
        api.get('/invoices', { params: { status: 'all' } }),
        api.get('/hutang', { params: { status: 'all' } }),
        api.get('/labarugi/biaya', { params: { from, to } })
      ])

      const invoices = (invRes.data || []).filter(inv => inv.tanggal >= from && inv.tanggal <= to)
      const hutang   = (hutRes.data || []).filter(h => h.tanggal >= from && h.tanggal <= to)
      const biaya    = biayaRes.data || []

      // Penjualan kredit summary
      const total_invoice  = invoices.reduce((s,i) => s + (i.total||0), 0)
      const total_hpp      = invoices.reduce((s,i) => s + (i.hpp_total||0), 0)
      const total_terbayar = invoices.reduce((s,i) => s + (i.paid||0), 0)
      const total_piutang  = invoices.reduce((s,i) => s + (i.sisa||0), 0)
      const laba_kotor     = total_invoice - total_hpp

      // Hutang summary
      const total_hutang      = hutang.reduce((s,h) => s + (h.jumlah||0), 0)
      const total_hutang_bayar = hutang.reduce((s,h) => s + (h.paid||0), 0)
      const sisa_hutang       = hutang.reduce((s,h) => s + (h.sisa||0), 0)

      // Biaya ops
      const total_biaya = biaya.reduce((s,b) => s + (b.nominal||0), 0)
      const biayaByKat  = {}
      biaya.forEach(b => { biayaByKat[b.kategori] = (biayaByKat[b.kategori]||0) + b.nominal })
      const biaya_list = Object.entries(biayaByKat).map(([kategori,total]) => ({ kategori, total })).sort((a,b)=>b.total-a.total)

      // Laba bersih
      const laba_bersih = laba_kotor - total_biaya

      // Per konsumen
      const byCustomer = {}
      invoices.forEach(inv => {
        const k = inv.customer_name || 'Tanpa Nama'
        if (!byCustomer[k]) byCustomer[k] = { nama:k, total:0, hpp:0, terbayar:0, piutang:0, count:0 }
        byCustomer[k].total    += inv.total||0
        byCustomer[k].hpp      += inv.hpp_total||0
        byCustomer[k].terbayar += inv.paid||0
        byCustomer[k].piutang  += inv.sisa||0
        byCustomer[k].count    += 1
      })
      const per_konsumen = Object.values(byCustomer)
        .map(c => ({ ...c, laba: c.total - c.hpp }))
        .sort((a,b) => b.laba - a.laba)

      // Harian
      const harianMap = {}
      invoices.forEach(inv => {
        const d = inv.tanggal
        if (!harianMap[d]) harianMap[d] = { date:d, penjualan:0, hpp:0, laba:0 }
        harianMap[d].penjualan += inv.total||0
        harianMap[d].hpp       += inv.hpp_total||0
        harianMap[d].laba      += (inv.total||0) - (inv.hpp_total||0)
      })
      const harian = Object.values(harianMap).sort((a,b) => a.date.localeCompare(b.date))

      // Status invoice
      const inv_unpaid  = invoices.filter(i=>i.status==='unpaid').length
      const inv_partial = invoices.filter(i=>i.status==='partial').length
      const inv_paid    = invoices.filter(i=>i.status==='paid').length

      setData({
        total_invoice, total_hpp, total_terbayar, total_piutang,
        laba_kotor, laba_bersih,
        total_biaya, biaya_list,
        total_hutang, total_hutang_bayar, sisa_hutang,
        margin: total_invoice > 0 ? ((laba_bersih/total_invoice)*100).toFixed(1) : 0,
        per_konsumen, harian,
        inv_count: invoices.length, inv_unpaid, inv_partial, inv_paid
      })
    } catch(e) {
      console.error(e)
      toast.error('Gagal memuat laporan')
    } finally { setLoading(false) }
  }

  const isLaba = data?.laba_bersih >= 0

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>L/R Penjualan Kredit</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Laporan laba rugi dari invoice & penjualan kredit superadmin</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width:148 }}/>
          <span style={{ color:'var(--text3)' }}>–</span>
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width:148 }}/>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat...</div>}

      {data && !loading && <>
        {/* Hero laba bersih */}
        <div style={{ background:isLaba?'var(--teal)':'var(--danger)', borderRadius:14, padding:'20px 24px', marginBottom:20, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
              {isLaba?'Laba Bersih':'Rugi Bersih'} · {from} s/d {to}
            </div>
            <div style={{ fontSize:32, fontWeight:800, letterSpacing:'-1px' }}>{fmt(data.laba_bersih)}</div>
            <div style={{ fontSize:13, opacity:0.85, marginTop:4 }}>Margin {data.margin}% · {data.inv_count} invoice</div>
          </div>
          {isLaba ? <TrendingUp size={56} opacity={0.3}/> : <TrendingDown size={56} opacity={0.3}/>}
        </div>

        {/* 4 metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Total Invoice',   data.total_invoice,   DollarSign, 'var(--blue)','var(--blue-light)'],
            ['HPP',             data.total_hpp,        FileText,   'var(--danger)','var(--danger-light)'],
            ['Laba Kotor',      data.laba_kotor,       TrendingUp, 'var(--teal)','var(--teal-light)'],
            ['Total Biaya Ops', data.total_biaya,      Wallet,     '#b45309','#fff8e1'],
          ].map(([label,val,Icon,color,bg]) => (
            <div key={label} className="card" style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={16} color={color}/>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
              </div>
              <div style={{ fontSize:17, fontWeight:700, color }}>{fmt(val)}</div>
            </div>
          ))}
        </div>

        {/* Status piutang */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Total Piutang Aktif', data.total_piutang,  'var(--danger)'],
            ['Sudah Terbayar',      data.total_terbayar, 'var(--teal)'],
            ['Invoice Belum Bayar', data.inv_unpaid,     'var(--danger)'],
            ['Invoice Lunas',       data.inv_paid,       'var(--teal)'],
          ].map(([label,val,color]) => (
            <div key={label} className="card" style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:18, fontWeight:700, color }}>{typeof val==='number'&&val>999?fmt(val):val}</div>
            </div>
          ))}
        </div>

        {/* Chart harian */}
        {data.harian.length > 0 && (
          <div className="card" style={{ padding:'20px 16px', marginBottom:20 }}>
            <div style={{ fontWeight:700, marginBottom:16 }}>Tren Penjualan Kredit Harian</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.harian}>
                <XAxis dataKey="date" tick={{ fontSize:11 }} tickFormatter={d => d.slice(5)}/>
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => 'Rp'+(v/1000).toFixed(0)+'k'} width={60}/>
                <Tooltip formatter={v => fmt(v)}/>
                <Legend wrapperStyle={{ fontSize:12 }}/>
                <Bar dataKey="penjualan" name="Penjualan" fill="#185fa5" radius={[3,3,0,0]}/>
                <Bar dataKey="hpp"       name="HPP"       fill="#993c1d" radius={[3,3,0,0]}/>
                <Bar dataKey="laba"      name="Laba"      fill="#0f6e56" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          {/* Rincian L/R */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:700 }}>Rincian Laba Rugi</div>
            <div style={{ padding:18 }}>
              <Row label="Total Penjualan Kredit" val={data.total_invoice}/>
              <div style={{ borderTop:'1px dashed var(--border)', margin:'10px 0' }}/>
              <Row label="HPP" val={-data.total_hpp} color="var(--danger)" indent/>
              <Row label="Laba Kotor" val={data.laba_kotor} bold color={data.laba_kotor>=0?'var(--teal)':'var(--danger)'}/>
              <div style={{ borderTop:'1px dashed var(--border)', margin:'10px 0' }}/>
              {data.biaya_list.map(b => (
                <Row key={b.kategori} label={b.kategori} val={-b.total} color="var(--danger)" indent/>
              ))}
              {data.biaya_list.length===0 && <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>— Belum ada biaya operasional</div>}
              <div style={{ borderTop:'2px solid var(--border)', margin:'10px 0' }}/>
              <Row label={isLaba?'✅ Laba Bersih':'❌ Rugi Bersih'} val={data.laba_bersih} bold
                color={isLaba?'var(--success)':'var(--danger)'} large/>
            </div>
          </div>

          {/* Per konsumen */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:700 }}>Laba per Konsumen</div>
            <table>
              <thead><tr>
                <th>Konsumen</th><th style={{ textAlign:'right' }}>Invoice</th>
                <th style={{ textAlign:'right' }}>Total</th><th style={{ textAlign:'right' }}>Laba</th>
                <th style={{ textAlign:'right' }}>Piutang</th>
              </tr></thead>
              <tbody>
                {data.per_konsumen.map((c,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600, fontSize:13 }}>{c.nama}</td>
                    <td style={{ textAlign:'right' }}><span className="badge badge-blue">{c.count}</span></td>
                    <td style={{ textAlign:'right', fontSize:13 }}>{fmt(c.total)}</td>
                    <td style={{ textAlign:'right', fontSize:13, fontWeight:700, color:c.laba>=0?'var(--success)':'var(--danger)' }}>{fmt(c.laba)}</td>
                    <td style={{ textAlign:'right', fontSize:13, color:c.piutang>0?'var(--danger)':'var(--teal)' }}>{fmt(c.piutang)}</td>
                  </tr>
                ))}
                {data.per_konsumen.length===0 && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text3)', padding:24 }}>Tidak ada data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hutang summary */}
        {data.total_hutang > 0 && (
          <div className="card" style={{ padding:'18px 20px' }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>Ringkasan Hutang Periode Ini</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[
                ['Total Hutang Baru', data.total_hutang, 'var(--danger)'],
                ['Sudah Dibayar',     data.total_hutang_bayar, 'var(--teal)'],
                ['Sisa Hutang',       data.sisa_hutang, 'var(--danger)'],
              ].map(([label,val,color]) => (
                <div key={label}>
                  <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:18, fontWeight:700, color }}>{fmt(val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>}
    </div>
  )
}

function Row({ label, val, indent, bold, color, large }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, paddingLeft:indent?16:0 }}>
      <span style={{ fontSize:large?15:13, fontWeight:bold?700:400 }}>{label}</span>
      <span style={{ fontSize:large?17:13, fontWeight:bold?700:500, color:color||(val<0?'var(--danger)':'var(--text)'), fontFamily:'DM Mono,monospace' }}>
        {val<0?`- ${fmt(Math.abs(val))}`:fmt(val)}
      </span>
    </div>
  )
}
