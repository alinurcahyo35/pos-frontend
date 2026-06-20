import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, FlaskConical, Download } from 'lucide-react'
import api from '../api'
import { downloadCsv } from '../exportCsv'
import ImportCsv from '../components/ImportCsv'
import toast from 'react-hot-toast'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const empty = { barcode: '', name: '', category: '', price: '', stock: '' }

export default function Produk() {
  const [products, setProducts] = useState([])
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(empty)
  const [editId, setEditId]     = useState(null)

  useEffect(() => { load() }, [search])

  const load = async () => {
    const { data } = await api.get('/products', { params: { q: search } })
    setProducts(data)
  }

  const openAdd  = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = p => { setForm({ ...p, price: String(p.price), stock: String(p.stock) }); setEditId(p.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) }
    try {
      if (editId) { await api.put(`/products/${editId}`, payload); toast.success('Produk diperbarui') }
      else        { await api.post('/products', payload);          toast.success('Produk ditambahkan') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
  }

  const remove = async id => {
    if (!confirm('Hapus produk ini?')) return
    await api.delete(`/products/${id}`)
    toast.success('Produk dihapus'); load()
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Manajemen Produk</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
            Stok <FlaskConical size={11} style={{ verticalAlign: 'middle' }} /> dihitung otomatis dari resep persediaan
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <ImportCsv templateEndpoint="/products/import-template" importEndpoint="/products/import"
            templateFilename="template_import_produk.csv" title="Produk" onSuccess={load}/>
          <button className="btn btn-secondary" onClick={() => downloadCsv('/products/export', 'produk.csv')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Tambah Produk
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text3)' }} />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="Cari nama atau barcode..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th style={{ textAlign: 'right' }}>Harga</th>
              <th style={{ textAlign: 'right' }}>Stok / Porsi</th>
              <th>Sumber Stok</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  {p.barcode && <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{p.barcode}</div>}
                </td>
                <td>{p.category ? <span className="badge badge-blue">{p.category}</span> : '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.price)}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`badge ${p.stock <= 0 ? 'badge-danger' : p.stock <= 3 ? 'badge-blue' : 'badge-teal'}`}>
                    {p.stock} {p.stock_source === 'resep' ? 'porsi' : 'pcs'}
                  </span>
                </td>
                <td>
                  {p.stock_source === 'resep'
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--teal)' }}><FlaskConical size={13} /> Dari resep</span>
                    : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Manual</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => openEdit(p)} style={{ padding: '6px 10px' }}><Pencil size={13} /></button>
                    <button className="btn btn-danger" onClick={() => remove(p.id)} style={{ padding: '6px 10px' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Belum ada produk</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ width: 420, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{editId ? 'Edit Produk' : 'Tambah Produk'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
              Stok awal hanya dipakai jika produk belum punya resep
            </p>
            <form onSubmit={save}>
              {[['Nama Produk','name','text',true],['Barcode','barcode','text',false],['Kategori','category','text',false]].map(([label,key,type,req]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                  <input className="input" type={type} required={req} placeholder={label}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Harga (Rp)</label>
                  <input className="input" type="number" required placeholder="0" min="0"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Stok Awal (manual)</label>
                  <input className="input" type="number" required placeholder="0" min="0"
                    value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
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
