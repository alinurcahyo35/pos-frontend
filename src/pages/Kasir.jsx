import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, FlaskConical, Package, Printer, ShoppingBag, Candy, Snowflake, PlusCircle, X, Check } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import Receipt from '../components/Receipt'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const kasirUser = () => JSON.parse(localStorage.getItem('pos_user') || '{}')

// ── Popup Kustomisasi Produk ──
function CustomizationPopup({ product, customOptions, onConfirm, onCancel }) {
  const sugarOpts = customOptions.filter(o => o.tipe === 'sugar' && o.aktif)
  const iceOpts   = customOptions.filter(o => o.tipe === 'ice'   && o.aktif)
  const addonOpts = customOptions.filter(o => o.tipe === 'addon' && o.aktif)

  const [sugar,  setSugar]  = useState(sugarOpts.find(o => o.nama === 'Normal') || sugarOpts[0] || null)
  const [ice,    setIce]    = useState(iceOpts.find(o => o.nama === 'Normal Ice') || iceOpts[0] || null)
  const [addons, setAddons] = useState([])
  const [qty,    setQty]    = useState(1)

  const toggleAddon = o => setAddons(a => a.find(x => x.id === o.id) ? a.filter(x => x.id !== o.id) : [...a, o])

  // Sugar TIDAK menambah harga jual ke customer, hanya HPP
  const addonCost  = addons.reduce((s, a) => s + (a.harga || 0), 0)
  const unitPrice  = product.price + addonCost   // sugar tidak tambah harga jual
  const sugarHpp   = sugar?.hpp_calculated || 0  // HPP tambahan dari sugar
  const totalPrice = unitPrice * qty

  const confirm = () => {
    const customizations = {
      sugar:  sugar  ? { id: sugar.id,  nama: sugar.nama,  hpp: sugarHpp } : null,
      ice:    ice    ? { id: ice.id,    nama: ice.nama } : null,
      addons: addons.map(a => ({ id: a.id, nama: a.nama, harga: a.harga||0 })),
      sugar_hpp: sugarHpp,  // disimpan untuk perhitungan HPP total di backend
    }
    const parts = []
    if (sugar) parts.push(sugar.nama)
    if (ice)   parts.push(ice.nama)
    addons.forEach(a => parts.push(`${a.nama}${(a.harga||0) > 0 ? ` (+${fmt(a.harga)})` : ''}`))
    customizations.keterangan = parts.join(', ')

    onConfirm({ ...product, price: unitPrice, customizations, quantity: qty })
  }

  const BtnOpt = ({ selected, onClick, children, color, bg }) => (
    <button type="button" onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 8, border: `2px solid ${selected ? color : 'var(--border)'}`,
      background: selected ? bg : 'var(--card)', color: selected ? color : 'var(--text2)',
      fontWeight: selected ? 700 : 500, fontSize: 12, cursor: 'pointer',
      fontFamily: 'Plus Jakarta Sans,sans-serif', transition: 'all 0.15s',
    }}>{children}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 420, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{product.name}</div>
            <div style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>{fmt(product.price)}</div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18}/></button>
        </div>

        {/* Sugar Level */}
        {sugarOpts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Candy size={13}/> Sugar Level
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sugarOpts.map(o => (
                <BtnOpt key={o.id} selected={sugar?.id === o.id} onClick={() => setSugar(o)} color="#b45309" bg="#fff8e1">
                  {o.nama}{(o.harga||0) > 0 && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 3 }}>+{fmt(o.harga)}</span>}
                </BtnOpt>
              ))}
            </div>
          </div>
        )}

        {/* Ice Level */}
        {iceOpts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#185fa5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Snowflake size={13}/> Ice Level
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {iceOpts.map(o => (
                <BtnOpt key={o.id} selected={ice?.id === o.id} onClick={() => setIce(o)} color="#185fa5" bg="#eef6ff">
                  {o.nama}
                </BtnOpt>
              ))}
            </div>
          </div>
        )}

        {/* Add On */}
        {addonOpts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f6e56', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={13}/> Add On <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text3)' }}>(pilih beberapa)</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {addonOpts.map(o => {
                const sel = addons.find(a => a.id === o.id)
                return (
                  <BtnOpt key={o.id} selected={!!sel} onClick={() => toggleAddon(o)} color="#0f6e56" bg="#f0fdf4">
                    {sel && <Check size={11} style={{ marginRight: 3 }}/>}
                    {o.nama}{(o.harga||0) > 0 && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 3 }}>+{fmt(o.harga)}</span>}
                  </BtnOpt>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
          {/* Qty */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Jumlah</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={13}/></button>
              <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q+1))} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={13}/></button>
            </div>
          </div>

          {/* Ringkasan harga — hanya addon yang tambah harga jual */}
          {addonCost > 0 && (
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: 'var(--text2)' }}>Harga dasar</span><span>{fmt(product.price)}</span>
              </div>
              {addons.map(a => (a.harga||0) > 0 && (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#0f6e56' }}>+ {a.nama}</span>
                  <span style={{ color: '#0f6e56' }}>+{fmt(a.harga)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 3, fontWeight: 700 }}>
                <span>Harga per item</span><span>{fmt(unitPrice)}</span>
              </div>
            </div>
          )}
          {/* Info HPP sugar — tidak tampil ke customer */}
          {sugarHpp > 0 && (
            <div style={{ background: '#fff8e1', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#92400e' }}>
              🧾 HPP gula ({sugar?.nama}): <strong>{fmt(sugarHpp)}</strong> — dicatat otomatis, tidak menambah harga jual
            </div>
          )}

          <button className="btn btn-primary" onClick={confirm} style={{ width: '100%', padding: '12px', fontSize: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <Check size={16}/> Tambah ke Keranjang · {fmt(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Kasir() {
  const [products, setProducts] = useState([])
  const [cart, setCart]         = useState([])
  const [search, setSearch]     = useState('')
  const [session, setSession]   = useState(null)
  const [payModal, setPayModal] = useState(false)
  const [payment, setPayment]   = useState({ method:'tunai', amount:'' })
  const [loading, setLoading]   = useState(false)
  const [receipt, setReceipt]   = useState(null)
  const [packingPrices, setPackingPrices] = useState([])
  const [packingQty, setPackingQty]       = useState({})
  const [profile, setProfile]   = useState(null)
  const [aggregatorSettings, setAggregatorSettings] = useState([])
  const [aggregatorFee, setAggregatorFee] = useState('')
  const [customOptions, setCustomOptions] = useState([])
  const [custPopup, setCustPopup] = useState(null) // produk yang sedang dipilih
  const receiptRef = useRef(null)

  useEffect(() => { loadProducts(); checkSession(); loadPackingPrices(); loadProfile(); loadAggregatorSettings(); loadCustomOptions() }, [])
  useEffect(() => { const d = setTimeout(()=>loadProducts(),300); return ()=>clearTimeout(d) }, [search])

  const loadCustomOptions = async () => {
    try { const { data } = await api.get('/customizations'); setCustomOptions(data.filter(o => o.aktif)) }
    catch { /* opsional, kasir tetap bisa transaksi */ }
  }

  const loadAggregatorSettings = async () => {
    try { const { data } = await api.get('/aggregator-settings'); setAggregatorSettings(data) } catch {}
  }

  const loadProfile = async () => {
    try { const { data } = await api.get('/profile'); setProfile(data) } catch {}
  }

  const loadPackingPrices = async () => {
    try { const { data } = await api.get('/ingredients/packing'); setPackingPrices(data) } catch {}
  }

  const loadProducts = async () => {
    try { const { data } = await api.get('/products', { params:{q:search} }); setProducts(data) }
    catch { toast.error('Gagal memuat produk') }
  }

  const [sessionModal, setSessionModal] = useState(false)
  const [openingCash, setOpeningCash]   = useState('')
  const [openingOutlet, setOpeningOutlet] = useState('')

  const checkSession = async () => {
    try {
      const { data } = await api.get('/sessions/active')
      if (data) { setSession(data); return }
      setSessionModal(true)
    } catch { toast.error('Gagal memeriksa sesi') }
  }

  const openSession = async () => {
    if (!openingOutlet) { toast.error('Pilih outlet terlebih dahulu'); return }
    try {
      const { data } = await api.post('/sessions/open', { opening_cash: parseFloat(openingCash)||0, outlet: openingOutlet })
      setSession(data); setSessionModal(false)
      toast.success(`Sesi dibuka - ${openingOutlet}`)
    } catch { toast.error('Gagal membuka sesi') }
  }

  // Klik produk → buka popup kustomisasi jika ada opsi, langsung tambah jika tidak
  const clickProduct = p => {
    if (p.stock === 0) { toast.error('Stok / bahan habis'); return }
    const hasOptions = customOptions.some(o => o.aktif)
    if (hasOptions) {
      setCustPopup(p)
    } else {
      addToCartDirect(p, 1, null)
    }
  }

  const addToCartDirect = (p, qty, customizations) => {
    const unitPrice = p.price
    setCart(c => {
      // Jika ada customizations, selalu tambah sebagai item baru (bisa beda konfigurasi)
      if (customizations) {
        const key = `${p.id}_${customizations.keterangan}`
        const ex  = c.find(i => i._key === key)
        if (ex) return c.map(i => i._key === key ? { ...i, quantity: i.quantity + qty } : i)
        return [...c, { ...p, price: unitPrice, quantity: qty, customizations, _key: key }]
      }
      const ex = c.find(i => i.id === p.id && !i.customizations)
      if (ex) {
        if (ex.quantity >= p.stock) { toast.error(`Maksimal ${p.stock} porsi`); return c }
        return c.map(i => i.id === p.id && !i.customizations ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...c, { ...p, quantity: qty }]
    })
  }

  const onCustomizationConfirm = item => {
    setCustPopup(null)
    const stock = custPopup?.stock || 99
    if (item.quantity > stock) { toast.error(`Stok tidak cukup`); return }
    addToCartDirect(item, item.quantity, item.customizations)
    toast.success(`${item.name} ditambahkan`)
  }

  const updateQty  = (key, delta) => setCart(c => c.map(i => i._key === key || i.id === key
    ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
  const removeItem = key => setCart(c => c.filter(i => (i._key || i.id) !== key))

  useEffect(() => {
    if (receipt) { const t = setTimeout(() => window.print(), 200); return () => clearTimeout(t) }
  }, [receipt])

  const subtotal = cart.reduce((s,i) => s + i.price * i.quantity, 0)
  const total    = subtotal

  const packingCost = Object.entries(packingQty).reduce((s,[id,qty]) => {
    const p = packingPrices.find(pp => pp.id === parseInt(id))
    return s + (p ? p.unit_price * (qty||0) : 0)
  }, 0)

  const AGGREGATOR_METHODS = ['gofood','shopeefood','grabfood']
  const AGGREGATOR_LABEL   = { gofood:'GoFood', shopeefood:'ShopeeFood', grabfood:'GrabFood' }

  const selectAggregator = method => {
    const platform   = AGGREGATOR_LABEL[method]
    const setting    = aggregatorSettings.find(s => s.platform === platform)
    const defaultFee = setting ? Math.round(total * setting.default_fee_percent / 100) : 0
    setPayment(p => ({ ...p, method, amount: String(total) }))
    setAggregatorFee(String(defaultFee))
  }

  const selectNonAggregator = method => {
    setPayment(p => ({ ...p, method }))
    setAggregatorFee('')
  }

  const isAggregator = AGGREGATOR_METHODS.includes(payment.method)

  const processPayment = async () => {
    if (!session) { toast.error('Tidak ada sesi aktif'); return }
    const paid = parseFloat(payment.amount)
    if (!paid || paid < total) { toast.error('Jumlah bayar kurang'); return }
    setLoading(true)
    try {
      const packing_detail = Object.entries(packingQty)
        .filter(([,qty]) => qty > 0)
        .map(([id,qty]) => ({ ingredient_id: parseInt(id), qty: parseFloat(qty) }))

      const payload = {
        session_id: session.id,
        items: cart.map(i => ({
          id: i.id, name: i.name, price: i.price, quantity: i.quantity,
          customizations: i.customizations || null,
        })),
        payment_method: payment.method, amount_paid: paid, discount: 0, tax: 0,
        packing_detail,
      }
      if (isAggregator) {
        payload.aggregator_name = AGGREGATOR_LABEL[payment.method]
        payload.aggregator_fee  = parseFloat(aggregatorFee) || 0
      }

      const { data } = await api.post('/transactions', payload)
      setReceipt({ ...data, cartItems: cart, paid, change: paid - total })
      setCart([]); setPayModal(false); setPayment({ method:'tunai', amount:'' })
      setPackingQty({}); setAggregatorFee('')
      loadProducts(); toast.success('Transaksi berhasil!')
    } catch(err) { toast.error(err.response?.data?.error || 'Transaksi gagal') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display:'flex', height:'100vh' }}>
      {/* Popup Kustomisasi */}
      {custPopup && (
        <CustomizationPopup
          product={custPopup}
          customOptions={customOptions}
          onConfirm={onCustomizationConfirm}
          onCancel={() => setCustPopup(null)}
        />
      )}

      {/* Panel kiri: produk */}
      <div style={{ flex:1, padding:24, overflow:'auto' }}>
        <div style={{ marginBottom:20, display:'flex', gap:12, alignItems:'center' }}>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Kasir</h1>
          {session && <span className="badge badge-teal">Sesi #{session.id} · {session.outlet||'Outlet belum dipilih'}</span>}
        </div>
        <div style={{ position:'relative', marginBottom:16 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:11, color:'var(--text3)' }}/>
          <input className="input" style={{ paddingLeft:36 }} placeholder="Cari produk atau scan barcode..."
            value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
          {products.map(p=>(
            <button key={p.id} onClick={()=>clickProduct(p)} style={{
              background:p.stock===0?'#f5f5f5':'var(--card)',
              border:'1px solid var(--border)', borderRadius:10, padding:'14px 12px',
              textAlign:'left', cursor:p.stock===0?'not-allowed':'pointer',
              opacity:p.stock===0?0.6:1, transition:'all 0.15s', fontFamily:'Plus Jakarta Sans,sans-serif'
            }}
            onMouseEnter={e=>{if(p.stock>0)e.currentTarget.style.borderColor='var(--teal)'}}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
            >
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4, lineHeight:1.3 }}>{p.name}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--teal)' }}>{fmt(p.price)}</div>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                {p.stock_source==='resep' && <FlaskConical size={11} color="var(--text3)"/>}
                <span style={{ fontSize:11, color:p.stock<=2?'var(--danger)':'var(--text3)' }}>
                  {p.stock_source==='resep'?`${p.stock} porsi`:`Stok: ${p.stock}`}
                </span>
              </div>
            </button>
          ))}
          {products.length===0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'var(--text3)' }}>Produk tidak ditemukan</div>}
        </div>
      </div>

      {/* Panel kanan: keranjang */}
      <div style={{ width:340, background:'var(--card)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0 }}>
        <div style={{ padding:'20px 20px 14px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Keranjang</div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{cart.length} item</div>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'12px 16px' }}>
          {cart.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:13 }}>Belum ada item</div>
            : cart.map(item => {
              const key = item._key || item.id
              return (
                <div key={key} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                      <div style={{ fontSize:12, color:'var(--teal)', marginTop:2 }}>{fmt(item.price)}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <button onClick={()=>updateQty(key,-1)} style={{ width:26, height:26, borderRadius:6, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}><Minus size={12}/></button>
                      <span style={{ fontSize:13, fontWeight:600, minWidth:20, textAlign:'center' }}>{item.quantity}</span>
                      <button onClick={()=>updateQty(key,1)} style={{ width:26, height:26, borderRadius:6, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}><Plus size={12}/></button>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, minWidth:72, textAlign:'right' }}>{fmt(item.price*item.quantity)}</div>
                    <button onClick={()=>removeItem(key)} style={{ background:'none', border:'none', color:'var(--text3)', padding:4, cursor:'pointer' }}><Trash2 size={14}/></button>
                  </div>
                  {/* Keterangan kustomisasi */}
                  {item.customizations?.keterangan && (
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, paddingLeft:2, fontStyle:'italic' }}>
                      📝 {item.customizations.keterangan}
                    </div>
                  )}
                </div>
              )
            })
          }
        </div>
        <div style={{ padding:16, borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color:'var(--text2)', fontSize:13 }}>Subtotal</span>
            <span style={{ fontSize:13 }}>{fmt(subtotal)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>Total</span>
            <span style={{ fontWeight:700, fontSize:18, color:'var(--teal)' }}>{fmt(total)}</span>
          </div>
          <button className="btn btn-primary" disabled={cart.length===0}
            onClick={()=>{setPayModal(true);setPayment({method:'tunai',amount:String(total)})}}
            style={{ width:'100%', padding:'12px', fontSize:15 }}>
            Bayar Sekarang
          </button>
          {cart.length>0 && <button className="btn btn-secondary" onClick={()=>setCart([])} style={{ width:'100%', marginTop:8, padding:'9px' }}>Batal</button>}
        </div>
      </div>

      {/* Modal Pembayaran */}
      {payModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:380, padding:28 }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Pembayaran</h2>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:8 }}>Metode</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[['tunai','Tunai',Banknote],['kartu','Kartu',CreditCard],['qris','QRIS',QrCode]].map(([v,l,Icon])=>(
                  <button key={v} onClick={()=>selectNonAggregator(v)} style={{
                    padding:'10px 8px', borderRadius:8, border:'2px solid',
                    borderColor:payment.method===v?'var(--teal)':'var(--border)',
                    background:payment.method===v?'var(--teal-light)':'var(--card)',
                    color:payment.method===v?'var(--teal-dark)':'var(--text2)',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer',
                    fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:12, fontWeight:600
                  }}><Icon size={18}/>{l}</button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:8 }}>
                {[['gofood','GoFood'],['shopeefood','ShopeeFood'],['grabfood','GrabFood']].map(([v,l])=>(
                  <button key={v} onClick={()=>selectAggregator(v)} style={{
                    padding:'10px 8px', borderRadius:8, border:'2px solid',
                    borderColor:payment.method===v?'var(--teal)':'var(--border)',
                    background:payment.method===v?'var(--teal-light)':'var(--card)',
                    color:payment.method===v?'var(--teal-dark)':'var(--text2)',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer',
                    fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:11, fontWeight:600
                  }}><ShoppingBag size={16}/>{l}</button>
                ))}
              </div>
            </div>
            {isAggregator && (
              <div style={{ marginBottom:20, background:'var(--bg)', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontSize:13, color:'var(--text2)' }}>
                  Pesanan via <strong>{AGGREGATOR_LABEL[payment.method]}</strong> · potongan platform dihitung otomatis.
                </div>
              </div>
            )}
            {packingPrices.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <Package size={14}/> Packing <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400 }}>(opsional)</span>
                </label>
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${packingPrices.length},1fr)`, gap:8 }}>
                  {packingPrices.map(p => (
                    <div key={p.id} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>{p.name}</div>
                      <input type="number" min="0" max={p.stock} className="input" style={{ textAlign:'center', padding:'6px 4px' }}
                        value={packingQty[p.id]||''} placeholder="0"
                        onChange={e => {
                          const val = Math.min(parseFloat(e.target.value)||0, p.stock)
                          setPackingQty(q => ({ ...q, [p.id]: e.target.value===''?'':val }))
                        }}/>
                      <div style={{ fontSize:10, color: p.stock<=5?'var(--danger)':'var(--text3)', marginTop:2 }}>Stok: {p.stock}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>
                Total: <span style={{ color:'var(--teal)' }}>{fmt(total)}</span>
              </label>
              {!isAggregator && (
                <input className="input" type="number" placeholder="Jumlah bayar"
                  value={payment.amount} onChange={e=>setPayment(p=>({...p,amount:e.target.value}))}
                  style={{ fontSize:18, fontWeight:600 }}/>
              )}
              {isAggregator && (
                <div style={{ fontSize:12, color:'var(--text3)' }}>
                  Dicatat sebagai piutang ke platform.
                </div>
              )}
            </div>
            {!isAggregator && payment.amount && parseFloat(payment.amount)>=total && (
              <div style={{ background:'var(--teal-light)', borderRadius:8, padding:'12px 14px', marginBottom:20, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'var(--teal-dark)' }}>Kembalian</span>
                <span style={{ fontSize:18, fontWeight:700, color:'var(--teal-dark)' }}>{fmt(parseFloat(payment.amount)-total)}</span>
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" onClick={()=>setPayModal(false)} style={{ flex:1 }}>Batal</button>
              <button className="btn btn-primary" onClick={processPayment} disabled={loading} style={{ flex:1 }}>{loading?'Memproses...':'Konfirmasi'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses */}
      {receipt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:340, padding:24 }}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>✅ Transaksi Berhasil</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>#{receipt.id}</div>
            </div>
            <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:14, fontSize:13 }}>
              {receipt.cartItems.map((i,idx) => (
                <div key={idx} style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>{i.name} x{i.quantity}</span><span>{fmt(i.price*i.quantity)}</span>
                  </div>
                  {i.customizations?.keterangan && (
                    <div style={{ fontSize:11, color:'var(--text3)', paddingLeft:8, fontStyle:'italic' }}>
                      {i.customizations.keterangan}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, marginTop:8, display:'flex', justifyContent:'space-between', fontWeight:700 }}>
                <span>Total</span><span>{fmt(receipt.total)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, color:'var(--teal)', fontWeight:700 }}>
                <span>Kembalian</span><span>{fmt(receipt.change)}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary" onClick={()=>window.print()} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Printer size={15}/> Cetak Ulang
              </button>
              <button className="btn btn-primary" onClick={()=>setReceipt(null)} style={{ flex:1 }}>Selesai</button>
            </div>
          </div>
        </div>
      )}

      <Receipt ref={receiptRef} profile={profile} receipt={receipt} kasirName={kasirUser().name}/>

      {sessionModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div className="card" style={{ width:360, padding:28 }}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:4 }}>Buka Sesi Kasir</h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Pilih outlet dan isi kas awal untuk memulai shift</p>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Outlet</label>
            <select className="input" value={openingOutlet} onChange={e=>setOpeningOutlet(e.target.value)} style={{ marginBottom:14 }}>
              <option value="">-- Pilih Outlet --</option>
              {['Banjarsari Selatan','Tirto Agung','Veteran'].map(o => <option key={o}>{o}</option>)}
            </select>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Kas Awal (opsional)</label>
            <input className="input" type="number" placeholder="0" value={openingCash} onChange={e=>setOpeningCash(e.target.value)} style={{ marginBottom:20 }}/>
            <button className="btn btn-primary" onClick={openSession} style={{ width:'100%' }}>Buka Sesi</button>
          </div>
        </div>
      )}
    </div>
  )
}
