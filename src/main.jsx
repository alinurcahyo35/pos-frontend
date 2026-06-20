import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import LayoutKasir from './components/LayoutKasir'
import LayoutAdmin from './components/LayoutAdmin'
import Kasir from './pages/Kasir'
import StokKasir from './pages/StokKasir'
import Produk from './pages/Produk'
import Persediaan from './pages/Persediaan'
import Resep from './pages/Resep'
import Laporan from './pages/Laporan'
import LabaRugi from './pages/LabaRugi'
import LabaRugiKredit from './pages/LabaRugiKredit'
import Pengguna from './pages/Pengguna'
import ProfilUsaha from './pages/ProfilUsaha'
import Konsumen from './pages/Konsumen'
import PenjualanKredit from './pages/PenjualanKredit'
import Hutang from './pages/Hutang'
import ChartOfAccounts from './pages/ChartOfAccounts'
import Jurnal from './pages/Jurnal'
import Neraca from './pages/Neraca'
import CashFlow from './pages/CashFlow'
import LabaRugiAkuntansi from './pages/LabaRugiAkuntansi'
import Pemasok from './pages/Pemasok'
import Pembelian from './pages/Pembelian'
import ReturPembelian from './pages/ReturPembelian'
import PengajuanPembelian from './pages/PengajuanPembelian'
import AuditLog from './pages/AuditLog'
import Absensi from './pages/Absensi'
import HR from './pages/HR'
import Aggregator from './pages/Aggregator'
import KustomisasiKasir from './pages/KustomisasiKasir'
import AsetTetap from './pages/AsetTetap'
import Dashboard from './pages/Dashboard'
import FormProject from './pages/FormProject'
import './index.css'

const token = () => localStorage.getItem('pos_token')
const user  = () => JSON.parse(localStorage.getItem('pos_user') || '{}')

const RequireAuth  = ({ children }) => token() ? children : <Navigate to="/login"/>
const RequireAdmin = ({ children }) => {
  if (!token()) return <Navigate to="/login"/>
  if (!['admin','direksi'].includes(user().role)) return <Navigate to="/kasir"/>
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration:3000 }}/>
      <Routes>
        <Route path="/login" element={<Login/>}/>

        {/* POS KASIR */}
        <Route path="/" element={<RequireAuth><LayoutKasir/></RequireAuth>}>
          <Route index element={<Navigate to="/kasir"/>}/>
          <Route path="kasir" element={<Kasir/>}/>
          <Route path="stok"  element={<StokKasir/>}/>
          <Route path="absensi" element={<Absensi/>}/>
        </Route>

        {/* SUPERADMIN */}
        <Route path="/admin" element={<RequireAdmin><LayoutAdmin/></RequireAdmin>}>
          <Route index element={<Navigate to="/admin/produk"/>}/>
          <Route path="profil"            element={<ProfilUsaha/>}/>
          <Route path="produk"            element={<Produk/>}/>
          <Route path="persediaan"        element={<Persediaan/>}/>
          <Route path="resep"             element={<Resep/>}/>
          <Route path="konsumen"          element={<Konsumen/>}/>
          <Route path="pemasok"           element={<Pemasok/>}/>
          <Route path="penjualan-kredit"  element={<PenjualanKredit/>}/>
          <Route path="hutang"            element={<Hutang/>}/>
          <Route path="pembelian"         element={<Pembelian/>}/>
          <Route path="retur-pembelian"   element={<ReturPembelian/>}/>
          <Route path="pengajuan-pembelian" element={<PengajuanPembelian/>}/>
          <Route path="hr"                element={<HR/>}/>
          <Route path="aggregator"        element={<Aggregator/>}/>
          <Route path="kustomisasi-kasir" element={<KustomisasiKasir/>}/>
          <Route path="aset-tetap"        element={<AsetTetap/>}/>
          <Route path="dashboard"         element={<Dashboard/>}/>
          <Route path="form-project"      element={<FormProject/>}/>
          <Route path="audit-log"         element={<AuditLog/>}/>
          <Route path="coa"               element={<ChartOfAccounts/>}/>
          <Route path="jurnal"            element={<Jurnal/>}/>
          <Route path="neraca"            element={<Neraca/>}/>
          <Route path="cashflow"          element={<CashFlow/>}/>
          <Route path="lr-akuntansi"      element={<LabaRugiAkuntansi/>}/>
          <Route path="lr-kasir"          element={<LabaRugi/>}/>
          <Route path="lr-kredit"         element={<LabaRugiKredit/>}/>
          <Route path="laporan"           element={<Laporan/>}/>
          <Route path="pengguna"          element={<Pengguna/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
