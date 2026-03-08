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

export default function DashboardPage() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const isDark = theme === 'dark'

  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [events, setEvents] = useState<MoodleEvent[]>([])
  const [timeline, setTimeline] = useState<MoodleTimelineEvent[]>([])

  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  const [visible, setVisible] = useState(false)
  const [fullname, setFullname] = useState('')

  const bgColor = isDark ? '#080808' : '#f0f0f0'
  const navBg = isDark ? '#0f0f0f' : '#fff'
  const navBorder = isDark ? '#1f1f1f' : '#e0e0e0'
  const mutedColor = isDark ? '#666' : '#888'

  const loadData = useCallback(async (token: string, userid: number) => {
    // Timeline
    getTimelineEvents(token)
      .then(data => setTimeline(data))
      .catch(() => setTimeline([]))
      .finally(() => setLoadingTimeline(false))

    // Events
    getUpcomingEvents(token)
      .then(data => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false))

    // Courses
    getUserCourses(token, userid)
      .then(data => setCourses(data))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('moodle_token')
    if (!token) {
      navigate('/')
      return
    }
    const useridStr = localStorage.getItem('moodle_userid')
    const userid = useridStr ? parseInt(useridStr, 10) : 0
    const name = localStorage.getItem('moodle_fullname') || ''
    setFullname(name)

    const t = setTimeout(() => setVisible(true), 60)
    loadData(token, userid)
    return () => clearTimeout(t)
  }, [navigate, loadData])

  const handleLogout = () => {
    localStorage.removeItem('moodle_token')
    localStorage.removeItem('moodle_userid')
    localStorage.removeItem('moodle_fullname')
    navigate('/')
  }

  const btnStyle = {
    background: '#0f0f0f',
    border: `1px solid ${isDark ? '#2a2a2a' : '#ccc'}`,
    color: mutedColor,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    padding: '5px 10px',
    borderRadius: '3px',
    cursor: 'pointer' as const,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  }

  return (
    <div
      className="theme-transition"
      style={{
        minHeight: '100vh',
        background: bgColor,
        transition: 'background 0.2s',
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
          padding: '0 24px',
          zIndex: 100,
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#9B4DCA',
            letterSpacing: '0.02em',
          }}
        >
          AVA — ESCOLA PARQUE
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {fullname && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                color: mutedColor,
                display: 'none',
              }}
              className="hidden sm:inline"
            >
              {fullname}
            </span>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              ...btnStyle,
              background: isDark ? '#0f0f0f' : '#f5f5f5',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = '#7B2FBE'
              ;(e.target as HTMLButtonElement).style.color = '#9B4DCA'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = isDark ? '#2a2a2a' : '#ccc'
              ;(e.target as HTMLButtonElement).style.color = mutedColor
            }}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? '☀ LIGHT' : '☾ DARK'}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              ...btnStyle,
              background: isDark ? '#0f0f0f' : '#f5f5f5',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = '#7B2FBE'
              ;(e.target as HTMLButtonElement).style.color = '#9B4DCA'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = isDark ? '#2a2a2a' : '#ccc'
              ;(e.target as HTMLButtonElement).style.color = mutedColor
            }}
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
              background: isDark ? '#0f0f0f' : '#f5f5f5',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = '#7B2FBE'
              el.style.color = '#9B4DCA'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = isDark ? '#2a2a2a' : '#ccc'
              el.style.color = mutedColor
            }}
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
          <div
            style={{
              marginBottom: '24px',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.4s ease 0.1s',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8rem',
                color: mutedColor,
                transition: 'color 0.2s',
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
          </div>
        )}

        {/* Grid layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 60%) minmax(0, 40%)',
            gap: '16px',
            alignItems: 'start',
          }}
          className="dashboard-grid"
        >
          {/* Left column */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div
              className="fade-in-delay-1"
            >
              <Timeline
                events={timeline}
                loading={loadingTimeline}
                theme={theme}
              />
            </div>
            <div
              className="fade-in-delay-2"
            >
              <AgendaBlock
                events={events}
                loading={loadingEvents}
                theme={theme}
              />
            </div>
          </div>

          {/* Right column */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
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

        {/* Footer */}
        <div
          style={{
            marginTop: '40px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            color: isDark ? '#222' : '#ccc',
            transition: 'color 0.2s',
          }}
        >
          AVA — ESCOLA PARQUE · redesign não oficial · ava.escolaparque.g12.br
        </div>
      </main>

      {/* Responsive grid style */}
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
