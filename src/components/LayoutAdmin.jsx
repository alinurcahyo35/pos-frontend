import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Package, BarChart2, Users, LogOut, Shield, Carrot, FlaskConical, TrendingUp, Building2, UserCheck, FileText, CreditCard, BookOpen, BookText, Scale, FileBarChart, ChevronRight, Truck, ShoppingCart, RotateCcw, ClipboardCheck, Fingerprint, Wallet, Percent, Box, ClipboardList, PanelLeftClose, PanelLeftOpen, Candy } from 'lucide-react'

export default function LayoutAdmin() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}')
  const logout = () => { localStorage.removeItem('pos_token'); localStorage.removeItem('pos_user'); navigate('/login') }
  const [collapsed, setCollapsed] = useState(false)

  const navGroups = [
    {
      label: 'Master Data',
      items: [
        { to:'/admin/profil',   icon:Building2,  label:'Profil Usaha' },
        { to:'/admin/produk',   icon:Package,    label:'Produk' },
        { to:'/admin/persediaan', icon:Carrot,   label:'Persediaan' },
        { to:'/admin/resep',    icon:FlaskConical, label:'Resep' },
        { to:'/admin/konsumen', icon:UserCheck,  label:'Konsumen' },
        { to:'/admin/pemasok',  icon:Truck,      label:'Pemasok' },
      ]
    },
    {
      label: 'Transaksi',
      items: [
        { to:'/admin/penjualan-kredit', icon:FileText,     label:'Penjualan Kredit' },
        { to:'/admin/form-project',     icon:ClipboardList, label:'Form Project' },
        { to:'/admin/hutang',           icon:CreditCard,   label:'Hutang' },
        { to:'/admin/pembelian',        icon:ShoppingCart, label:'Pembelian' },
        { to:'/admin/retur-pembelian',  icon:RotateCcw,     label:'Retur Pembelian' },
        { to:'/admin/pengajuan-pembelian', icon:ClipboardCheck, label:'Pengajuan Pembelian' },
        { to:'/admin/aset-tetap',       icon:Box,           label:'Aset Tetap' },
      ]
    },
    {
      label: 'Akuntansi',
      items: [
        { to:'/admin/coa',     icon:BookOpen,  label:'Daftar Akun (COA)' },
        { to:'/admin/jurnal',  icon:BookText,  label:'Jurnal Umum' },
        { to:'/admin/neraca',  icon:Scale,     label:'Neraca' },
        { to:'/admin/lr-akuntansi', icon:FileBarChart, label:'Laba Rugi (Akuntansi)' },
        { to:'/admin/cashflow', icon:Wallet,   label:'Cash Flow' },
      ]
    },
    {
      label: 'Laporan POS',
      items: [
        { to:'/admin/dashboard',  icon:BarChart2,  label:'Dashboard Performance' },
        { to:'/admin/lr-kasir',  icon:BarChart2,  label:'L/R Kasir' },
        { to:'/admin/lr-kredit', icon:TrendingUp, label:'L/R Penjualan Kredit' },
      ]
    },
    {
      label: 'Pengaturan',
      items: [
        { to:'/admin/pengguna', icon:Users, label:'Pengguna' },
        { to:'/admin/aggregator', icon:Percent, label:'Aggregator' },
        { to:'/admin/kustomisasi-kasir', icon:Candy, label:'Kustomisasi Kasir' },
        { to:'/admin/hr', icon:Fingerprint, label:'HR' },
        { to:'/admin/audit-log', icon:FileBarChart, label:'Audit Log' },
      ]
    }
  ]

  const allItems = navGroups.flatMap(g => g.items.map(i => ({...i, group:g.label})))
  const current = allItems.find(i => location.pathname.startsWith(i.to))

  const sidebarWidth = collapsed ? 60 : 236

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <aside style={{
        width: sidebarWidth,
        background:'linear-gradient(180deg, #1a1916 0%, #15140f 100%)',
        display:'flex', flexDirection:'column', padding:'22px 0', position:'sticky', top:0,
        height:'100vh', flexShrink:0, overflowY:'auto', overflowX:'hidden',
        transition:'width 0.22s cubic-bezier(0.4,0,0.2,1)'
      }}>
        {/* Header: logo + tombol toggle */}
        <div style={{ padding:`0 ${collapsed?10:20}px 20px`, borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
            {!collapsed && (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  background:'linear-gradient(135deg, #6c5ce7 0%, #534ab7 100%)', borderRadius:10, width:36, height:36,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  boxShadow:'0 2px 8px rgba(83,74,183,0.4)'
                }}>
                  <Shield size={18} color="white"/>
                </div>
                <div>
                  <div style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'-0.3px' }}>Superadmin</div>
                  <div style={{ color:'#7a7873', fontSize:10, fontFamily:'DM Mono,monospace', textTransform:'uppercase', letterSpacing:'0.6px' }}>Business Suite</div>
                </div>
              </div>
            )}
            {collapsed && (
              <div style={{
                background:'linear-gradient(135deg, #6c5ce7 0%, #534ab7 100%)', borderRadius:10, width:36, height:36,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 2px 8px rgba(83,74,183,0.4)'
              }}>
                <Shield size={18} color="white"/>
              </div>
            )}
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} title="Sembunyikan sidebar" style={{
                background:'none', border:'none', cursor:'pointer', color:'#54534f', padding:4, borderRadius:6,
                display:'flex', alignItems:'center', transition:'color 0.15s'
              }}
                onMouseEnter={e=>e.currentTarget.style.color='#9c9a93'}
                onMouseLeave={e=>e.currentTarget.style.color='#54534f'}>
                <PanelLeftClose size={18}/>
              </button>
            )}
          </div>
          {collapsed && (
            <div style={{ display:'flex', justifyContent:'center', marginTop:12 }}>
              <button onClick={() => setCollapsed(false)} title="Tampilkan sidebar" style={{
                background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', color:'#9c9a93',
                padding:6, borderRadius:6, display:'flex', alignItems:'center', transition:'all 0.15s'
              }}
                onMouseEnter={e=>e.currentTarget.style.color='white'}
                onMouseLeave={e=>e.currentTarget.style.color='#9c9a93'}>
                <PanelLeftOpen size={16}/>
              </button>
            </div>
          )}
        </div>

        <nav style={{ flex:1, padding:`14px ${collapsed?6:12}px` }}>
          {navGroups.map(group => (
            <div key={group.label} style={{ marginBottom: collapsed ? 8 : 18 }}>
              {!collapsed && (
                <div style={{ fontSize:10, fontWeight:700, color:'#54534f', textTransform:'uppercase', letterSpacing:'1px', padding:'0 12px', marginBottom:8 }}>{group.label}</div>
              )}
              {collapsed && <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'4px 6px 8px' }}/>}
              {group.items.map(({ to, icon:Icon, label }) => (
                <NavLink key={to} to={to} title={collapsed ? label : undefined} style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '9px 0' : '9px 12px',
                  borderRadius:8, marginBottom:2, textDecoration:'none', fontSize:13, fontWeight:500,
                  color: isActive ? 'white' : '#9c9a93',
                  background: isActive ? 'linear-gradient(135deg, #2d2c28 0%, #252420 100%)' : 'transparent',
                  borderLeft: isActive ? '2px solid #6c5ce7' : '2px solid transparent',
                  transition:'all 0.15s'
                })}>
                  <Icon size={16}/>
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding:`14px ${collapsed?6:12}px`, borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          {!collapsed && (
            <div style={{ padding:'0 12px 8px', color:'#9c9a93', fontSize:12 }}>
              <div style={{ color:'white', fontWeight:600 }}>{user.name}</div>
              <div style={{ fontSize:11, marginTop:2, textTransform:'capitalize' }}>{user.role === 'direksi' ? 'Direksi' : 'Administrator'}</div>
            </div>
          )}
          <button onClick={logout} title={collapsed ? 'Keluar' : undefined} style={{
            display:'flex', alignItems:'center', gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width:'100%', padding: collapsed ? '9px 0' : '9px 12px',
            borderRadius:8, background:'transparent', color:'#9c9a93', fontSize:13, fontWeight:500,
            cursor:'pointer', border:'none', fontFamily:'Plus Jakarta Sans,sans-serif'
          }}>
            <LogOut size={15}/>{!collapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Top bar dengan breadcrumb + tombol buka sidebar kalau collapsed */}
        <div style={{ background:'var(--card)', borderBottom:'1px solid var(--border)', padding:'12px 28px', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text3)', flexShrink:0 }}>
          <span>{current?.group || 'Dashboard'}</span>
          <ChevronRight size={13}/>
          <span style={{ color:'var(--text)', fontWeight:600 }}>{current?.label || ''}</span>
        </div>
        <main style={{ flex:1, overflow:'auto' }}><Outlet/></main>
      </div>
    </div>
  )
}
