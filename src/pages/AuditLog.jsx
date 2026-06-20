import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const AKSI_BADGE = {
  create: { label:'Tambah', cls:'badge-teal' },
  update: { label:'Ubah',   cls:'badge-blue' },
  delete: { label:'Hapus',  cls:'badge-danger' },
}

function AksiIcon({ aksi }) {
  if (aksi === 'create') return <Plus size={12}/>
  if (aksi === 'update') return <Pencil size={12}/>
  return <Trash2 size={12}/>
}

function formatValue(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function DiffTable({ before, after }) {
  if (!before && !after) return <p style={{ fontSize:13, color:'var(--text3)' }}>Tidak ada detail data.</p>

  const keys = Array.from(new Set([
    ...(before ? Object.keys(before) : []),
    ...(after ? Object.keys(after) : [])
  ])).filter(k => !['id','created_at','updated_at','items','payments'].includes(k))

  return (
    <table style={{ marginTop:8 }}>
      <thead><tr><th>Field</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
      <tbody>
        {keys.map(k => {
          const vBefore = before ? before[k] : undefined
          const vAfter  = after ? after[k] : undefined
          const changed = JSON.stringify(vBefore) !== JSON.stringify(vAfter)
          return (
            <tr key={k}>
              <td style={{ fontWeight:600, fontSize:12 }}>{k}</td>
              <td style={{ fontSize:12, color: changed ? 'var(--danger)' : 'var(--text2)' }}>{formatValue(vBefore)}</td>
              <td style={{ fontSize:12, color: changed ? 'var(--teal)' : 'var(--text2)', fontWeight: changed?600:400 }}>{formatValue(vAfter)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function LogRow({ log, isExpanded, onToggle }) {
  return (
    <>
      <tr style={{ cursor:'pointer' }} onClick={onToggle}>
        <td style={{ fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>{log.created_at}</td>
        <td style={{ fontSize:13 }}>
          <div style={{ fontWeight:600 }}>{log.user_name}</div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>{log.user_role}</div>
        </td>
        <td><span className="badge badge-blue">{log.modul}</span></td>
        <td>
          <span className={`badge ${AKSI_BADGE[log.aksi]?.cls||'badge-blue'}`} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
            <AksiIcon aksi={log.aksi}/>{AKSI_BADGE[log.aksi]?.label||log.aksi}
          </span>
        </td>
        <td style={{ fontSize:13 }}>{log.record_label||'-'}</td>
        <td style={{ textAlign:'right' }}>
          {isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} style={{ background:'var(--bg)', padding:'12px 16px' }}>
            <DiffTable before={log.data_sebelum} after={log.data_sesudah}/>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditLog() {
  const [state, setState] = useState({
    logs: [], total: 0, showing: 0, modules: [],
    filterModul: 'all', filterAksi: 'all', from: '', to: '', q: '',
    expanded: null
  })

  const set = patch => setState(s => ({ ...s, ...patch }))

  const load = async (params) => {
    try {
      const { data } = await api.get('/audit', { params })
      set({ logs: data.logs || [], total: data.total||0, showing: data.showing||0 })
    } catch(e) {
      toast.error(e.response?.data?.error || 'Gagal memuat audit log')
    }
  }

  const loadModules = async () => {
    try {
      const { data } = await api.get('/audit/modules')
      set({ modules: data || [] })
    } catch {}
  }

  const buildParams = (s) => {
    const params = {}
    if (s.filterModul !== 'all') params.modul = s.filterModul
    if (s.filterAksi !== 'all') params.aksi = s.filterAksi
    if (s.from) params.from = s.from
    if (s.to) params.to = s.to
    if (s.q) params.q = s.q
    return params
  }

  useEffect(() => { loadModules() }, [])
  useEffect(() => { load(buildParams(state)) }, [state.filterModul, state.filterAksi, state.from, state.to])

  const { logs, total, showing, modules, filterModul, filterAksi, from, to, q, expanded } = state

  const handleSearch = e => {
    e.preventDefault()
    load(buildParams(state))
  }

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Audit Log</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            Riwayat perubahan data oleh seluruh pengguna {'\u00b7'} Menampilkan {showing} dari {total} entri
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => downloadCsv('/audit/export?' + new URLSearchParams(buildParams(state)).toString(), 'audit_log.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Download size={15}/> Export CSV
        </button>
      </div>

      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Modul</label>
            <select className="input" value={filterModul} onChange={e => set({ filterModul:e.target.value })}>
              <option value="all">Semua Modul</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Aksi</label>
            <select className="input" value={filterAksi} onChange={e => set({ filterAksi:e.target.value })}>
              <option value="all">Semua Aksi</option>
              <option value="create">Tambah</option>
              <option value="update">Ubah</option>
              <option value="delete">Hapus</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Dari Tanggal</label>
            <input className="input" type="date" value={from} onChange={e => set({ from:e.target.value })}/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Sampai Tanggal</label>
            <input className="input" type="date" value={to} onChange={e => set({ to:e.target.value })}/>
          </div>
        </div>
        <form onSubmit={handleSearch} style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:12, top:11, color:'var(--text3)' }}/>
          <input className="input" style={{ paddingLeft:36 }} placeholder="Cari berdasarkan nama data atau nama pengguna..."
            value={q} onChange={e => set({ q:e.target.value })}/>
        </form>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table>
          <thead><tr>
            <th>Waktu</th><th>Pengguna</th><th>Modul</th><th>Aksi</th><th>Data</th><th></th>
          </tr></thead>
          <tbody>
            {logs.length === 0
              ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Tidak ada aktivitas yang tercatat</td></tr>
              : logs.map(l => (
                <LogRow key={l.id} log={l} isExpanded={expanded===l.id} onToggle={() => set({ expanded: expanded===l.id ? null : l.id })}/>
              ))
            }
          </tbody>
        </table>
      </div>

      {total > 500 && (
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:10, textAlign:'center' }}>
          Hanya menampilkan 500 entri terbaru. Gunakan filter tanggal untuk mempersempit pencarian.
        </p>
      )}
    </div>
  )
}
