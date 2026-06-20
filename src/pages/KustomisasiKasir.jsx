import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Candy, Snowflake, PlusCircle, ChevronDown } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')

const TIPE_CONFIG = {
  sugar: {
    label: 'Sugar Level',
    icon: Candy,
    color: '#b45309',
    bg: '#fff8e1',
    border: '#f59e0b44',
    desc: 'HPP dihitung otomatis: pilih ingredient gula dari Persediaan, lalu set gramasi per level. HPP = buy_price/buy_qty × gramasi. Harga jual ke customer tetap sama.',
  },
  ice: {
    label: 'Ice Level',
    icon: Snowflake,
    color: '#185fa5',
    bg: '#eef6ff',
    border: '#3b82f644',
    desc: 'Es batu dicatat sebagai COGS — tidak menambah harga jual, hanya muncul sebagai keterangan di nota. Tidak perlu set HPP.',
  },
  addon: {
    label: 'Add On',
    icon: PlusCircle,
    color: '#0f6e56',
    bg: '#f0fdf4',
    border: '#22c55e44',
    desc: 'Menu tambahan berbayar. Set harga jual per Add On. Kasir bisa pilih lebih dari satu. Langsung menambah total transaksi dan tampil di nota.',
  },
}

const emptyForm = { tipe: 'sugar', nama: '', harga: '0', urutan: '0', ingredient_id: '', qty_gram: '' }

