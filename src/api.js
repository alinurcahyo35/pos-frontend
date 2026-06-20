import axios from 'axios'

// Saat development: kosongkan VITE_API_URL, Vite proxy akan teruskan ke localhost:3001
// Saat production (Netlify/Vercel): set VITE_API_URL ke URL backend (misal https://pos-backend.onrender.com/api)
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pos_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pos_token')
      localStorage.removeItem('pos_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
