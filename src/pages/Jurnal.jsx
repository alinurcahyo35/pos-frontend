import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, X, BookText, ChevronDown, ChevronUp, Search, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt   = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')
const today = () => new Date().toISOString().split('T')[0]
const emptyLine = () => ({ account_kode:'', keterangan:'', debet:'', kredit:'' })
const emptyForm = () => ({ tanggal:today(), keterangan:'', no_bukti:'', lines:[emptyLine(),emptyLine()] })

export default function Jurnal() {
  const [entries,  setEntries]  = useState([])
  const [accounts, setAccounts] = useState([])
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(emptyForm())
  const [editId,   setEditId]   = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadAccounts() }, [])
  useEffect(() => { load() }, [from, to])

  const load = async () => {
    try {
      const { data } = await api.get('/journal', { params:{ from, to } })
      setEntries(data || [])
    } catch { toast.error('Gagal memuat jurnal') }
  }
  const loadAccounts = async () => {
    const { data } = await api.get('/accounts')
    setAccounts(data || [])
  }

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal(true) }
  const openEdit = entry => {
    setForm({
      tanggal: entry.tanggal, keterangan: entry.keterangan||'', no_bukti: entry.no_bukti,
      lines: entry.lines.map(l => ({ account_kode:l.account_kode, keterangan:l.keterangan||'', debet:l.debet?String(l.debet):'', kredit:l.kredit?String(l.kredit):'' }))
    })
    setEditId(entry.id); setModal(true)
  }

  const addLine    = () => setForm(f => ({ ...f, lines:[...f.lines, emptyLine()] }))
  const removeLine = idx => setForm(f => ({ ...f, lines: f.lines.filter((_,i)=>i!==idx) }))
  const setLine    = (idx,k,v) => setForm(f => ({ ...f, lines: f.lines.map((l,i)=> i===idx ? {...l,[k]:v} : l) }))

  const totalDebet  = form.lines.reduce((s,l) => s + (parseFloat(l.debet)||0), 0)
  const totalKredit = form.lines.reduce((s,l) => s + (parseFloat(l.kredit)||0), 0)
  const selisih     = totalDebet - totalKredit
  const isBalance   = Math.abs(selisih) < 0.01 && totalDebet > 0

  const save = async e => {
    e.preventDefault()
    const payload = {
      tanggal: form.tanggal, keterangan: form.keterangan, no_bukti: form.no_bukti || undefined,
      lines: form.lines.map(l => ({ ...l, debet:parseFloat(l.debet)||0, kredit:parseFloat(l.kredit)||0 })).filter(l => l.account_kode && (l.debet>0||l.kredit>0))
    }
    try {
      if (editId) { await api.put(`/journal/${editId}`, payload); toast.success('Jurnal diperbarui') }
      else        { await api.post('/journal', payload);          toast.success('Jurnal disimpan') }
      setModal(false); load()
    } catch(err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
  }

  const hapus = async id => {
    if (!confirm('Hapus jurnal ini?')) return
    await api.delete(`/journal/${id}`)
    toast.success('Dihapus'); load()
  }

  const totalSemua = entries.reduce((s,e) => s + e.total_debet, 0)

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--purple-50)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BookText size={20} color="var(--purple-600)"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Jurnal Umum</h1>
            <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{entries.length} transaksi · Total {fmt(totalSemua)}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/journal/export', 'jurnal_umum.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Buat Jurnal
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ width:160 }} placeholder="Dari"/>
        <span style={{ color:'var(--text3)', alignSelf:'center' }}>–</span>
        <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:160 }} placeholder="Sampai"/>
        {(from||to) && <button className="btn btn-secondary" onClick={()=>{setFrom('');setTo('')}} style={{ fontSize:12 }}>Reset</button>}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {entries.map(entry => {
          const isOpen = expanded === entry.id
          return (
            <div key={entry.id} className="card" style={{ overflow:'hidden' }}>
              <div onClick={() => setExpanded(isOpen?null:entry.id)} style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
                <div style={{ width:70, flexShrink:0 }}>
                  <span className="mono badge badge-blue">{entry.no_bukti}</span>
                </div>
                <div style={{ width:90, flexShrink:0, fontSize:13, color:'var(--text2)', fontFamily:'DM Mono,monospace' }}>{entry.tanggal}</div>
                <div style={{ flex:1, fontSize:14, fontWeight:600 }}>{entry.keterangan || entry.lines[0]?.keterangan || '-'}</div>
                <div style={{ textAlign:'right', fontWeight:700, fontSize:15 }}>{fmt(entry.total_debet)}</div>
                {!entry.balanced && <span className="badge badge-danger">Tidak Balance</span>}
                {isOpen ? <ChevronUp size={16} color="var(--text3)"/> : <ChevronDown size={16} color="var(--text3)"/>}
              </div>

              {isOpen && (
                <div style={{ borderTop:'1px solid var(--border)' }}>
                  <table>
                    <thead><tr>
                      <th>Akun</th><th>Keterangan</th>
                      <th style={{ textAlign:'right' }}>Debet</th><th style={{ textAlign:'right' }}>Kredit</th>
                    </tr></thead>
                    <tbody>
                      {entry.lines.map((l,i) => (
                        <tr key={i}>
                          <td><span className="mono" style={{ fontSize:12 }}>{l.account_kode}</span> · {l.account_nama}</td>
                          <td style={{ fontSize:13, color:'var(--text2)' }}>{l.keterangan||'-'}</td>
                          <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace' }}>{l.debet>0?fmt(l.debet):''}</td>
                          <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace' }}>{l.kredit>0?fmt(l.kredit):''}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={2} style={{ fontWeight:700, fontSize:13 }}>TOTAL</td>
                        <td style={{ textAlign:'right', fontWeight:700, fontFamily:'DM Mono,monospace' }}>{fmt(entry.total_debet)}</td>
                        <td style={{ textAlign:'right', fontWeight:700, fontFamily:'DM Mono,monospace' }}>{fmt(entry.total_kredit)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'10px 18px' }}>
                    <button className="btn btn-secondary" onClick={() => openEdit(entry)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}><Pencil size={13}/> Edit</button>
                    <button className="btn btn-danger" onClick={() => hapus(entry.id)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}><Trash2 size={13}/> Hapus</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {entries.length === 0 && (
          <div className="card" style={{ textAlign:'center', padding:50, color:'var(--text3)' }}>
            Belum ada jurnal transaksi. Klik "Buat Jurnal" untuk mencatat transaksi.
          </div>
        )}
      </div>

      {/* Modal Form */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:760, padding:28, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editId?'Edit Jurnal':'Buat Jurnal Baru'}</h2>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>
            <form onSubmit={save}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Tanggal</label>
                  <input className="input" type="date" required value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>No. Bukti</label>
                  <input className="input mono" placeholder="Auto (JU-xxx)" value={form.no_bukti} onChange={e=>setForm(f=>({...f,no_bukti:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Keterangan Transaksi</label>
                  <input className="input" placeholder="cth: Pembelian persediaan" value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))}/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:'2.5fr 2fr 1.2fr 1.2fr 20px', gap:6, marginBottom:6 }}>
                  {['Akun','Keterangan','Debet','Kredit',''].map((h,i) => (
                    <div key={i} style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
                  ))}
                </div>
                {form.lines.map((line,idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'2.5fr 2fr 1.2fr 1.2fr 20px', gap:6, marginBottom:6 }}>
                    <select className="input" required value={line.account_kode} onChange={e=>setLine(idx,'account_kode',e.target.value)}>
                      <option value="">-- Pilih akun --</option>
                      {accounts.map(a => <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>)}
                    </select>
                    <input className="input" placeholder="Opsional" value={line.keterangan} onChange={e=>setLine(idx,'keterangan',e.target.value)}/>
                    <input className="input" type="number" min="0" placeholder="0" value={line.debet}
                      onChange={e=>setLine(idx,'debet',e.target.value)}
                      onFocus={()=>{ if(line.kredit) setLine(idx,'kredit','') }}/>
                    <input className="input" type="number" min="0" placeholder="0" value={line.kredit}
                      onChange={e=>setLine(idx,'kredit',e.target.value)}
                      onFocus={()=>{ if(line.debet) setLine(idx,'debet','') }}/>
                    <button type="button" onClick={()=>removeLine(idx)} disabled={form.lines.length<=2}
                      style={{ background:'none', border:'none', cursor: form.lines.length<=2?'not-allowed':'pointer', color:'var(--danger)', opacity:form.lines.length<=2?0.3:1 }}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addLine} style={{ fontSize:12, padding:'6px 14px', marginTop:4 }}>+ Tambah Baris</button>
              </div>

              {/* Balance indicator */}
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 16px', borderRadius:8, marginBottom:20,
                background: isBalance ? 'var(--teal-light)' : 'var(--danger-light)',
              }}>
                <div style={{ display:'flex', gap:24 }}>
                  <div><span style={{ fontSize:11, color:'var(--text3)' }}>Total Debet</span><div style={{ fontWeight:700, fontFamily:'DM Mono,monospace' }}>{fmt(totalDebet)}</div></div>
                  <div><span style={{ fontSize:11, color:'var(--text3)' }}>Total Kredit</span><div style={{ fontWeight:700, fontFamily:'DM Mono,monospace' }}>{fmt(totalKredit)}</div></div>
                </div>
                <div style={{ fontWeight:700, color: isBalance?'var(--teal-dark)':'var(--danger)' }}>
                  {isBalance ? '✓ Balance' : `Selisih: ${fmt(Math.abs(selisih))}`}
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={!isBalance} style={{ flex:1, opacity:isBalance?1:0.5 }}>
                  {editId?'Simpan Perubahan':'Simpan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
