/**
 * LoginPage.tsx
 *
 * Auth flow:
 *  1. On mount → tries to scrape the dynamic sesskey from the Moodle login
 *     page via multiple CORS proxy fallbacks (allorigins, codetabs, corsproxy.io…)
 *  2. Primary: [ ENTRAR COM GOOGLE ] → window.location.href = googleUrl
 *  3. Fallback: expandable manual login with username + password → token API
 *  4. If ALL proxies fail → shows manual login automatically + clear message
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGoogleLoginUrl } from '../api/proxy'
import { moodleLogin, getSiteInfo } from '../api/moodle'

type FetchState = 'loading' | 'ready' | 'error'

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'

// Known-good base URL structure (sesskey varies per session — fetched dynamically)
// const FALLBACK_OAUTH_BASE = `${MOODLE_BASE}/auth/oauth2/login.php?id=1&wantsurl=...&sesskey=`

export default function LoginPage() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [fetchState, setFetchState] = useState<FetchState>('loading')
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [proxyAttempt, setProxyAttempt] = useState(0) // 0-3 = which proxy is being tried
  const [retrying, setRetrying] = useState(false)

  // Manual login state
  const [showManual, setShowManual] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Blinking cursor
  const [blink, setBlink] = useState(true)
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchAttemptRef = useRef(0)

  const startBlink = () => {
    if (blinkRef.current) clearInterval(blinkRef.current)
    blinkRef.current = setInterval(() => setBlink(b => !b), 500)
  }

  const stopBlink = () => {
    if (blinkRef.current) {
      clearInterval(blinkRef.current)
      blinkRef.current = null
    }
  }

  const doFetch = async () => {
    setFetchState('loading')
    setFetchError('')
    setProxyAttempt(0)
    startBlink()

    // Simulate progress display
    const progressInterval = setInterval(() => {
      setProxyAttempt(p => Math.min(p + 1, 3))
    }, 2500)

    try {
      const url = await fetchGoogleLoginUrl()
      clearInterval(progressInterval)
      stopBlink()

      if (url) {
        setGoogleUrl(url)
        setFetchState('ready')
      } else {
        // All proxies returned null
        setFetchError(
          'Não foi possível obter o link Google automaticamente. Use o login manual abaixo ou acesse diretamente:',
        )
        setFetchState('error')
        setShowManual(true)
      }
    } catch {
      clearInterval(progressInterval)
      stopBlink()
      setFetchError(
        'Erro ao buscar link de login. Use o login manual ou tente novamente.',
      )
      setFetchState('error')
      setShowManual(true)
    }
  }

  useEffect(() => {
    // If already authenticated (token mode), skip to dashboard
    const token = localStorage.getItem('moodle_token')
    if (token) {
      navigate('/dashboard')
      return
    }

    // Fade-in animation
    const t = setTimeout(() => setVisible(true), 50)

    fetchAttemptRef.current += 1
    doFetch()

    return () => {
      clearTimeout(t)
      stopBlink()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  const handleRetry = async () => {
    setRetrying(true)
    await doFetch()
    setRetrying(false)
  }

  const handleGoogleLogin = () => {
    if (!googleUrl) return
    window.location.href = googleUrl
  }

  // Direct link to Moodle's own login page (always works)
  const handleDirectMoodleLogin = () => {
    window.open(`${MOODLE_BASE}/login/index.php`, '_blank')
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

  // Proxy status labels
  const proxyLabels = [
    'allorigins.win',
    'codetabs.com',
    'corsproxy.io',
    'thingproxy',
  ]

  // ── Shared input style ───────────────────────────────────────────────
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
    boxSizing: 'border-box',
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
        fontFamily: "'JetBrains Mono', monospace",
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
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
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
              fontSize: '0.88rem',
              color: '#9B4DCA',
              marginTop: '10px',
              marginBottom: 0,
            }}
          >
            &gt; acesse sua conta institucional
          </p>
        </div>

        {/* ── Google OAuth Section ── */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Loading state with proxy progress */}
          {fetchState === 'loading' && (
            <div
              style={{
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                borderRadius: '4px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#9B4DCA' }}>
                &gt; obtendo link de login
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

              {/* Proxy progress list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {proxyLabels.map((label, i) => {
                  const isDone = i < proxyAttempt
                  const isCurrent = i === proxyAttempt
                  return (
                    <div
                      key={label}
                      style={{
                        fontSize: '0.68rem',
                        color: isDone
                          ? '#2a2a2a'
                          : isCurrent
                            ? '#9B4DCA'
                            : '#222',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'color 0.3s',
                      }}
                    >
                      <span style={{ width: '10px', display: 'inline-block' }}>
                        {isDone ? '✓' : isCurrent ? '→' : '·'}
                      </span>
                      {label}
                      {isCurrent && (
                        <span
                          style={{
                            opacity: blink ? 1 : 0,
                            transition: 'opacity 0.1s',
                          }}
                        >
                          …
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize: '0.68rem', color: '#2a2a2a', marginTop: '2px' }}>
                Buscando sesskey dinâmico do Moodle...
              </div>
            </div>
          )}

          {/* Success: Google button */}
          {fetchState === 'ready' && googleUrl && (
            <>
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
                <GoogleIcon />
                [ ENTRAR COM GOOGLE ]
              </button>

              <p
                style={{
                  fontSize: '0.68rem',
                  color: '#333',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Você será redirecionado para o Google e de volta ao Moodle.
                <br />
                <span style={{ color: '#2a2a2a' }}>
                  sesskey obtido dinamicamente ✓
                </span>
              </p>
            </>
          )}

          {/* Error: all proxies failed */}
          {fetchState === 'error' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Error message */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#cc7700',
                  padding: '10px 12px',
                  background: '#0f0900',
                  border: '1px solid #2a1800',
                  borderRadius: '4px',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ marginBottom: '6px' }}>
                  ⚠ {fetchError}
                </div>
                <div style={{ color: '#555', fontSize: '0.68rem' }}>
                  Os serviços de proxy CORS externos estão indisponíveis no momento.
                </div>
              </div>

              {/* Action buttons row */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Direct Moodle link — always works */}
                <button
                  onClick={handleDirectMoodleLogin}
                  style={{
                    flex: 1,
                    background: '#0f0f0f',
                    border: '1px solid #7B2FBE',
                    color: '#9B4DCA',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '10px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    letterSpacing: '0.03em',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.background = '#1a0a2e'
                    el.style.color = '#c77dff'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.background = '#0f0f0f'
                    el.style.color = '#9B4DCA'
                  }}
                >
                  <GoogleIcon size={13} />
                  [ GOOGLE — SITE ORIGINAL ]
                </button>

                {/* Retry proxy */}
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  style={{
                    background: '#0f0f0f',
                    border: '1px solid #2a2a2a',
                    color: retrying ? '#333' : '#555',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    padding: '10px 10px',
                    borderRadius: '4px',
                    cursor: retrying ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!retrying) e.currentTarget.style.borderColor = '#7B2FBE'
                  }}
                  onMouseLeave={e => {
                    if (!retrying) e.currentTarget.style.borderColor = '#2a2a2a'
                  }}
                >
                  {retrying ? '...' : '↺ tentar'}
                </button>
              </div>

              {/* Explanation */}
              <div
                style={{
                  fontSize: '0.65rem',
                  color: '#2a2a2a',
                  lineHeight: 1.6,
                  padding: '6px 0',
                }}
              >
                <span style={{ color: '#333' }}>[ GOOGLE — SITE ORIGINAL ]</span> abre o Moodle
                diretamente onde o login Google funciona normalmente.
                Após logar, o dashboard do AVA tentará detectar sua sessão.
              </div>
            </div>
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
          <div style={{ flex: 1, height: '1px', background: '#111' }} />
          <span style={{ fontSize: '0.7rem', color: '#222' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: '#111' }} />
        </div>

        {/* ── Manual Login ── */}
        <div style={{ width: '100%' }}>
          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#333',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '4px 0',
                textDecoration: 'underline',
                textDecorationColor: '#222',
                transition: 'color 0.15s',
                width: '100%',
                textAlign: 'center',
              }}
              onMouseEnter={e =>
                ((e.target as HTMLButtonElement).style.color = '#9B4DCA')
              }
              onMouseLeave={e =>
                ((e.target as HTMLButtonElement).style.color = '#333')
              }
            >
              login manual (usuário + senha) ↓
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
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: '#444' }}>
                  // login manual
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
                    color: '#333',
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
                    ((e.target as HTMLButtonElement).style.color = '#333')
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
                onFocus={e => (e.target.style.borderColor = '#7B2FBE')}
                onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
              />
              <input
                type="password"
                placeholder="senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#7B2FBE')}
                onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
              />

              {loginError && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#ff5555',
                    padding: '8px 12px',
                    background: '#0f0000',
                    border: '1px solid #2a0000',
                    borderRadius: '3px',
                    lineHeight: 1.5,
                  }}
                >
                  ✗ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  background: '#0f0f0f',
                  border: `1px solid ${loginLoading ? '#1a1a1a' : '#7B2FBE'}`,
                  color: loginLoading ? '#444' : '#9B4DCA',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  padding: '11px 14px',
                  borderRadius: '4px',
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!loginLoading) {
                    e.currentTarget.style.background = '#1a0a2e'
                    e.currentTarget.style.color = '#c77dff'
                  }
                }}
                onMouseLeave={e => {
                  if (!loginLoading) {
                    e.currentTarget.style.background = '#0f0f0f'
                    e.currentTarget.style.color = '#9B4DCA'
                  }
                }}
              >
                {loginLoading ? '[ autenticando... ]' : '[ ENTRAR ]'}
              </button>

              <div
                style={{
                  fontSize: '0.67rem',
                  color: '#2a2a2a',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  marginTop: '2px',
                }}
              >
                Requer API REST habilitada no servidor Moodle.
                <br />
                Prefira o login com Google se disponível.
              </div>
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={{ fontSize: '0.67rem', color: '#1a1a1a', textAlign: 'center', margin: 0 }}>
          ava.escolaparque.g12.br &nbsp;·&nbsp; redesign não-oficial
        </p>
      </div>
    </div>
  )
}

// ── Google Icon SVG ───────────────────────────────────────────────────
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
