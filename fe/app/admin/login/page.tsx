'use client'

import '../admin.css'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, Loader2, LockKeyhole } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { ApiError, getToken, login as loginRequest, setSession } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getToken()) router.replace('/admin')
  }, [router])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await loginRequest(email.trim(), password)
      setSession(session.token, session.user)
      router.replace('/admin')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Is the backend running?'
      )
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <img className="brand-logo" src="/images/fasqindo-logo-final.png" alt="PT. Fasqindo Mandiri Bersama" />
        </div>

        <span className="admin-kicker">ADMIN SIGN IN</span>
        <h1 className="admin-login-title">Welcome back</h1>
        <p className="admin-muted admin-login-sub">
          Sign in to manage services, news, and gallery of the Fasqindo website.
        </p>

        <form className="admin-login-form" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Email <span className="admin-required">*</span></Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@fasqindo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password <span className="admin-required">*</span></Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <p className="admin-form-hint">Fields marked <span className="admin-required">*</span> are required.</p>

          {error ? (
            <p className="admin-login-error" role="alert">
              <AlertCircle size={15} />
              {error}
            </p>
          ) : null}

          <Button type="submit" className="admin-primary admin-login-submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="admin-login-hint">
          <LockKeyhole size={13} />
          Access is limited to the dashboard at <strong>/admin</strong>.
        </p>
      </div>
    </main>
  )
}
