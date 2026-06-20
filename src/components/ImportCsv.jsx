import { useState, useRef } from 'react'
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { downloadCsv } from '../exportCsv'

// Komponen modal untuk import massal CSV
// Props:
//   templateEndpoint: string - endpoint GET untuk download template (misal '/products/import-template')
//   importEndpoint: string - endpoint POST untuk upload (misal '/products/import')
//   templateFilename: string - nama file template yang akan didownload
//   title: string - judul modal
//   onSuccess: function - dipanggil setelah import berhasil (untuk reload data)
//   useRowsFormat: bool - apakah payload dikirim sebagai { rows: [] } (untuk assets) atau { csv_text: '...' }

export default function ImportCsv({ templateEndpoint, importEndpoint, templateFilename, title, onSuccess, useRowsFormat=false }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [filename, setFilename] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFilename(file.name)
    setResult(null)
    setLoading(true)

    try {
      const text = await file.text()
      let payload, response

      if (useRowsFormat) {
        // Parse CSV di frontend lalu kirim sebagai array of objects
        const rows = parseCsvToRows(text)
        response = await api.post(importEndpoint, { rows })
      } else {
        response = await api.post(importEndpoint, { csv_text: text })
      }

      setResult(response.data)
      if (response.data.success > 0) {
        toast.success(`${response.data.success} data berhasil diimport`)
        onSuccess?.()
      }
    } catch(err) {
      toast.error(err.response?.data?.error || 'Gagal mengimport data')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Parse CSV sederhana untuk format useRowsFormat (assets)
  const parseCsvToRows = (text) => {
    const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = clean.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim())
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g,'').trim())
      const obj = {}
      headers.forEach((h,idx) => { obj[h] = vals[idx]||'' })
      rows.push({
        nama: obj['Nama Aset'] || obj['nama'] || '',
        kategori: obj['Kategori'] || obj['kategori'] || 'Peralatan',
        tanggal_beli: obj['Tanggal Beli (YYYY-MM-DD)'] || obj['tanggal_beli'] || '',
        nilai_beli: parseFloat(obj['Nilai Beli'] || obj['nilai_beli'] || 0),
        nilai_residu: parseFloat(obj['Nilai Residu'] || obj['nilai_residu'] || 0),
        masa_manfaat: parseInt(obj['Masa Manfaat (Tahun)'] || obj['masa_manfaat'] || 1),
        keterangan: obj['Keterangan'] || obj['keterangan'] || '',
      })
    }
    return rows
  }

  const close = () => { setOpen(false); setResult(null); setFilename('') }

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)} style={{ display:'flex', alignItems:'center', gap:6 }}>
        <Upload size={15}/> Import CSV
      </button>

      {open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:480, padding:24, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Import Massal - {title}</h2>
              <button onClick={close} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text2)' }}><X size={18}/></button>
            </div>

            <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Langkah 1: Download template terlebih dahulu</div>
              <p style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>
                Template berisi kolom yang harus diisi beserta contoh data. Isi template ini di Excel/Google Sheets, lalu upload di langkah berikutnya.
              </p>
              <button className="btn btn-secondary" onClick={() => downloadCsv(templateEndpoint, templateFilename)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
                <Download size={14}/> Download Template CSV
              </button>
            </div>

            <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Langkah 2: Upload file CSV yang sudah diisi</div>
              <input type="file" accept=".csv" ref={fileRef} onChange={handleFile} disabled={loading}
                style={{ display:'block', fontSize:13, color:'var(--text)' }}/>
              {filename && <div style={{ fontSize:12, color:'var(--text2)', marginTop:6 }}>File: {filename}</div>}
              {loading && <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Sedang memproses...</div>}
            </div>

            {result && (
              <div style={{ borderRadius:8, border:'1px solid var(--border)', overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', background: result.errors?.length ? '#fef3c7' : 'var(--teal-light)', display:'flex', alignItems:'center', gap:8 }}>
                  <CheckCircle size={16} color="var(--teal)"/>
                  <span style={{ fontSize:13, fontWeight:600 }}>{result.success} data berhasil diimport</span>
                  {result.errors?.length > 0 && (
                    <span style={{ fontSize:12, color:'var(--danger)', marginLeft:4 }}>{result.errors.length} baris gagal</span>
                  )}
                </div>
                {result.errors?.length > 0 && (
                  <div style={{ padding:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:6, color:'var(--danger)' }}>Detail error:</div>
                    {result.errors.map((e,i) => (
                      <div key={i} style={{ fontSize:12, color:'var(--danger)', marginBottom:4, display:'flex', gap:8 }}>
                        <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }}/>
                        <span>Baris {e.baris}: <strong>{e.nama||e.produk||''}</strong> — {e.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button className="btn btn-secondary" onClick={close}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
