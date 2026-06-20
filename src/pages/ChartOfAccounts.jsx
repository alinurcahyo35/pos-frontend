import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, BookOpen, X, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')

const JENIS_OPTIONS = [
  { jenis:'Kas', posisi:'Neraca', saldo_normal:'Debet', kategori:'Aset Lancar' },
  { jenis:'Bank', posisi:'Neraca', saldo_normal:'Debet', kategori:'Aset Lancar' },
  { jenis:'Piutang', posisi:'Neraca', saldo_normal:'Debet', kategori:'Aset Lancar' },
  { jenis:'Persediaan', posisi:'Neraca', saldo_normal:'Debet', kategori:'Aset Lancar' },
  { jenis:'Aktiva Tetap', posisi:'Neraca', saldo_normal:'Debet', kategori:'Aset Tetap' },
  { jenis:'Akumulasi Penyusutan', posisi:'Neraca', saldo_normal:'Debet', kategori:'Aset Tetap' },
  { jenis:'Hutang', posisi:'Neraca', saldo_normal:'Kredit', kategori:'Kewajiban' },
  { jenis:'Ekuitas', posisi:'Neraca', saldo_normal:'Kredit', kategori:'Modal' },
  { jenis:'Pendapatan', posisi:'Laba Rugi', saldo_normal:'Kredit', kategori:null },
  { jenis:'HPP', posisi:'Laba Rugi', saldo_normal:'Debet', kategori:null },
  { jenis:'Beban/Biaya', posisi:'Laba Rugi', saldo_normal:'Debet', kategori:null },
  { jenis:'Pendapatan Lainnya', posisi:'Laba Rugi', saldo_normal:'Kredit', kategori:null },
  { jenis:'Beban Lainnya', posisi:'Laba Rugi', saldo_normal:'Debet', kategori:null },
]

const JENIS_COLOR = {
  'Kas':'#0f6e56','Bank':'#185fa5','Piutang':'#534ab7','Persediaan':'#b45309',
  'Aktiva Tetap':'#6b6860','Akumulasi Penyusutan':'#9c9a93','Hutang':'#993c1d','Ekuitas':'#3c3489',
  'Pendapatan':'#0f6e56','HPP':'#993c1d','Beban/Biaya':'#993c1d','Pendapatan Lainnya':'#3b6d11','Beban Lainnya':'#712b13'
}

