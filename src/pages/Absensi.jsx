import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CheckCircle, LogOut, Clock, AlertCircle } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const KETERANGAN_OPTIONS = [
  { v:'normal', l:'Hadir Normal' },
  { v:'izin',   l:'Izin' },
  { v:'sakit',  l:'Sakit' },
]

function fmtTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta' })
}

export default function Absensi() {
  const [state, setState] = useState({
    today: null, schedule: null, loading: true,
    cameraOpen: false, mode: null,
    keterangan: 'normal', catatan: '', photo: null,
    submitting: false
  })
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const set = patch => setState(s => ({ ...s, ...patch }))

  const load = useCallback(async () => {
    try {
      const [todayRes, schedRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/schedule/me')
      ])
      set({ today: todayRes.data, schedule: schedRes.data, loading: false })
    } catch (e) {
      console.error(e)
      set({ loading: false })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCamera = async (mode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user' } })
      streamRef.current = stream
      set({ cameraOpen:true, mode, photo:null })
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 50)
    } catch (e) {
      toast.error('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan di browser.')
    }
  }

  const closeCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    set({ cameraOpen:false, mode:null, photo:null, keterangan:'normal', catatan:'' })
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    set({ photo: dataUrl })
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }

  const retake = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user' } })
      streamRef.current = stream
      set({ photo: null })
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 50)
    } catch { toast.error('Tidak dapat mengakses kamera') }
  }

  const submit = async () => {
    if (!state.photo) { toast.error('Ambil foto terlebih dahulu'); return }
    set({ submitting: true })
    try {
      if (state.mode === 'check-in') {
        await api.post('/attendance/check-in', { photo: state.photo, keterangan: state.keterangan, catatan: state.catatan })
        toast.success('Check-in berhasil dicatat')
      } else {
        await api.post('/attendance/check-out', { photo: state.photo })
        toast.success('Check-out berhasil dicatat')
      }
      closeCamera()
      set({ submitting: false })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan absensi')
      set({ submitting: false })
    }
  }

  const { today, schedule, loading, cameraOpen, mode, keterangan, catatan, photo, submitting } = state
  const hasCheckedIn  = today && today.check_in
  const hasCheckedOut = today && today.check_out

  if (loading) return <div style={{ padding:28 }}>Memuat...</div>

  return (
    <div style={{ padding:28, maxWidth:560 }}>
      <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px', marginBottom:4 }}>Absensi</h1>
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
        Jadwal kerja Anda: {schedule?.jam_masuk||'08:00'} - {schedule?.jam_keluar||'17:00'}
      </p>

      <div className="card" style={{ padding:24, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Clock size={18} style={{ color:'var(--text2)' }}/>
          <div style={{ fontSize:14, fontWeight:600 }}>Status Hari Ini</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Check-in</div>
            <div style={{ fontSize:20, fontWeight:700, marginTop:4 }}>{fmtTime(today?.check_in)}</div>
            {today?.status_telat ? <div style={{ fontSize:11, color:'var(--danger)', marginTop:4 }}>Telat {today.menit_telat} menit</div> : null}
          </div>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Check-out</div>
            <div style={{ fontSize:20, fontWeight:700, marginTop:4 }}>{fmtTime(today?.check_out)}</div>
            {today?.status_lembur ? <div style={{ fontSize:11, color:'var(--teal)', marginTop:4 }}>Lembur {today.menit_lembur} menit</div> : null}
          </div>
        </div>

        {today?.keterangan && today.keterangan !== 'normal' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text2)', marginBottom:16 }}>
            <AlertCircle size={14}/> Keterangan: <strong style={{ textTransform:'capitalize' }}>{today.keterangan}</strong>
          </div>
        )}

        {!hasCheckedIn && (
          <button className="btn btn-primary" onClick={() => openCamera('check-in')} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px' }}>
            <Camera size={16}/> Check-in Sekarang
          </button>
        )}
        {hasCheckedIn && !hasCheckedOut && (
          <button className="btn btn-primary" onClick={() => openCamera('check-out')} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px' }}>
            <LogOut size={16}/> Check-out Sekarang
          </button>
        )}
        {hasCheckedIn && hasCheckedOut && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', color:'var(--teal)', fontWeight:600 }}>
            <CheckCircle size={16}/> Absensi hari ini selesai
          </div>
        )}
      </div>

      {cameraOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:420, padding:24 }}>
            <h2 style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>
              {mode === 'check-in' ? 'Check-in' : 'Check-out'} - Ambil Foto
            </h2>

            <div style={{ position:'relative', width:'100%', aspectRatio:'4/3', background:'#000', borderRadius:8, overflow:'hidden', marginBottom:14 }}>
              {!photo ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scaleX(-1)' }}/>
              ) : (
                <img src={photo} alt="Selfie" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              )}
            </div>

            {!photo ? (
              <button className="btn btn-primary" onClick={capturePhoto} style={{ width:'100%', marginBottom:10 }}>Ambil Foto</button>
            ) : (
              <button className="btn btn-secondary" onClick={retake} style={{ width:'100%', marginBottom:10 }}>Ambil Ulang</button>
            )}

            {mode === 'check-in' && (
              <>
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Keterangan</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {KETERANGAN_OPTIONS.map(o => (
                      <button key={o.v} type="button" onClick={() => set({ keterangan:o.v })}
                        className={`btn ${keterangan===o.v?'btn-primary':'btn-secondary'}`} style={{ flex:1, fontSize:12, padding:'6px 8px' }}>{o.l}</button>
                    ))}
                  </div>
                </div>
                {keterangan !== 'normal' && (
                  <div style={{ marginBottom:10 }}>
                    <input className="input" placeholder="Catatan (opsional)" value={catatan} onChange={e => set({ catatan:e.target.value })}/>
                  </div>
                )}
              </>
            )}

            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button className="btn btn-secondary" onClick={closeCamera} style={{ flex:1 }} disabled={submitting}>Batal</button>
              <button className="btn btn-primary" onClick={submit} style={{ flex:1 }} disabled={!photo || submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
