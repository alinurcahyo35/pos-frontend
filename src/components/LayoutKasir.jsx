import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, Package, LogOut, Store, Fingerprint } from 'lucide-react'

export default function LayoutKasir() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}')

  const logout = () => {
    localStorage.removeItem('pos_token')
    localStorage.removeItem('pos_user')
    navigate('/login')
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <aside style={{ width:200, background:'#1a1916', display:'flex', flexDirection:'column', padding:'24px 0', position:'sticky', top:0, height:'100vh', flexShrink:0 }}>
        <div style={{ padding:'0 18px 24px', borderBottom:'1px solid #2c2c2a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:'#0f6e56', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Store size={16} color="white"/>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'-0.3px' }}>POS Kasir</div>
              <div style={{ color:'#9c9a93', fontSize:10, fontFamily:'DM Mono,monospace', textTransform:'uppercase', letterSpacing:'0.5px' }}>Point of Sale</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:'14px 10px' }}>
          {[
            { to:'/kasir', icon:ShoppingCart, label:'Kasir' },
            { to:'/stok',  icon:Package,      label:'Stok Produk' },
            { to:'/absensi', icon:Fingerprint, label:'Absensi' },
          ].map(({ to, icon:Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
              borderRadius:8, marginBottom:4, textDecoration:'none', fontSize:14, fontWeight:500,
              color: isActive ? 'white' : '#9c9a93',
              background: isActive ? '#2c2c2a' : 'transparent',
              transition:'all 0.15s'
            })}>
              <Icon size={17}/>{label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'14px 10px', borderTop:'1px solid #2c2c2a' }}>
          <div style={{ padding:'0 12px 10px', color:'#9c9a93', fontSize:12 }}>
            <div style={{ color:'white', fontWeight:600 }}>{user.name}</div>
            <div style={{ fontSize:11, marginTop:2 }}>Kasir</div>
          </div>
          <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:8, background:'transparent', color:'#9c9a93', fontSize:14, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'Plus Jakarta Sans,sans-serif' }}>
            <LogOut size={16}/>Keluar
          </button>
        </div>
      </aside>

      <main style={{ flex:1, overflow:'auto' }}>
        <Outlet/>
      </main>
    </div>
  )
}
