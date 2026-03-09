/**
 * DashboardPage.tsx
 *
 * Auth modes:
 *   TOKEN  — moodle_token in localStorage (manual login)
 *            Full Moodle REST API access via wstoken.
 *            Shows full dashboard: Timeline + Agenda + Calendar + Courses.
 *
 *   SESSION — user logged in via Google OAuth on Moodle's real login page.
 *             Browser has Moodle session cookies, but cross-origin CORS blocks
 *             API calls. Shows embedded Moodle iframe + quick links.
 *
 * On mount:
 *   - moodle_token present → TOKEN mode
 *   - moodle_auth_mode === 'session' → SESSION mode
 *   - else → redirect to /
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUserCourses,
  getUpcomingEvents,
  getTimelineEvents,
  MoodleCourse,
  MoodleEvent,
  MoodleTimelineEvent,
} from '../api/moodle'
import { useTheme } from '../hooks/useTheme'
import Timeline from '../components/Timeline'
import AgendaBlock from '../components/AgendaBlock'
import CalendarMini from '../components/CalendarMini'
import CourseList from '../components/CourseList'

type AuthMode = 'token' | 'session' | 'checking'

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const isDark = theme === 'dark'

  const [authMode, setAuthMode] = useState<AuthMode>('checking')

  // Token mode data
  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [events, setEvents] = useState<MoodleEvent[]>([])
  const [timeline, setTimeline] = useState<MoodleTimelineEvent[]>([])

  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  const [visible, setVisible] = useState(false)
  const [fullname, setFullname] = useState('')
  const [userid, setUserid] = useState(0)

  // Session mode
  const [iframeSection, setIframeSection] = useState<'timeline' | 'courses' | 'calendar'>('timeline')

  // Theme colors
  const bgColor = isDark ? '#080808' : '#f0f0f0'
  const navBg = isDark ? '#0f0f0f' : '#fff'
  const navBorder = isDark ? '#1f1f1f' : '#e0e0e0'
  const textColor = isDark ? '#E0E0E0' : '#111'
  const mutedColor = isDark ? '#666' : '#888'
  const cardBg = isDark ? '#0f0f0f' : '#fff'
  const cardBorder = isDark ? '#1f1f1f' : '#e0e0e0'

  // ── Load data (token mode) ───────────────────────────────────────────
  const loadDataToken = useCallback(async (token: string, uid: number) => {
    setLoadingTimeline(true)
    setLoadingEvents(true)
    setLoadingCourses(true)

    getTimelineEvents(token)
      .then(d => setTimeline(d))
      .catch(() => setTimeline([]))
      .finally(() => setLoadingTimeline(false))

    getUpcomingEvents(token)
      .then(d => setEvents(d))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false))

    getUserCourses(token, uid)
      .then(d => setCourses(d))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false))
  }, [])

  // ── Mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('moodle_token')

    if (token) {
      const uid = parseInt(localStorage.getItem('moodle_userid') || '0', 10)
      const name = localStorage.getItem('moodle_fullname') || ''
      setFullname(name)
      setUserid(uid)
      setAuthMode('token')
      setTimeout(() => setVisible(true), 60)
      loadDataToken(token, uid)
      return
    }

    const storedMode = localStorage.getItem('moodle_auth_mode')
    if (storedMode === 'session') {
      setAuthMode('session')
      setLoadingCourses(false)
      setLoadingEvents(false)
      setLoadingTimeline(false)
      setTimeout(() => setVisible(true), 60)
      return
    }

    navigate('/')
  }, [navigate, loadDataToken])

  const handleLogout = () => {
    localStorage.removeItem('moodle_token')
    localStorage.removeItem('moodle_userid')
    localStorage.removeItem('moodle_fullname')
    localStorage.removeItem('moodle_auth_mode')
    navigate('/')
  }

  // ── Checking screen ──────────────────────────────────────────────────
  if (authMode === 'checking') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div style={{ fontSize: '0.85rem', color: '#9B4DCA' }}>
          &gt; verificando sessão...
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="skeleton"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Shared nav button style ──────────────────────────────────────────
  const btnStyle: React.CSSProperties = {
    background: isDark ? '#0f0f0f' : '#f5f5f5',
    border: `1px solid ${isDark ? '#2a2a2a' : '#ddd'}`,
    color: mutedColor,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    padding: '5px 10px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  }

  const handleBtnEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = '#7B2FBE'
    e.currentTarget.style.color = '#9B4DCA'
  }
  const handleBtnLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = isDark ? '#2a2a2a' : '#ddd'
    e.currentTarget.style.color = mutedColor
  }

  // ── Iframe URLs for session mode ─────────────────────────────────────
  const iframeUrls: Record<typeof iframeSection, string> = {
    timeline: `${MOODLE_BASE}/my/`,
    courses: `${MOODLE_BASE}/my/courses.php`,
    calendar: `${MOODLE_BASE}/calendar/view.php?view=upcoming`,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bgColor,
        color: textColor,
        transition: 'background 0.2s, color 0.2s',
      }}
    >
      {/* ── Navbar ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '52px',
          background: navBg,
          borderBottom: `1px solid ${navBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100,
          transition: 'background 0.2s, border-color 0.2s',
          gap: '12px',
        }}
      >
        {/* Brand */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: '0.82rem',
            color: '#9B4DCA',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          AVA — ESCOLA PARQUE
        </span>

        {/* Nav actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap' as const,
          }}
        >
          {/* Auth badge */}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem',
              color: authMode === 'token' ? '#4CAF50' : '#9B4DCA',
              border: `1px solid ${authMode === 'token' ? '#1b4a1e' : '#3a1a5a'}`,
              padding: '2px 7px',
              borderRadius: '2px',
              background: authMode === 'token' ? '#0a1a0b' : '#1a0a2e',
              flexShrink: 0,
            }}
            title={
              authMode === 'token'
                ? 'Logado via token de API (login manual)'
                : 'Logado via Google OAuth (sessão Moodle)'
            }
          >
            {authMode === 'token' ? '● token' : '● oauth'}
          </span>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={btnStyle as React.CSSProperties}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? '☀ LIGHT' : '☾ DARK'}
          </button>

          {/* Sair */}
          <button
            onClick={handleLogout}
            style={btnStyle as React.CSSProperties}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
          >
            [ SAIR ]
          </button>

          {/* Site original */}
          <a
            href="https://ava.escolaparque.g12.br/my/"
            target="_blank"
            rel="noopener noreferrer"
            style={btnStyle as React.CSSProperties}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
          >
            → SITE ORIGINAL
          </a>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          paddingTop: '80px',
          paddingBottom: '40px',
          paddingLeft: '20px',
          paddingRight: '20px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {/* Greeting (token mode) */}
        {fullname && authMode === 'token' && (
          <div style={{ marginBottom: '24px' }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8rem',
                color: mutedColor,
              }}
            >
              &gt; olá,{' '}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8rem',
                color: '#9B4DCA',
                fontWeight: 600,
              }}
            >
              {fullname}
            </span>
            {userid > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem',
                  color: '#2a2a2a',
                  marginLeft: '8px',
                }}
              >
                #{userid}
              </span>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            SESSION MODE — Google OAuth
            User is logged in on Moodle but we can't call the API.
            Show embedded Moodle pages + quick action links.
        ══════════════════════════════════════════════════════════ */}
        {authMode === 'session' && (
          <div
            className="fade-in-delay-1"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Status banner */}
            <div
              style={{
                padding: '14px 16px',
                background: isDark ? '#0e0a1a' : '#f5f0ff',
                border: `1px solid ${isDark ? '#3a1a5a' : '#c4a0e8'}`,
                borderLeft: '3px solid #7B2FBE',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap' as const,
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.78rem',
                    color: '#9B4DCA',
                    margin: '0 0 4px 0',
                    fontWeight: 700,
                  }}
                >
                  ✓ sessão Google ativa no Moodle
                </p>
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.68rem',
                    color: mutedColor,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Dados da API indisponíveis via OAuth (restrição CORS).
                  Use o login manual para acesso completo ao dashboard.
                </p>
              </div>

              {/* Switch to token login */}
              <button
                onClick={handleLogout}
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #7B2FBE',
                  color: '#9B4DCA',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.72rem',
                  padding: '7px 12px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#1a0a2e'
                  e.currentTarget.style.color = '#c77dff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#0f0f0f'
                  e.currentTarget.style.color = '#9B4DCA'
                }}
              >
                → login manual
              </button>
            </div>

            {/* Section switcher */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                borderBottom: `1px solid ${cardBorder}`,
                paddingBottom: '0',
              }}
            >
              {(
                [
                  { key: 'timeline', label: '// DASHBOARD' },
                  { key: 'courses', label: '// CURSOS' },
                  { key: 'calendar', label: '// AGENDA' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setIframeSection(tab.key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${iframeSection === tab.key ? '#7B2FBE' : 'transparent'}`,
                    color:
                      iframeSection === tab.key ? '#9B4DCA' : mutedColor,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    fontWeight: iframeSection === tab.key ? 700 : 400,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Moodle iframe */}
            <div
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Iframe label */}
              <div
                style={{
                  padding: '6px 12px',
                  background: isDark ? '#0a0a0a' : '#f9f9f9',
                  borderBottom: `1px solid ${cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.62rem',
                    color: '#333',
                  }}
                >
                  ↳ ava.escolaparque.g12.br — sua sessão Google está ativa
                </span>
                <a
                  href={iframeUrls[iframeSection]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem',
                    color: '#2a2a2a',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.color = '#9B4DCA')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.color = '#2a2a2a')
                  }
                >
                  ↗ abrir em nova aba
                </a>
              </div>

              <iframe
                key={iframeSection}
                src={iframeUrls[iframeSection]}
                title="Moodle AVA"
                style={{
                  width: '100%',
                  height: '600px',
                  border: 'none',
                  display: 'block',
                }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              />
            </div>

            {/* Quick links */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '8px',
              }}
            >
              {[
                { label: '→ meus cursos', url: `${MOODLE_BASE}/my/courses.php` },
                { label: '→ agenda', url: `${MOODLE_BASE}/calendar/view.php` },
                { label: '→ mensagens', url: `${MOODLE_BASE}/message/index.php` },
                { label: '→ perfil', url: `${MOODLE_BASE}/user/profile.php` },
              ].map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '10px 12px',
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: '3px',
                    textDecoration: 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: mutedColor,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#7B2FBE'
                    e.currentTarget.style.color = '#9B4DCA'
                    e.currentTarget.style.borderLeft = '2px solid #7B2FBE'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = cardBorder
                    e.currentTarget.style.color = mutedColor
                    e.currentTarget.style.borderLeft = `1px solid ${cardBorder}`
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Technical note */}
            <div
              style={{
                padding: '10px 14px',
                background: isDark ? '#050505' : '#fafafa',
                border: `1px solid ${cardBorder}`,
                borderRadius: '3px',
              }}
            >
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.62rem',
                  color: isDark ? '#1e1e1e' : '#ccc',
                  margin: 0,
                  lineHeight: 1.9,
                }}
              >
                // modo: oauth · acesso à API indisponível (CORS + SameSite=Lax)
                <br />
                // para dashboard completo: use login manual (usuário + senha)
                <br />
                // ou peça ao admin para habilitar o serviço moodle_mobile_app
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TOKEN MODE — Full dashboard
        ══════════════════════════════════════════════════════════ */}
        {authMode === 'token' && (
          <>
            <div
              className="dashboard-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 60%) minmax(0, 40%)',
                gap: '16px',
                alignItems: 'start',
              }}
            >
              {/* Left: Timeline + Agenda */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="fade-in-delay-1">
                  <Timeline events={timeline} loading={loadingTimeline} theme={theme} />
                </div>
                <div className="fade-in-delay-2">
                  <AgendaBlock events={events} loading={loadingEvents} theme={theme} />
                </div>
              </div>

              {/* Right: Calendar + Courses */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="fade-in-delay-3">
                  <CalendarMini events={events} theme={theme} />
                </div>
                <div className="fade-in-delay-4">
                  <CourseList courses={courses} loading={loadingCourses} theme={theme} />
                </div>
              </div>
            </div>

            {/* Dev debug info */}
            {(import.meta as unknown as { env: { DEV: boolean } }).env.DEV && (
              <div
                style={{
                  marginTop: '32px',
                  padding: '12px',
                  background: isDark ? '#0a0a0a' : '#f5f5f5',
                  border: `1px solid ${isDark ? '#1a1a1a' : '#e0e0e0'}`,
                  borderRadius: '4px',
                }}
              >
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    color: isDark ? '#222' : '#bbb',
                    margin: 0,
                    lineHeight: 1.8,
                  }}
                >
                  // dev · mode: {authMode} · userid: {userid} · fullname:{' '}
                  {fullname || '—'} · courses: {courses.length} · events:{' '}
                  {events.length} · timeline: {timeline.length}
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '40px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            color: isDark ? '#111' : '#ccc',
            transition: 'color 0.2s',
          }}
        >
          AVA — ESCOLA PARQUE · redesign não oficial · ava.escolaparque.g12.br
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in-delay-1 { animation: fadeIn 0.35s ease 0.05s both; }
        .fade-in-delay-2 { animation: fadeIn 0.35s ease 0.12s both; }
        .fade-in-delay-3 { animation: fadeIn 0.35s ease 0.18s both; }
        .fade-in-delay-4 { animation: fadeIn 0.35s ease 0.25s both; }
      `}</style>
    </div>
  )
}
