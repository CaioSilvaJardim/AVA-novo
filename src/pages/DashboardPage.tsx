/**
 * DashboardPage.tsx
 *
 * Supports two auth modes:
 *   1. TOKEN mode  — moodle_token in localStorage (manual login)
 *   2. SESSION mode — user came from Google OAuth; we detect the active
 *      Moodle session via the allorigins CORS proxy and call the REST API
 *      through it. Falls back gracefully if session check fails.
 *
 * On mount:
 *   - If moodle_token present → use token mode
 *   - Else → check session via proxy (checkMoodleSession)
 *     - If session valid → use session mode
 *     - Else → redirect to /
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
import { checkMoodleSession, moodleProxyRest } from '../api/proxy'
import { useTheme } from '../hooks/useTheme'
import Timeline from '../components/Timeline'
import AgendaBlock from '../components/AgendaBlock'
import CalendarMini from '../components/CalendarMini'
import CourseList from '../components/CourseList'

type AuthMode = 'token' | 'session' | 'checking'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const isDark = theme === 'dark'

  const [authMode, setAuthMode] = useState<AuthMode>('checking')
  const [authError, setAuthError] = useState('')

  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [events, setEvents] = useState<MoodleEvent[]>([])
  const [timeline, setTimeline] = useState<MoodleTimelineEvent[]>([])

  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  const [visible, setVisible] = useState(false)
  const [fullname, setFullname] = useState('')
  const [userid, setUserid] = useState(0)

  const bgColor = isDark ? '#080808' : '#f0f0f0'
  const navBg = isDark ? '#0f0f0f' : '#fff'
  const navBorder = isDark ? '#1f1f1f' : '#e0e0e0'
  const textColor = isDark ? '#E0E0E0' : '#111'
  const mutedColor = isDark ? '#666' : '#888'
  void (isDark ? '#0f0f0f' : '#fff') // cardBg used by child components via theme prop

  // ── Load data: token mode ────────────────────────────────────────────
  const loadDataToken = useCallback(
    async (token: string, uid: number) => {
      setLoadingTimeline(true)
      setLoadingEvents(true)
      setLoadingCourses(true)

      getTimelineEvents(token)
        .then(data => setTimeline(data))
        .catch(() => setTimeline([]))
        .finally(() => setLoadingTimeline(false))

      getUpcomingEvents(token)
        .then(data => setEvents(data))
        .catch(() => setEvents([]))
        .finally(() => setLoadingEvents(false))

      getUserCourses(token, uid)
        .then(data => setCourses(data))
        .catch(() => setCourses([]))
        .finally(() => setLoadingCourses(false))
    },
    [],
  )

  // ── Load data: session mode (via proxy) ──────────────────────────────
  const loadDataSession = useCallback(async (uid: number) => {
    setLoadingTimeline(true)
    setLoadingEvents(true)
    setLoadingCourses(true)

    const now = Math.floor(Date.now() / 1000)

    // Timeline
    moodleProxyRest<{ events: MoodleTimelineEvent[] }>(
      'core_calendar_get_action_events_by_timesort',
      {
        timesortfrom: now,
        timesortto: now + 90 * 24 * 3600,
        limitnum: 20,
      },
    )
      .then(r => setTimeline(Array.isArray(r.data?.events) ? r.data!.events : []))
      .catch(() => setTimeline([]))
      .finally(() => setLoadingTimeline(false))

    // Events
    moodleProxyRest<{ events: MoodleEvent[] }>(
      'core_calendar_get_calendar_upcoming_view',
    )
      .then(r => setEvents(Array.isArray(r.data?.events) ? r.data!.events : []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false))

    // Courses
    moodleProxyRest<MoodleCourse[]>('core_enrol_get_users_courses', {
      userid: uid,
    })
      .then(r => setCourses(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false))
  }, [])

  // ── Mount: determine auth mode ────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('moodle_token')

    if (token) {
      // Token mode
      const uidStr = localStorage.getItem('moodle_userid')
      const uid = uidStr ? parseInt(uidStr, 10) : 0
      const name = localStorage.getItem('moodle_fullname') || ''
      setFullname(name)
      setUserid(uid)
      setAuthMode('token')
      const t = setTimeout(() => setVisible(true), 60)
      loadDataToken(token, uid)
      return () => clearTimeout(t)
    }

    // No token — check for active Moodle session (post-Google OAuth)
    let cancelled = false
    const t = setTimeout(() => {
      if (!cancelled) setVisible(true)
    }, 200)

    checkMoodleSession()
      .then(result => {
        if (cancelled) return
        if (result.loggedIn && result.userid) {
          const name = result.fullname || ''
          const uid = result.userid
          setFullname(name)
          setUserid(uid)
          // Persist for future refreshes
          localStorage.setItem('moodle_userid', String(uid))
          localStorage.setItem('moodle_fullname', name)
          localStorage.setItem('moodle_auth_mode', 'session')
          setAuthMode('session')
          setVisible(true)
          loadDataSession(uid)
        } else {
          // No session, no token → redirect to login
          if (!cancelled) navigate('/')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthError(
            'Não foi possível verificar sua sessão. Faça login novamente.',
          )
          setTimeout(() => navigate('/'), 2500)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [navigate, loadDataToken, loadDataSession])

  const handleLogout = () => {
    localStorage.removeItem('moodle_token')
    localStorage.removeItem('moodle_userid')
    localStorage.removeItem('moodle_fullname')
    localStorage.removeItem('moodle_auth_mode')
    navigate('/')
  }

  // ── Auth checking screen ──────────────────────────────────────────────
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
        }}
      >
        {authError ? (
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.85rem',
              color: '#ff4444',
              textAlign: 'center',
              padding: '0 24px',
            }}
          >
            ✗ {authError}
          </p>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.85rem',
                color: '#9B4DCA',
              }}
            >
              &gt; verificando sessão...
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}
            >
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
          </>
        )}
      </div>
    )
  }

  // ── Shared button style ───────────────────────────────────────────────
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
    whiteSpace: 'nowrap',
  }

  const handleBtnEnter = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = '#7B2FBE'
    el.style.color = '#9B4DCA'
  }
  const handleBtnLeave = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = isDark ? '#2a2a2a' : '#ddd'
    el.style.color = mutedColor
  }

  return (
    <div
      className="theme-transition"
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
          padding: '0 20px',
          zIndex: 100,
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: '0.82rem',
            color: '#9B4DCA',
            letterSpacing: '0.02em',
          }}
        >
          AVA — ESCOLA PARQUE
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {/* Auth mode badge */}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem',
              color: authMode === 'session' ? '#4CAF50' : '#666',
              border: `1px solid ${authMode === 'session' ? '#1b4a1e' : '#1f1f1f'}`,
              padding: '2px 6px',
              borderRadius: '2px',
              background:
                authMode === 'session' ? '#0a1a0b' : 'transparent',
            }}
            title={
              authMode === 'session'
                ? 'Logado via Google OAuth (sessão Moodle)'
                : 'Logado via token de API'
            }
          >
            {authMode === 'session' ? '● oauth' : '● token'}
          </span>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={btnStyle}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? '☀ LIGHT' : '☾ DARK'}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={btnStyle}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
          >
            [ SAIR ]
          </button>

          {/* Original site */}
          <a
            href="https://ava.escolaparque.g12.br/my/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btnStyle,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
          >
            → SITE ORIGINAL
          </a>
        </div>
      </nav>

      {/* ── Content ── */}
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
        {/* Greeting */}
        {fullname && (
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
            {authMode === 'session' && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem',
                  color: '#333',
                  marginLeft: '8px',
                }}
              >
                · sessão Google ativa
              </span>
            )}
          </div>
        )}

        {/* Session mode notice */}
        {authMode === 'session' && (
          <div
            className="fade-in-delay-1"
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: isDark ? '#0a0e0a' : '#f0fff0',
              border: `1px solid ${isDark ? '#1b3a1e' : '#c8e6c9'}`,
              borderRadius: '4px',
              borderLeft: '3px solid #4CAF50',
            }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem',
                color: isDark ? '#4CAF50' : '#2e7d32',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              ✓ Sessão Google detectada. Dados carregados via proxy de sessão.
              <br />
              <span style={{ color: isDark ? '#2d5a30' : '#81c784' }}>
                Nota: alguns dados podem estar limitados dependendo das
                permissões da API do servidor Moodle.
              </span>
            </p>
          </div>
        )}

        {/* Grid layout */}
        <div
          className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 60%) minmax(0, 40%)',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="fade-in-delay-1">
              <Timeline
                events={timeline}
                loading={loadingTimeline}
                theme={theme}
              />
            </div>
            <div className="fade-in-delay-2">
              <AgendaBlock
                events={events}
                loading={loadingEvents}
                theme={theme}
              />
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="fade-in-delay-3">
              <CalendarMini events={events} theme={theme} />
            </div>
            <div className="fade-in-delay-4">
              <CourseList
                courses={courses}
                loading={loadingCourses}
                theme={theme}
              />
            </div>
          </div>
        </div>

        {/* Debug info (dev only) */}
        {(import.meta as unknown as { env: { DEV: boolean } }).env.DEV && (
          <div
            style={{
              marginTop: '32px',
              padding: '12px',
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '4px',
            }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.68rem',
                color: '#333',
                margin: 0,
              }}
            >
              // dev · mode: {authMode} · userid: {userid} · fullname:{' '}
              {fullname || '—'} · courses: {courses.length} · events:{' '}
              {events.length} · timeline: {timeline.length}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '40px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            color: isDark ? '#1e1e1e' : '#ccc',
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
      `}</style>
    </div>
  )
}