const emptyForm = { kode:'', nama:'', jenis:'Kas', posisi:'Neraca', saldo_normal:'Debet', kategori_neraca:'Aset Lancar', saldo_awal_debet:'0', saldo_awal_kredit:'0' }

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([])
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(emptyForm)
  const [editId,   setEditId]   = useState(null)

  useEffect(() => { load() }, [search])

  const load = async () => {
    try {
      const { data } = await api.get('/accounts', { params:{ q:search } })
      setAccounts(data || [])
    } catch { toast.error('Gagal memuat akun') }
  }

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setModal(true) }
  const openEdit = a => { setForm({ kode:a.kode, nama:a.nama, jenis:a.jenis, posisi:a.posisi, saldo_normal:a.saldo_normal, kategori_neraca:a.kategori_neraca||'', saldo_awal_debet:String(a.saldo_awal_debet||0), saldo_awal_kredit:String(a.saldo_awal_kredit||0) }); setEditId(a.id); setModal(true) }

  const handleJenisChange = jenis => {
    const opt = JENIS_OPTIONS.find(o => o.jenis === jenis)
    setForm(f => ({ ...f, jenis, posisi:opt.posisi, saldo_normal:opt.saldo_normal, kategori_neraca:opt.kategori||'' }))
  }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, saldo_awal_debet:parseFloat(form.saldo_awal_debet)||0, saldo_awal_kredit:parseFloat(form.saldo_awal_kredit)||0 }
    try {
      if (editId) { await api.put(`/accounts/${editId}`, payload); toast.success('Akun diperbarui') }
      else        { await api.post('/accounts', payload);          toast.success('Akun ditambahkan') }
      setModal(false); load()
    } catch(err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  const remove = async id => {
    if (!confirm('Hapus akun ini?')) return
    try { await api.delete(`/accounts/${id}`); toast.success('Dihapus'); load() }
    catch(err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  // Group by jenis for nicer display
  const grouped = {}
  accounts.forEach(a => { (grouped[a.jenis] = grouped[a.jenis]||[]).push(a) })

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--purple-50)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BookOpen size={20} color="var(--purple-600)"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Daftar Akun (COA)</h1>
            <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{accounts.length} akun terdaftar</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/accounts/export', 'daftar_akun.csv')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={15}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Tambah Akun
          </button>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:20, maxWidth:380 }}>
        <Search size={15} style={{ position:'absolute', left:12, top:11, color:'var(--text3)' }}/>
        <input className="input" style={{ paddingLeft:36 }} placeholder="Cari kode atau nama akun..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {Object.entries(grouped).map(([jenis, accs]) => (
        <div key={jenis} style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:JENIS_COLOR[jenis]||'#888' }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.6px' }}>{jenis}</span>
            <span style={{ fontSize:11, color:'var(--text3)' }}>· {accs.length} akun</span>
          </div>
          <div className="card" style={{ overflow:'hidden' }}>
            <table>
              <thead><tr>
                <th style={{ width:90 }}>Kode</th><th>Nama Akun</th><th>Posisi</th>
                <th style={{ textAlign:'right' }}>Saldo Awal Debet</th>
                <th style={{ textAlign:'right' }}>Saldo Awal Kredit</th>
                <th></th>
              </tr></thead>
              <tbody>
                {accs.map(a => (
                  <tr key={a.id}>
                    <td><span className="mono" style={{ fontWeight:600, fontSize:13 }}>{a.kode}</span></td>
                    <td style={{ fontWeight:600 }}>{a.nama}</td>
                    <td><span className={`badge ${a.posisi==='Neraca'?'badge-blue':'badge-teal'}`}>{a.posisi}</span></td>
                    <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13 }}>{a.saldo_awal_debet>0?fmt(a.saldo_awal_debet):'-'}</td>
                    <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13 }}>{a.saldo_awal_kredit>0?fmt(a.saldo_awal_kredit):'-'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => openEdit(a)} style={{ padding:'6px 10px' }}><Pencil size={13}/></button>
                        <button className="btn btn-danger" onClick={() => remove(a.id)} style={{ padding:'6px 10px' }}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {accounts.length === 0 && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Tidak ada akun ditemukan</div>
      )}

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:440, padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>{editId?'Edit':'Tambah'} Akun</h2>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={18}/></button>
            </div>
            <form onSubmit={save}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Kode Akun</label>
                  <input className="input mono" required placeholder="6xxxxx" value={form.kode} onChange={e => setForm(f=>({...f,kode:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Nama Akun</label>
                  <input className="input" required placeholder="Nama akun" value={form.nama} onChange={e => setForm(f=>({...f,nama:e.target.value}))}/>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Jenis Akun</label>
                <select className="input" value={form.jenis} onChange={e => handleJenisChange(e.target.value)}>
                  {JENIS_OPTIONS.map(o => <option key={o.jenis} value={o.jenis}>{o.jenis}</option>)}
                </select>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  Posisi: <strong>{form.posisi}</strong> · Saldo Normal: <strong>{form.saldo_normal}</strong>
                  {form.kategori_neraca && <> · Kategori: <strong>{form.kategori_neraca}</strong></>}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Saldo Awal Debet</label>
                  <input className="input" type="number" min="0" value={form.saldo_awal_debet} onChange={e => setForm(f=>({...f,saldo_awal_debet:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Saldo Awal Kredit</label>
                  <input className="input" type="number" min="0" value={form.saldo_awal_kredit} onChange={e => setForm(f=>({...f,saldo_awal_kredit:e.target.value}))}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} style={{ flex:1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
