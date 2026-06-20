import api from './api'

// Memicu download file dari endpoint export backend.
// Dipakai oleh tombol "Export CSV" di berbagai halaman Superadmin.
export async function downloadCsv(endpoint, filename) {
  const res = await api.get(endpoint, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
