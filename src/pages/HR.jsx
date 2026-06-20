import { useState, useEffect, useCallback } from 'react'
import { Eye, X, Pencil, Save, AlertCircle, Clock, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const KETERANGAN_BADGE = {
  normal: { label:'Hadir', cls:'badge-teal' },
  izin:   { label:'Izin',  cls:'badge-blue' },
  sakit:  { label:'Sakit', cls:'badge-purple' },
}

function fmtTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta' })
}

export default function HR() {
  const [tab, setTab] = useState('absensi')
  const [state, setState] = useState({
    records: [], schedules: [],
    filterUser: 'all', filterKet: 'all', from: '', to: '',
    modal: null, selected: null,
    editKet: '', editCatatan: '',
    schedForm: {}
  })

  const set = patch => setState(s => ({ ...s, ...patch }))

  const loadAbsensi = useCallback(async (s) => {
    try {
      const params = {}
      if (s.filterUser !== 'all') params.user_id = s.filterUser
      if (s.filterKet !== 'all') params.keterangan = s.filterKet
      if (s.from) params.from = s.from
      if (s.to) params.to = s.to
      const { data } = await api.get('/attendance/hr', { params })
      set({ records: data || [] })
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal memuat data absensi') }
  }, [])

  const loadSchedules = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/schedules')
      set({ schedules: data || [] })
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal memuat jadwal') }
  }, [])

  useEffect(() => { loadAbsensi(state) }, [state.filterUser, state.filterKet, state.from, state.to])
  useEffect(() => { loadSchedules() }, [])

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/attendance/hr/${id}`)
      set({ selected: data, modal:'detail', editKet: data.keterangan, editCatatan: data.catatan||'' })
    } catch { toast.error('Gagal memuat detail') }
  }

  const saveKoreksi = async () => {
    try {
      await api.put(`/attendance/hr/${state.selected.id}`, { keterangan: state.editKet, catatan: state.editCatatan })
      toast.success('Koreksi disimpan')
      set({ modal:null })
      loadAbsensi(state)
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
  }

  const openSchedEdit = (sc) => {
    set({ modal:'schedule', schedForm: { user_id: sc.user_id, user_name: sc.user_name, jam_masuk: sc.jam_masuk, jam_keluar: sc.jam_keluar } })
  }

  const saveSchedule = async () => {
    try {
      await api.put(`/attendance/schedules/${state.schedForm.user_id}`, {
        jam_masuk: state.schedForm.jam_masuk, jam_keluar: state.schedForm.jam_keluar
      })
      toast.success('Jadwal kerja diperbarui')
      set({ modal:null })
      loadSchedules()
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
  }

  const { records, schedules, filterUser, filterKet, from, to, modal, selected, editKet, editCatatan, schedForm } = state
  const uniqueUsers = Array.from(new Map(records.map(r => [r.user_id, r.user_name])).entries())

  const telatCount = records.filter(r => r.status_telat).length
  const lemburCount = records.filter(r => r.status_lembur).length
  const izinCount = records.filter(r => r.keterangan === 'izin' || r.keterangan === 'sakit').length

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>HR - Absensi Karyawan</h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>
            {telatCount} telat {'\u00b7'} {lemburCount} lembur {'\u00b7'} {izinCount} izin/sakit
          </p>
        </div>
        {tab === 'absensi' && (
          <button className="btn btn-secondary" onClick={() => {
            const params = { user_id: filterUser, keterangan: filterKet, from, to }
            const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v && v !== 'all')))
            downloadCsv('/attendance/hr/export?' + qs.toString(), 'absensi.csv')
          }} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
        )}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <button className={`btn ${tab==='absensi'?'btn-primary':'btn-secondary'}`} onClick={() => setTab('absensi')}>Rekap Absensi</button>
        <button className={`btn ${tab==='jadwal'?'btn-primary':'btn-secondary'}`} onClick={() => setTab('jadwal')}>Jadwal Kerja</button>
      </div>

      {tab === 'absensi' && (
        <>
          <div className="card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Karyawan</label>
                <select className="input" value={filterUser} onChange={e => set({ filterUser:e.target.value })}>
                  <option value="all">Semua Karyawan</option>
                  {uniqueUsers.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Keterangan</label>
                <select className="input" value={filterKet} onChange={e => set({ filterKet:e.target.value })}>
                  <option value="all">Semua</option>
                  <option value="normal">Hadir Normal</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
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
          </div>

          <div className="card" style={{ overflow:'hidden' }}>
            <table>
              <thead><tr>
                <th>Tanggal</th><th>Karyawan</th><th>Check-in</th><th>Check-out</th><th>Keterangan</th><th></th>
              </tr></thead>
              <tbody>
                {records.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada data absensi</td></tr>
                  : records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize:13 }}>{r.tanggal}</td>
                      <td style={{ fontWeight:600 }}>{r.user_name}</td>
                      <td>
                        <div>{fmtTime(r.check_in)}</div>
                        {r.status_telat ? <div style={{ fontSize:11, color:'var(--danger)' }}>Telat {r.menit_telat}m</div> : null}
                      </td>
                      <td>
                        <div>{fmtTime(r.check_out)}</div>
                        {r.status_lembur ? <div style={{ fontSize:11, color:'var(--teal)' }}>Lembur {r.menit_lembur}m</div> : null}
                      </td>
                      <td><span className={`badge ${KETERANGAN_BADGE[r.keterangan]?.cls||'badge-blue'}`}>{KETERANGAN_BADGE[r.keterangan]?.label||r.keterangan}</span></td>
                      <td>
                        <button className="btn btn-secondary" onClick={() => openDetail(r.id)} style={{ padding:'6px 9px' }}><Eye size={13}/></button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'jadwal' && (
        <div className="card" style={{ overflow:'hidden' }}>
          <table>
            <thead><tr><th>Karyawan</th><th>Role</th><th>Jam Masuk</th><th>Jam Keluar</th><th></th></tr></thead>
            <tbody>
              {schedules.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Belum ada karyawan</td></tr>
                : schedules.map(sc => (
                  <tr key={sc.user_id}>
                    <td style={{ fontWeight:600 }}>{sc.user_name}</td>
                    <td style={{ fontSize:13, textTransform:'capitalize' }}>{sc.user_role}</td>
                    <td>{sc.jam_masuk}</td>
                    <td>{sc.jam_keluar}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => openSchedEdit(sc)} style={{ padding:'6px 9px' }}><Pencil size={13}/></button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {modal === 'detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, overflowY:'auto', padding:'20px 0' }}>
          <div className="card" style={{ width:520, padding:24, margin:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{selected.user_name}</div>
                <div style={{ fontSize:13, color:'var(--text2)' }}>{selected.tanggal}</div>
              </div>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={20}/></button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', marginBottom:6 }}>Foto Check-in {'\u00b7'} {fmtTime(selected.check_in)}</div>
                {selected.check_in_photo
                  ? <img src={selected.check_in_photo} alt="Check-in" style={{ width:'100%', borderRadius:8, aspectRatio:'4/3', objectFit:'cover' }}/>
                  : <div style={{ background:'var(--bg)', borderRadius:8, aspectRatio:'4/3', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:12 }}>Belum check-in</div>}
                {selected.status_telat ? <div style={{ fontSize:12, color:'var(--danger)', marginTop:6 }}><AlertCircle size={12} style={{ verticalAlign:'middle' }}/> Telat {selected.menit_telat} menit</div> : null}
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', marginBottom:6 }}>Foto Check-out {'\u00b7'} {fmtTime(selected.check_out)}</div>
                {selected.check_out_photo
                  ? <img src={selected.check_out_photo} alt="Check-out" style={{ width:'100%', borderRadius:8, aspectRatio:'4/3', objectFit:'cover' }}/>
                  : <div style={{ background:'var(--bg)', borderRadius:8, aspectRatio:'4/3', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:12 }}>Belum check-out</div>}
                {selected.status_lembur ? <div style={{ fontSize:12, color:'var(--teal)', marginTop:6 }}><Clock size={12} style={{ verticalAlign:'middle' }}/> Lembur {selected.menit_lembur} menit</div> : null}
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Koreksi Keterangan</div>
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                {Object.entries(KETERANGAN_BADGE).map(([v,info]) => (
                  <button key={v} type="button" onClick={() => set({ editKet:v })}
                    className={`btn ${editKet===v?'btn-primary':'btn-secondary'}`} style={{ flex:1, fontSize:12 }}>{info.label}</button>
                ))}
              </div>
              <input className="input" placeholder="Catatan tambahan (opsional)" value={editCatatan} onChange={e => set({ editCatatan:e.target.value })} style={{ marginBottom:14 }}/>
              <button className="btn btn-primary" onClick={saveKoreksi} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Save size={14}/> Simpan Koreksi
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'schedule' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:380, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Jadwal Kerja - {schedForm.user_name}</h2>
              <button onClick={() => set({ modal:null })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={18}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jam Masuk</label>
                <input className="input" type="time" value={schedForm.jam_masuk} onChange={e => set({ schedForm:{...schedForm, jam_masuk:e.target.value} })}/>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jam Keluar</label>
                <input className="input" type="time" value={schedForm.jam_keluar} onChange={e => set({ schedForm:{...schedForm, jam_keluar:e.target.value} })}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" onClick={() => set({ modal:null })} style={{ flex:1 }}>Batal</button>
              <button className="btn btn-primary" onClick={saveSchedule} style={{ flex:1 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
