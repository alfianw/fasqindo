const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

const TOKEN_KEY = 'fasqindo_token'
const USER_KEY = 'fasqindo_user'

export type AdminUser = { id: number; name: string; email: string; role: string }

export type Service = {
  id: number
  title: string
  description: string
  details: string
  icon: string
  image_url: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
}

export type NewsItem = {
  id: number
  label: string
  title: string
  summary: string
  details: string
  category: string
  date: string
  image_url: string
  status: 'DRAFT' | 'PUBLISHED'
  created_at: string
  updated_at: string
}

export type GalleryItem = {
  id: number
  title: string
  caption: string
  category: string
  image_url: string
  status: string
  created_at: string
  updated_at: string
}

export type DashboardSummary = {
  totalServices: number
  totalNews: number
  totalGallery: number
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getUser(): AdminUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}

export function setSession(token: string, user: AdminUser) {
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

type RequestOptions = {
  method?: string
  body?: BodyInit | null
  headers?: Record<string, string>
  auth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...options.headers }
  const token = getToken()

  if (options.auth !== false && token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ?? undefined,
    })
  } catch {
    throw new ApiError(0, '0', 'Cannot reach the server. Is the backend running?')
  }

  let payload: { code?: string; message?: string; data?: T } | null = null
  try {
    payload = (await res.json()) as { code?: string; message?: string; data?: T }
  } catch {
    payload = null
  }

  if (!res.ok || (payload?.code && payload.code !== '00')) {
    throw new ApiError(res.status, payload?.code ?? String(res.status), payload?.message ?? 'Request failed')
  }

  return payload?.data as T
}

export async function login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  return request('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  })
}

export function changePassword(currentPassword: string, newPassword: string): Promise<null> {
  return request('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

// ---- public (no token: only ACTIVE/PUBLISHED records) ----

export function getPublicServices(): Promise<Service[]> {
  return request('/api/services', { auth: false })
}

export function getPublicNews(): Promise<NewsItem[]> {
  return request('/api/news', { auth: false })
}

export function getPublicGallery(): Promise<GalleryItem[]> {
  return request('/api/gallery', { auth: false })
}

// ---- admin (with token: all records) ----

export function getAdminServices(): Promise<Service[]> {
  return request('/api/services')
}

export function getAdminNews(): Promise<NewsItem[]> {
  return request('/api/news')
}

export function getAdminGallery(): Promise<GalleryItem[]> {
  return request('/api/gallery')
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return request('/api/dashboard/summary')
}

function sendForm<T>(method: string, path: string, fields: Record<string, string>, image?: File | null): Promise<T> {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, value)
  }
  if (image) form.append('image', image)
  return request<T>(path, { method, body: form })
}

export function createService(fields: Record<string, string>, image?: File | null): Promise<Service> {
  return sendForm('POST', '/api/services', fields, image)
}

export function updateService(id: number, fields: Record<string, string>, image?: File | null): Promise<Service> {
  return sendForm('PUT', `/api/services/${id}`, fields, image)
}

export function deleteService(id: number): Promise<null> {
  return request(`/api/services/${id}`, { method: 'DELETE' })
}

export function createNews(fields: Record<string, string>, image?: File | null): Promise<NewsItem> {
  return sendForm('POST', '/api/news', fields, image)
}

export function updateNews(id: number, fields: Record<string, string>, image?: File | null): Promise<NewsItem> {
  return sendForm('PUT', `/api/news/${id}`, fields, image)
}

export function deleteNews(id: number): Promise<null> {
  return request(`/api/news/${id}`, { method: 'DELETE' })
}

export function createGallery(fields: Record<string, string>, image?: File | null): Promise<GalleryItem> {
  return sendForm('POST', '/api/gallery', fields, image)
}

export function updateGallery(id: number, fields: Record<string, string>, image?: File | null): Promise<GalleryItem> {
  return sendForm('PUT', `/api/gallery/${id}`, fields, image)
}

export function deleteGallery(id: number): Promise<null> {
  return request(`/api/gallery/${id}`, { method: 'DELETE' })
}

export { API_URL }
