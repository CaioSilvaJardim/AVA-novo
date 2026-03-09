/**
 * LoginPage.tsx
 *
 * AUTH FLOW ANALYSIS:
 *
 * ❌ WHAT DOESN'T WORK (and why):
 *   - Scraping sesskey via CORS proxy: sesskey belongs to proxy's session, not user's
 *   - Directly constructing the Google OAuth URL: sesskey is always stale
 *   - Session-cookie-based API calls cross-origin: blocked by browser SameSite policy
 *
 * ✅ WHAT WORKS:
 *   1. TOKEN LOGIN (primary): POST username+password to /login/token.php
 *      Works if moodle_mobile_app service is enabled on the Moodle server.
 *      Returns a persistent token — full API access.
 *
 *   2. GOOGLE LOGIN (redirect): Open Moodle login page in a popup or new tab.
 *      After login, user has a Moodle session cookie in their browser.
 *      They can then use the original Moodle site directly.
 *      Our app can open Moodle pages in an iframe (read-only, no API).
 *
 * WHY THE GOOGLE LOGIN GIVES "invalidsesskey":
 *   The sesskey is a CSRF token tied to the anonymous session created when the
 *   Moodle login page loads. If the session expires before OAuth completes
 *   (slow network, long Google account chooser interaction, server config
 *   session.auto_start, or expired anonymous session), Moodle rejects the
 *   OAuth callback. This is a Moodle server config issue, not a frontend issue.
 *
 * SOLUTION:
 *   - Make TOKEN login the primary recommended flow
 *   - For Google: open Moodle login in a popup and detect completion
 *   - After successful Google login in popup: close popup, go to original site
 *   - Clear UX explaining each path
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { moodleLogin, getSiteInfo } from '../api/moodle'

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'
const MOODLE_LOGIN_URL = `${MOODLE_BASE}/login/index.php`
const MOODLE_DASHBOARD_URL = `${MOODLE_BASE}/my/`

export default function LoginPage() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  // Tab state: 'token' | 'google'
  const [activeTab, setActiveTab] = useState<'token' | 'google'>('token')

  // Token login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Google popup state
  const [popupOpen, setPopupOpen] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Already authenticated → skip to dashboard
    const token = localStorage.getItem('moodle_token')
    if (token) {
      navigate('/dashboard')
      return
    }
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [navigate])

  // Cleanup popup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Token login ──────────────────────────────────────────────────────
  const handleTokenLogin = async (e: React.FormEvent) => {
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

  // ── Google: open Moodle login in a popup ────────────────────────────
  // The popup lets the user log in on Moodle's real page (with a fresh
  // session and valid sesskey). We poll to detect when it's done.
  const handleGooglePopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus()
      return
    }

    const w = 520
    const h = 640
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2

    const popup = window.open(
      MOODLE_LOGIN_URL,
      'moodle_login',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
    )

    if (!popup) {
      // Popup blocked
      setLoginError(
        'Popup bloqueado pelo navegador. Permita popups para este site ou use o login manual abaixo.',
      )
      return
    }

    popupRef.current = popup
    setPopupOpen(true)
    setLoginError('')

    // Poll the popup every 800ms to detect when login is done
    // When the popup lands on ava.escolaparque.g12.br (post-login),
    // we detect it and close the popup
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        // User closed popup manually
        if (pollRef.current) clearInterval(pollRef.current)
        setPopupOpen(false)
        return
      }

      try {
        // Try to access popup's URL — works only if same origin
        const url = popupRef.current.location.href
        // If popup landed on Moodle's home/dashboard (post-login), we're done
        if (
          url.includes('ava.escolaparque.g12.br') &&
          !url.includes('/login/') &&
          !url.includes('accounts.google.com')
        ) {
          // Login successful! Close popup and redirect user to original Moodle
          if (pollRef.current) clearInterval(pollRef.current)
          popupRef.current.close()
          setPopupOpen(false)
          localStorage.setItem('moodle_auth_mode', 'session')
          navigate('/dashboard')
        }
      } catch {
        // Cross-origin: popup is on Google's domain — login in progress, keep polling
      }
    }, 800)
  }

  // Open Moodle login directly in current tab (fallback if popup blocked)
  const handleGoogleDirect = () => {
    localStorage.setItem('moodle_auth_mode', 'session')
    window.open(MOODLE_LOGIN_URL, '_blank', 'noopener')
  }

  // Go to dashboard after manual Google login
  const handleAlreadyLoggedIn = () => {
    localStorage.setItem('moodle_auth_mode', 'session')
    navigate('/dashboard')
  }

  // ── Shared styles ────────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    color: '#e0e0e0',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.88rem',
    padding: '11px 14px',
    borderRadius: '4px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? '#7B2FBE' : '#1a1a1a'}`,
    color: active ? '#9B4DCA' : '#333',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.78rem',
    fontWeight: active ? 700 : 400,
    padding: '10px 8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.04em',
  })

  const primaryBtn: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid #7B2FBE',
    color: '#9B4DCA',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.9rem',
    fontWeight: 700,
    padding: '13px 14px',
    borderRadius: '4px',
    cursor: loginLoading ? 'not-allowed' : 'pointer',
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    opacity: loginLoading ? 0.6 : 1,
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
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}
      >
        {/* ── Title ──────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(1.4rem, 5vw, 2.5rem)',
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

        {/* ── Login card ─────────────────────────────────────────────── */}
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #111' }}>
            <button
              style={tabStyle(activeTab === 'token')}
              onClick={() => {
                setActiveTab('token')
                setLoginError('')
              }}
            >
              [ LOGIN MANUAL ]
            </button>
            <button
              style={tabStyle(activeTab === 'google')}
              onClick={() => {
                setActiveTab('google')
                setLoginError('')
              }}
            >
              [ GOOGLE ]
            </button>
          </div>

          {/* ── Tab: TOKEN LOGIN ───────────────────────────────────── */}
          {activeTab === 'token' && (
            <form
              onSubmit={handleTokenLogin}
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#333',
                  lineHeight: 1.7,
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#9B4DCA' }}>//</span> acesso via API
                token — recomendado para este redesign
              </div>

              {/* Username */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2a2a2a',
                    fontSize: '0.75rem',
                    pointerEvents: 'none',
                  }}
                >
                  &gt;
                </div>
                <input
                  type="text"
                  placeholder="usuário"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  style={{ ...inputBase, paddingLeft: '28px' }}
                  onFocus={e => (e.target.style.borderColor = '#7B2FBE')}
                  onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
                />
              </div>

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2a2a2a',
                    fontSize: '0.75rem',
                    pointerEvents: 'none',
                  }}
                >
                  &gt;
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ ...inputBase, paddingLeft: '28px', paddingRight: '60px' }}
                  onFocus={e => (e.target.style.borderColor = '#7B2FBE')}
                  onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#333',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.62rem',
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
                  {showPass ? 'ocultar' : 'ver'}
                </button>
              </div>

              {/* Error */}
              {loginError && (
                <ErrorBox message={loginError} />
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginLoading}
                style={primaryBtn}
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
                {loginLoading ? (
                  <>
                    <Spinner />
                    autenticando...
                  </>
                ) : (
                  '[ ENTRAR ]'
                )}
              </button>

              {/* Forgot password */}
              <div style={{ textAlign: 'center' }}>
                <a
                  href="https://ava.escolaparque.g12.br/login/forgot_password.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.68rem',
                    color: '#2a2a2a',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e =>
                    ((e.target as HTMLAnchorElement).style.color = '#9B4DCA')
                  }
                  onMouseLeave={e =>
                    ((e.target as HTMLAnchorElement).style.color = '#2a2a2a')
                  }
                >
                  esqueceu a senha? →
                </a>
              </div>
            </form>
          )}

          {/* ── Tab: GOOGLE LOGIN ──────────────────────────────────── */}
          {activeTab === 'google' && (
            <div
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {/* Explanation */}
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#333',
                  lineHeight: 1.8,
                  padding: '10px 12px',
                  background: '#050505',
                  border: '1px solid #111',
                  borderLeft: '2px solid #3a1a5a',
                  borderRadius: '3px',
                }}
              >
                <span style={{ color: '#9B4DCA' }}>//</span> login via conta
                Google institucional
                <br />
                <span style={{ color: '#1e1e1e' }}>
                  O botão abaixo abre o Moodle numa janela popup.
                  <br />
                  Faça login com sua conta Google e o popup fechará
                  automaticamente.
                </span>
              </div>

              {/* Error (popup blocked etc) */}
              {loginError && (
                <ErrorBox message={loginError} onClose={() => setLoginError('')} />
              )}

              {/* Popup button */}
              <button
                onClick={handleGooglePopup}
                disabled={popupOpen}
                style={{
                  background: popupOpen ? '#0a0a0a' : '#0f0f0f',
                  border: `1px solid ${popupOpen ? '#2a1a4a' : '#7B2FBE'}`,
                  color: popupOpen ? '#555' : '#9B4DCA',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  padding: '13px 14px',
                  borderRadius: '4px',
                  cursor: popupOpen ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
                onMouseEnter={e => {
                  if (!popupOpen) {
                    e.currentTarget.style.background = '#1a0a2e'
                    e.currentTarget.style.color = '#c77dff'
                  }
                }}
                onMouseLeave={e => {
                  if (!popupOpen) {
                    e.currentTarget.style.background = '#0f0f0f'
                    e.currentTarget.style.color = '#9B4DCA'
                  }
                }}
              >
                <GoogleIcon />
                {popupOpen ? '[ aguardando login... ]' : '[ ENTRAR COM GOOGLE ]'}
              </button>

              {/* Popup status indicator */}
              {popupOpen && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.7rem',
                    color: '#555',
                    padding: '8px 12px',
                    background: '#050505',
                    border: '1px solid #111',
                    borderRadius: '3px',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  <span style={{ color: '#9B4DCA', animation: 'pulse 1s infinite' }}>●</span>
                  janela de login aberta — faça login com sua conta Google
                </div>
              )}

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '4px 0',
                }}
              >
                <div style={{ flex: 1, height: '1px', background: '#111' }} />
                <span style={{ fontSize: '0.65rem', color: '#1e1e1e' }}>
                  alternativas
                </span>
                <div style={{ flex: 1, height: '1px', background: '#111' }} />
              </div>

              {/* Alternative: open in new tab */}
              <button
                onClick={handleGoogleDirect}
                style={{
                  background: 'transparent',
                  border: '1px solid #141414',
                  color: '#2a2a2a',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3a3a3a'
                  e.currentTarget.style.color = '#666'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#141414'
                  e.currentTarget.style.color = '#2a2a2a'
                }}
              >
                ↗ abrir site do Moodle em nova aba
              </button>

              {/* Alternative: already logged in */}
              <button
                onClick={handleAlreadyLoggedIn}
                style={{
                  background: 'transparent',
                  border: '1px solid #141414',
                  color: '#2a2a2a',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3a3a3a'
                  e.currentTarget.style.color = '#9B4DCA'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#141414'
                  e.currentTarget.style.color = '#2a2a2a'
                }}
              >
                ✓ já fiz login no Moodle → ir ao dashboard
              </button>

              {/* Open original Moodle (with their session) */}
              <a
                href={MOODLE_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.65rem',
                  color: '#1e1e1e',
                  textDecoration: 'none',
                  padding: '6px',
                  transition: 'color 0.15s',
                  borderRadius: '3px',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.color = '#7B2FBE')
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.color = '#1e1e1e')
                }
              >
                → acessar ava.escolaparque.g12.br diretamente
              </a>

              {/* Note about invalidsesskey */}
              <div
                style={{
                  fontSize: '0.62rem',
                  color: '#151515',
                  lineHeight: 1.8,
                  padding: '8px 10px',
                  borderLeft: '1px solid #111',
                }}
              >
                <span style={{ color: '#1e1e1e' }}>
                  // se receber "invalidsesskey" no Moodle:
                  <br />
                  // o sesskey CSRF expirou durante o fluxo OAuth.
                  <br />
                  // solução: tente novamente ou use login manual.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: '0.65rem',
            color: '#111',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          ava.escolaparque.g12.br &nbsp;·&nbsp; redesign não-oficial
          <br />
          <span style={{ color: '#0e0e0e' }}>
            problemas com Google? use login manual ↑
          </span>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

// ── Error box ──────────────────────────────────────────────────────────
function ErrorBox({
  message,
  onClose,
}: {
  message: string
  onClose?: () => void
}) {
  return (
    <div
      style={{
        fontSize: '0.75rem',
        color: '#ff5555',
        padding: '10px 12px',
        background: '#0f0000',
        border: '1px solid #2a0000',
        borderRadius: '3px',
        lineHeight: 1.6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        justifyContent: 'space-between',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <span>✗ {message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#444',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            cursor: 'pointer',
            padding: '0 2px',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div
      style={{
        width: '12px',
        height: '12px',
        border: '2px solid #3a1a5a',
        borderTop: '2px solid #9B4DCA',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

// ── Google icon ────────────────────────────────────────────────────────
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
