import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, Save, FlaskConical } from 'lucide-react'
import api from '../api'
import ImportCsv from '../components/ImportCsv'
import toast from 'react-hot-toast'

export default function Resep() {
  const [products,     setProducts]     = useState([])
  const [ingredients,  setIngredients]  = useState([])
  const [expanded,     setExpanded]     = useState(null)
  const [recipes,      setRecipes]      = useState({}) // { product_id: [{ ingredient_id, quantity }] }
  const [stockCheck,   setStockCheck]   = useState([])

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const [p, i, s] = await Promise.all([
      api.get('/products'),
      api.get('/ingredients'),
      api.get('/ingredients/check-stock')
    ])
    setProducts(p.data)
    setIngredients(i.data)
    setStockCheck(s.data)
  }

  const loadRecipe = async (productId) => {
    if (recipes[productId]) return // already loaded
    const { data } = await api.get(`/ingredients/recipes/${productId}`)
    setRecipes(r => ({ ...r, [productId]: data.map(d => ({ ingredient_id: String(d.ingredient_id), quantity: String(d.quantity) })) }))
  }

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    await loadRecipe(id)
  }

  const getRecipe = (productId) => recipes[productId] || []

  const addRow = (productId) => {
    setRecipes(r => ({
      ...r,
      [productId]: [...(r[productId] || []), { ingredient_id: '', quantity: '' }]
    }))
  }

  const updateRow = (productId, idx, field, value) => {
    setRecipes(r => {
      const updated = [...(r[productId] || [])]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...r, [productId]: updated }
    })
  }

  const removeRow = (productId, idx) => {
    setRecipes(r => {
      const updated = [...(r[productId] || [])]
      updated.splice(idx, 1)
      return { ...r, [productId]: updated }
    })
  }

  const saveRecipe = async (productId) => {
    const items = (recipes[productId] || []).filter(r => r.ingredient_id && r.quantity)
    if (items.length === 0 && !confirm('Simpan resep kosong? Ini akan menghapus semua item untuk produk ini.')) return
    try {
      await api.post(`/ingredients/recipes/${productId}`, {
        items: items.map(i => ({ ingredient_id: parseInt(i.ingredient_id), quantity: parseFloat(i.quantity) }))
      })
      toast.success('Resep disimpan!')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan')
    }
  }

  const getStockInfo = (productId) => stockCheck.find(s => s.id === productId)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Resep Produk</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
            Atur persediaan tiap produk. Stok persediaan otomatis berkurang saat terjual.
          </p>
        </div>
        <ImportCsv templateEndpoint="/ingredients/recipes/import-template" importEndpoint="/ingredients/recipes/import"
          templateFilename="template_import_resep.csv" title="Resep" onSuccess={loadAll}/>
      </div>

      {ingredients.length === 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #f9c74f', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13 }}>
          ⚠️ Belum ada persediaan. Tambahkan dulu di menu <strong>Persediaan</strong> sebelum membuat resep.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {products.map(product => {
          const info = getStockInfo(product.id)
          const isOpen = expanded === product.id
          const recipe = getRecipe(product.id)

          return (
            <div key={product.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div
                onClick={() => toggleExpand(product.id)}
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <FlaskConical size={16} color="var(--teal)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                  {info && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {info.recipe?.length > 0
                        ? `${info.recipe.length} item · bisa buat: `
                        : 'Belum ada resep'}
                      {info.recipe?.length > 0 && (
                        <span style={{
                          fontWeight: 700,
                          color: info.can_make === 0 ? 'var(--danger)' : info.can_make <= 3 ? '#b45309' : 'var(--teal)'
                        }}>
                          {info.can_make} porsi
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stock badge */}
                {info?.recipe?.length > 0 && (
                  <span className={`badge ${info.can_make === 0 ? 'badge-danger' : info.can_make <= 3 ? 'badge-blue' : 'badge-teal'}`}>
                    {info.can_make === 0 ? 'Persediaan habis' : `Bisa buat ${info.can_make}x`}
                  </span>
                )}

                {isOpen ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
              </div>

              {/* Recipe editor */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                  {recipe.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
                      Belum ada item. Klik "+ Tambah Item" untuk mulai.
                    </p>
                  )}

                  {recipe.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                      <select className="input" style={{ flex: 2 }}
                        value={row.ingredient_id}
                        onChange={e => updateRow(product.id, idx, 'ingredient_id', e.target.value)}>
                        <option value="">— Pilih item —</option>
                        {ingredients.map(i => (
                          <option key={i.id} value={i.id}>{i.name} (stok: {i.stock} {i.unit})</option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <input className="input" type="number" min="0.1" step="0.1" placeholder="Jumlah"
                          value={row.quantity}
                          onChange={e => updateRow(product.id, idx, 'quantity', e.target.value)}
                          style={{ flex: 1 }} />
                        <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 32 }}>
                          {ingredients.find(i => String(i.id) === String(row.ingredient_id))?.unit || ''}
                        </span>
                      </div>

                      <button className="btn btn-danger" onClick={() => removeRow(product.id, idx)}
                        style={{ padding: '7px 10px' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button className="btn btn-secondary" onClick={() => addRow(product.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={14} /> Tambah Item
                    </button>
                    <button className="btn btn-primary" onClick={() => saveRecipe(product.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Save size={14} /> Simpan Resep
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
            Belum ada produk. Tambahkan produk di menu Produk terlebih dahulu.
          </div>
        )}
      </div>
    </div>
  )
}
