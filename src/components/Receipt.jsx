import { forwardRef } from 'react'

const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID')

const PAYMENT_LABEL = {
  tunai:'Tunai', kartu:'Kartu', qris:'QRIS',
  gofood:'GoFood', shopeefood:'ShopeeFood', grabfood:'GrabFood',
}

const Receipt = forwardRef(function Receipt({ profile, receipt, kasirName }, ref) {
  if (!receipt) return null
  const now    = new Date()
  const tanggal = now.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' })
  const jam     = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })

  return (
    <div ref={ref} id="struk-print-area" className="struk-58mm">
      <div className="struk-center struk-bold struk-lg">{profile?.nama || 'Juice Smooly'}</div>
      {profile?.alamat && <div className="struk-center struk-sm">{profile.alamat}</div>}
      {profile?.telp   && <div className="struk-center struk-sm">{profile.telp}</div>}
      <div className="struk-divider"/>
      <div className="struk-row struk-sm">
        <span>{tanggal} {jam}</span>
        <span>#{receipt.id}</span>
      </div>
      <div className="struk-row struk-sm"><span>Kasir: {kasirName||'-'}</span></div>
      <div className="struk-divider"/>

      {receipt.cartItems.map((i, idx) => (
        <div key={idx} className="struk-item">
          <div>{i.name}</div>
          {/* Keterangan kustomisasi di bawah nama produk */}
          {i.customizations?.keterangan && (
            <div style={{ fontSize:'9px', color:'#666', fontStyle:'italic', marginBottom:'1px' }}>
              {i.customizations.keterangan}
            </div>
          )}
          <div className="struk-row struk-sm">
            <span>{i.quantity} x {fmt(i.price)}</span>
            <span>{fmt(i.price * i.quantity)}</span>
          </div>
        </div>
      ))}

      <div className="struk-divider"/>
      <div className="struk-row struk-bold">
        <span>TOTAL</span><span>{fmt(receipt.total)}</span>
      </div>
      <div className="struk-row struk-sm">
        <span>Bayar ({PAYMENT_LABEL[receipt.payment_method]||receipt.payment_method})</span>
        <span>{fmt(receipt.paid)}</span>
      </div>
      <div className="struk-row struk-sm">
        <span>Kembalian</span><span>{fmt(receipt.change)}</span>
      </div>
      <div className="struk-divider"/>
      <div className="struk-center struk-sm">Terima kasih atas kunjungan Anda!</div>
    </div>
  )
})

export default Receipt
