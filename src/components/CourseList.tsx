import { useState } from 'react'
import { MoodleCourse } from '../api/moodle'

interface Props {
  courses: MoodleCourse[]
  loading: boolean
  theme: 'dark' | 'light'
}

const CURRENT_YEAR = new Date().getFullYear()

export default function CourseList({ courses, loading, theme }: Props) {
  const isDark = theme === 'dark'
  const textColor = isDark ? '#E0E0E0' : '#111'
  const mutedColor = isDark ? '#666' : '#888'
  const cardBg = isDark ? '#0f0f0f' : '#fff'
  const hoverBg = isDark ? '#141414' : '#f5f0ff'

  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const VISIBLE_COUNT = 8

  const currentYear = courses.filter(c => {
    const start = new Date(c.startdate * 1000)
    const end = c.enddate ? new Date(c.enddate * 1000) : null
    return (
      start.getFullYear() === CURRENT_YEAR ||
      (end && end.getFullYear() === CURRENT_YEAR)
    )
  })

  const displayCourses = showAll ? courses : currentYear
  const visibleCourses = expanded ? displayCourses : displayCourses.slice(0, VISIBLE_COUNT)

  const moodleBase = 'https://ava.escolaparque.g12.br'

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${isDark ? '#1a1a1a' : '#e0e0e0'}`,
        borderRadius: '6px',
        padding: '20px',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <h2
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          fontWeight: 700,
          color: textColor,
          margin: '0 0 12px 0',
          paddingLeft: '10px',
          borderLeft: '2px solid #7B2FBE',
          letterSpacing: '0.05em',
          transition: 'color 0.2s',
        }}
      >
        // CURSOS
      </h2>

      {/* Filter toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[false, true].map(all => (
          <button
            key={String(all)}
            onClick={() => { setShowAll(all); setExpanded(false) }}
            style={{
              background: showAll === all ? '#7B2FBE' : 'transparent',
              border: `1px solid ${showAll === all ? '#7B2FBE' : (isDark ? '#333' : '#ccc')}`,
              color: showAll === all ? '#fff' : mutedColor,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              padding: '3px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {all ? 'TODOS' : String(CURRENT_YEAR)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div className="skeleton" key={i} style={{ height: '28px', width: `${50 + i * 8}%` }} />
          ))}
        </div>
      ) : displayCourses.length === 0 ? (
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: mutedColor }}>
          {showAll ? 'Nenhum curso encontrado.' : `Nenhum curso de ${CURRENT_YEAR}.`}
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {visibleCourses.map((course, idx) => (
              <a
                key={course.id}
                href={course.viewurl || `${moodleBase}/course/view.php?id=${course.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-item"
                style={{
                  animationDelay: `${idx * 40}ms`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '3px',
                  textDecoration: 'none',
                  color: textColor,
                  borderLeft: '2px solid transparent',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = hoverBg
                  el.style.borderLeftColor = '#7B2FBE'
                  el.style.color = '#9B4DCA'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'transparent'
                  el.style.borderLeftColor = 'transparent'
                  el.style.color = textColor
                }}
              >
                <span style={{ color: '#7B2FBE', fontSize: '0.75rem', flexShrink: 0 }}>→</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.78rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {course.fullname}
                </span>
              </a>
            ))}
          </div>

          {displayCourses.length > VISIBLE_COUNT && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                display: 'block',
                marginTop: '12px',
                background: 'none',
                border: `1px solid ${isDark ? '#2a2a2a' : '#ddd'}`,
                color: mutedColor,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem',
                padding: '5px 12px',
                borderRadius: '3px',
                cursor: 'pointer',
                width: '100%',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.target as HTMLButtonElement
                el.style.borderColor = '#7B2FBE'
                el.style.color = '#9B4DCA'
              }}
              onMouseLeave={e => {
                const el = e.target as HTMLButtonElement
                el.style.borderColor = isDark ? '#2a2a2a' : '#ddd'
                el.style.color = mutedColor
              }}
            >
              {expanded
                ? '[ VER MENOS ]'
                : `[ VER MAIS — ${displayCourses.length - VISIBLE_COUNT} restante(s) ]`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
