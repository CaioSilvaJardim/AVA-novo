/**
 * LoginPage.tsx
 *
 * Auth flow:
 *  1. On mount → fetch /api/login-url (via allorigins CORS proxy) to scrape
 *     the dynamic sesskey from the real Moodle login page and get the
 *     Google OAuth URL.
 *  2. Primary CTA: [ ENTRAR COM GOOGLE ] → window.location.href = googleUrl
 *     This redirects: our app → Moodle → Google → Moodle → wantsurl (back)
 *  3. Fallback: expandable manual login with username + password → token API
 *  4. After OAuth return: DashboardPage detects active Moodle session via proxy.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGoogleLoginUrl } from '../api/proxy'
import { moodleLogin, getSiteInfo } from '../api/moodle'

type FetchState = 'loading' | 'ready' | 'error'

export default function LoginPage() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [fetchState, setFetchState] = useState<FetchState>('loading')
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState('')

  // Manual login state
  const [showManual, setShowManual] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Blinking cursor for loading state
  const [blink, setBlink] = useState(true)
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // If already authenticated (token mode), skip to dashboard
    const token = localStorage.getItem('moodle_token')
    if (token) {
      navigate('/dashboard')
      return
    }

    // Fade-in
    const t = setTimeout(() => setVisible(true), 50)

    // Start blink
    blinkRef.current = setInterval(() => setBlink(b => !b), 500)

    // Fetch Google OAuth URL with dynamic sesskey
    fetchGoogleLoginUrl()
      .then(url => {
        if (url) {
          // Inject wantsurl pointing back to our app so after OAuth
          // Moodle redirects the user back here (to /dashboard)
          let finalUrl = url
          try {
            const u = new URL(url)
            // Update wantsurl to redirect back to our dashboard
            const currentOrigin = window.location.origin
            u.searchParams.set(
              'wantsurl',
              encodeURIComponent(`${currentOrigin}/dashboard`),
            )
            finalUrl = u.toString()
          } catch {
            // keep original URL if parsing fails
          }
          setGoogleUrl(finalUrl)
          setFetchState('ready')
        } else {
          setFetchError(
            'Não foi possível obter o link de login. Use o login manual.',
          )
          setFetchState('error')
          setShowManual(true)
        }
      })
      .catch(() => {
        setFetchError('Erro ao buscar link Google. Use o login manual.')
        setFetchState('error')
        setShowManual(true)
      })
      .finally(() => {
        if (blinkRef.current) clearInterval(blinkRef.current)
      })

    return () => {
      clearTimeout(t)
      if (blinkRef.current) clearInterval(blinkRef.current)
    }
  }, [navigate])

  const handleGoogleLogin = () => {
    if (!googleUrl) return
    // Full redirect to Moodle OAuth — browser will follow the flow
    // Moodle → Google → Moodle (sets session cookie) → wantsurl
    window.location.href = googleUrl
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setLoginError('Preencha usuário e senha.')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    try {
      const { token } = await moodleLogin(username.trim(), password.trim())
      localStorage.setItem('moodle_token', token)
      localStorage.setItem('moodle_auth_mode', 'token')
      try {
        const info = await getSiteInfo(token)
        localStorage.setItem('moodle_userid', String(info.userid))
        localStorage.setItem('moodle_fullname', info.fullname || '')
      } catch {
        /* non-critical */
      }
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      setLoginError(msg)
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Shared styles ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    color: '#fff',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.88rem',
    padding: '11px 14px',
    borderRadius: '4px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        {/* ── Title ── */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            AVA — ESCOLA PARQUE
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.88rem',
              color: '#9B4DCA',
              marginTop: '10px',
              marginBottom: 0,
            }}
          >
            &gt; acesse sua conta institucional
          </p>
        </div>

        {/* ── Google Login Section ── */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Loading state */}
          {fetchState === 'loading' && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.85rem',
                color: '#9B4DCA',
                textAlign: 'center',
                padding: '14px',
                border: '1px solid #1f1f1f',
                borderRadius: '4px',
                background: '#0a0a0a',
              }}
            >
              &gt; carregando
              <span
                style={{
                  opacity: blink ? 1 : 0,
                  transition: 'opacity 0.1s',
                  marginLeft: '2px',
                }}
              >
                _
              </span>
            </div>
          )}

          {/* Google button */}
          {fetchState === 'ready' && googleUrl && (
            <button
              onClick={handleGoogleLogin}
              style={{
                background: '#0f0f0f',
                border: '1px solid #7B2FBE',
                color: '#9B4DCA',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.9rem',
                fontWeight: 700,
                padding: '13px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.background = '#1a0a2e'
                el.style.color = '#c77dff'
                el.style.borderColor = '#9B4DCA'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.background = '#0f0f0f'
                el.style.color = '#9B4DCA'
                el.style.borderColor = '#7B2FBE'
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              [ ENTRAR COM GOOGLE ]
            </button>
          )}

          {/* Fetch error notice */}
          {fetchState === 'error' && fetchError && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                color: '#ff8800',
                padding: '8px 12px',
                background: '#1a0e00',
                border: '1px solid #3a2000',
                borderRadius: '3px',
              }}
            >
              ⚠ {fetchError}
            </div>
          )}

          {/* Session info notice */}
          {fetchState === 'ready' && (
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                color: '#444',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Você será redirecionado para o Google e de volta ao AVA
              automaticamente.
            </p>
          )}
        </div>

        {/* ── Divider ── */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: '#333',
            }}
          >
            ou
          </span>
          <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
        </div>

        {/* ── Manual Login Toggle ── */}
        <div style={{ width: '100%' }}>
          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#444',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '4px 0',
                textDecoration: 'underline',
                textDecorationColor: '#333',
                transition: 'color 0.15s',
                width: '100%',
                textAlign: 'center',
              }}
              onMouseEnter={e =>
                ((e.target as HTMLButtonElement).style.color = '#9B4DCA')
              }
              onMouseLeave={e =>
                ((e.target as HTMLButtonElement).style.color = '#444')
              }
            >
              login manual &darr;
            </button>
          ) : (
            <form
              onSubmit={handleManualLogin}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                animation: 'fadeIn 0.25s ease forwards',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: '#555',
                  }}
                >
                  // login manual (fallback)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowManual(false)
                    setLoginError('')
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#444',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e =>
                    ((e.target as HTMLButtonElement).style.color = '#9B4DCA')
                  }
                  onMouseLeave={e =>
                    ((e.target as HTMLButtonElement).style.color = '#444')
                  }
                >
                  ✕ fechar
                </button>
              </div>

              <input
                type="text"
                placeholder="usuário"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                style={inputStyle}
                onFocus={e =>
                  (e.target.style.borderColor = '#7B2FBE')
                }
                onBlur={e =>
                  (e.target.style.borderColor = '#2a2a2a')
                }
              />
              <input
                type="password"
                placeholder="senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inputStyle}
                onFocus={e =>
                  (e.target.style.borderColor = '#7B2FBE')
                }
                onBlur={e =>
                  (e.target.style.borderColor = '#2a2a2a')
                }
              />

              {loginError && (
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.78rem',
                    color: '#ff4444',
                    margin: 0,
                    padding: '8px 12px',
                    background: '#1a0000',
                    border: '1px solid #330000',
                    borderRadius: '3px',
                  }}
                >
                  ✗ {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #2a2a2a',
                  color: loginLoading ? '#555' : '#666',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '11px 14px',
                  borderRadius: '4px',
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                  marginTop: '2px',
                }}
                onMouseEnter={e => {
                  if (!loginLoading) {
                    const el = e.currentTarget
                    el.style.borderColor = '#7B2FBE'
                    el.style.color = '#9B4DCA'
                  }
                }}
                onMouseLeave={e => {
                  if (!loginLoading) {
                    const el = e.currentTarget
                    el.style.borderColor = '#2a2a2a'
                    el.style.color = '#666'
                  }
                }}
              >
                {loginLoading ? '[ aguarde... ]' : '[ ENTRAR ]'}
              </button>

              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.68rem',
                  color: '#333',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Requer API REST habilitada no servidor Moodle.
                <br />
                Use o login com Google se isso falhar.
              </p>
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            color: '#222',
            textAlign: 'center',
            margin: 0,
          }}
        >
          ava.escolaparque.g12.br
        </p>
      </div>
    </div>
  )
}