export default function KustomisasiKasir() {
  const [options,      setOptions]      = useState([])
  const [ingredients,  setIngredients]  = useState([])
  const [loading,      setLoading]      = useState(false)
  const [modal,        setModal]        = useState(false)
  const [form,         setForm]         = useState(emptyForm)
  const [editId,       setEditId]       = useState(null)
  const [activeTab,    setActiveTab]    = useState('sugar')
  const [previewHpp,   setPreviewHpp]   = useState(0)

  useEffect(() => { load(); loadIngredients() }, [])

  // Kalkulasi preview HPP saat form sugar berubah
  useEffect(() => {
    if (form.tipe === 'sugar' && form.ingredient_id && form.qty_gram) {
      const ing = ingredients.find(i => String(i.id) === String(form.ingredient_id))
      if (ing && ing.buy_qty > 0) {
        const pricePerUnit = ing.buy_price / ing.buy_qty
        setPreviewHpp(Math.round(pricePerUnit * parseFloat(form.qty_gram||0)))
      } else setPreviewHpp(0)
    } else setPreviewHpp(0)
  }, [form.ingredient_id, form.qty_gram, form.tipe, ingredients])

  const load = async () => {
    setLoading(true)
    try { const { data } = await api.get('/customizations'); setOptions(data) }
    catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }

  const loadIngredients = async () => {
    try { const { data } = await api.get('/customizations/ingredients'); setIngredients(data) }
    catch {}
  }

  const openAdd = () => {
    const existing = options.filter(o => o.tipe === activeTab)
    setForm({ ...emptyForm, tipe: activeTab, urutan: String(existing.length + 1) })
    setEditId(null); setModal(true)
  }

  const openEdit = o => {
    setForm({
      tipe: o.tipe, nama: o.nama,
      harga: String(o.harga||0), urutan: String(o.urutan||0),
      ingredient_id: String(o.ingredient_id||''), qty_gram: String(o.qty_gram||''),
    })
    setEditId(o.id); setModal(true)
  }

  const save = async e => {
    e.preventDefault()
    if (form.tipe === 'sugar' && (!form.ingredient_id || !form.qty_gram)) {
      toast.error('Pilih ingredient gula dan isi gramasi'); return
    }
    const payload = {
      tipe: form.tipe, nama: form.nama, urutan: parseInt(form.urutan)||0,
      harga: parseFloat(form.harga)||0,
      ingredient_id: form.ingredient_id ? parseInt(form.ingredient_id) : null,
      qty_gram: parseFloat(form.qty_gram)||0,
    }
    try {
      if (editId) { await api.put(`/customizations/${editId}`, { ...payload, aktif: 1 }); toast.success('Diperbarui') }
      else        { await api.post('/customizations', payload); toast.success('Ditambahkan') }
      setModal(false); load()
    } catch(err) { toast.error(err.response?.data?.error || 'Gagal') }
  }

  const hapus = async id => {
    if (!confirm('Hapus opsi ini?')) return
    await api.delete(`/customizations/${id}`)
    toast.success('Dihapus'); load()
  }

  const toggleAktif = async o => {
    await api.put(`/customizations/${o.id}`, {
      tipe: o.tipe, nama: o.nama, harga: o.harga, urutan: o.urutan,
      ingredient_id: o.ingredient_id, qty_gram: o.qty_gram, aktif: o.aktif ? 0 : 1,
    })
    load()
  }

  const tabs    = ['sugar', 'ice', 'addon']
  const filtered = options.filter(o => o.tipe === activeTab).sort((a,b) => a.urutan - b.urutan)
  const cfg      = TIPE_CONFIG[activeTab]
  const CfgIcon  = cfg.icon

  // Ingredient terpilih untuk preview
  const selectedIng = ingredients.find(i => String(i.id) === String(form.ingredient_id))

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Kustomisasi Kasir</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
          Kelola pilihan Sugar Level, Ice Level, dan Add On yang muncul di kasir
        </p>
      </div>

      {/* Tab tipe */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => {
          const c = TIPE_CONFIG[t]; const TIcon = c.icon
          const count = options.filter(o => o.tipe === t).length
          return (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 10, border: `2px solid ${activeTab===t ? c.color : 'var(--border)'}`,
              background: activeTab===t ? c.bg : 'var(--card)',
              color: activeTab===t ? c.color : 'var(--text2)',
              fontWeight: activeTab===t ? 700 : 500, fontSize: 13,
              cursor: 'pointer', fontFamily: 'Plus Jakarta Sans,sans-serif', transition: 'all 0.15s',
            }}>
              <TIcon size={15}/>
              {c.label}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: activeTab===t ? c.color : 'var(--bg)',
                color: activeTab===t ? '#fff' : 'var(--text3)',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Info banner */}
      <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
        <CfgIcon size={16} color={cfg.color} style={{ marginTop: 1, flexShrink: 0 }}/>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{cfg.desc}</div>
      </div>

      {/* Tombol tambah */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14}/> Tambah {cfg.label}
        </button>
      </div>

      {/* Tabel */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Memuat...</div>
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                Belum ada opsi {cfg.label}.
              </div>
            : <table>
                <thead><tr>
                  <th>#</th>
                  <th>Nama Level</th>
                  {activeTab === 'sugar' && <><th>Ingredient Gula</th><th style={{textAlign:'right'}}>Gramasi</th><th style={{textAlign:'right'}}>HPP Otomatis</th></>}
                  {activeTab === 'addon' && <th style={{textAlign:'right'}}>Harga Jual</th>}
                  {activeTab === 'ice'   && <th>Keterangan</th>}
                  <th>Status</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {filtered.map(o => {
                    const ing = ingredients.find(i => i.id === o.ingredient_id)
                    return (
                      <tr key={o.id} style={{ opacity: o.aktif ? 1 : 0.45 }}>
                        <td><span className="badge badge-blue" style={{fontSize:11}}>#{o.urutan}</span></td>
                        <td style={{ fontWeight: 600 }}>{o.nama}</td>

                        {activeTab === 'sugar' && <>
                          <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                            {ing ? <><span style={{fontWeight:600}}>{ing.name}</span> <span style={{color:'var(--text3)'}}>({ing.unit})</span></> : <span style={{color:'var(--text3)'}}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'DM Mono,monospace', fontSize: 13 }}>
                            {o.qty_gram > 0 ? `${o.qty_gram} ${ing?.unit||''}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: (o.hpp_calculated||0) > 0 ? 'var(--teal)' : 'var(--text3)' }}>
                            {(o.hpp_calculated||0) > 0 ? fmt(o.hpp_calculated) : '—'}
                          </td>
                        </>}

                        {activeTab === 'addon' && (
                          <td style={{ textAlign: 'right', fontWeight: 700, color: (o.harga||0) > 0 ? 'var(--teal)' : 'var(--text3)' }}>
                            {(o.harga||0) > 0 ? `+ ${fmt(o.harga)}` : 'Gratis'}
                          </td>
                        )}

                        {activeTab === 'ice' && (
                          <td style={{ fontSize: 12, color: 'var(--text3)' }}>Keterangan di nota saja</td>
                        )}

                        <td>
                          <button onClick={() => toggleAktif(o)} style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            border: 'none', cursor: 'pointer',
                            background: o.aktif ? '#dcfce7' : '#fee2e2',
                            color: o.aktif ? '#166534' : '#991b1b',
                          }}>{o.aktif ? '✓ Aktif' : '✗ Nonaktif'}</button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => openEdit(o)} style={{ padding: '6px 10px' }}><Pencil size={13}/></button>
                            <button className="btn btn-danger" onClick={() => hapus(o.id)} style={{ padding: '6px 10px' }}><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
        }
      </div>

      {/* Preview kasir */}
      {filtered.filter(o => o.aktif).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Preview — tampilan di kasir
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CfgIcon size={14}/> {cfg.label}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {filtered.filter(o => o.aktif).map(o => (
                <div key={o.id} style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: `1.5px solid ${cfg.color}40`, background: cfg.bg,
                  fontSize: 13, fontWeight: 600, color: cfg.color,
                }}>
                  {o.nama}
                  {activeTab === 'addon' && (o.harga||0) > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, color: 'var(--text2)' }}>+{fmt(o.harga)}</span>
                  )}
                  {activeTab === 'sugar' && (o.hpp_calculated||0) > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, color: 'var(--text3)' }}>HPP {fmt(o.hpp_calculated)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ width: 460, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
              {editId ? 'Edit' : 'Tambah'} {TIPE_CONFIG[form.tipe]?.label}
            </h2>
            <form onSubmit={save}>
              {/* Tipe — hanya tampil saat tambah */}
              {!editId && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipe</label>
                  <select className="input" value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value, ingredient_id: '', qty_gram: '' }))}>
                    {tabs.map(t => <option key={t} value={t}>{TIPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Nama Level</label>
                  <input className="input" required
                    placeholder={form.tipe==='sugar'?'cth: Less Sugar':form.tipe==='ice'?'cth: No Ice':'cth: Topping Nata'}
                    value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}/>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Urutan Tampil</label>
                  <input className="input" type="number" min="0" value={form.urutan}
                    onChange={e => setForm(f => ({ ...f, urutan: e.target.value }))}/>
                </div>
              </div>

              {/* Sugar: ingredient + qty */}
              {form.tipe === 'sugar' && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                      Ingredient Gula <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select className="input" required value={form.ingredient_id}
                      onChange={e => setForm(f => ({ ...f, ingredient_id: e.target.value }))}>
                      <option value="">-- Pilih dari Persediaan --</option>
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit}) — beli {fmt(i.buy_price)}/{i.buy_qty}{i.buy_unit||i.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                      Gramasi per cup {selectedIng ? <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({selectedIng.unit})</span> : ''} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input className="input" type="number" min="0" step="0.1" required
                      placeholder={`cth: 10`}
                      value={form.qty_gram} onChange={e => setForm(f => ({ ...f, qty_gram: e.target.value }))}/>
                  </div>

                  {/* Preview HPP kalkulasi */}
                  {previewHpp > 0 && selectedIng && (
                    <div style={{ background: '#fff8e1', border: '1px solid #f59e0b44', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#b45309', marginBottom: 4 }}>HPP Kalkulasi Otomatis</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                        <span style={{ fontFamily: 'DM Mono,monospace' }}>
                          {fmt(selectedIng.buy_price)}/{selectedIng.buy_qty}{selectedIng.buy_unit||selectedIng.unit} × {form.qty_gram}{selectedIng.unit}
                        </span>
                        {' = '}
                        <strong style={{ color: '#b45309', fontSize: 14 }}>{fmt(previewHpp)}</strong>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Add On: harga jual */}
              {form.tipe === 'addon' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Harga Jual Tambahan (Rp)</label>
                  <input className="input" type="number" min="0" value={form.harga}
                    onChange={e => setForm(f => ({ ...f, harga: e.target.value }))}/>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Langsung menambah total transaksi kasir</div>
                </div>
              )}

              {/* Ice: info saja */}
              {form.tipe === 'ice' && (
                <div style={{ background: '#eef6ff', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#185fa5' }}>
                  ❄️ Ice level hanya keterangan di nota — tidak ada harga atau HPP yang perlu diset.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} style={{ flex: 1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
