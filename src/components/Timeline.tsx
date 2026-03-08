import { MoodleTimelineEvent } from '../api/moodle'

interface Props {
  events: MoodleTimelineEvent[]
  loading: boolean
  theme: 'dark' | 'light'
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Timeline({ events, loading, theme }: Props) {
  const isDark = theme === 'dark'
  const textColor = isDark ? '#E0E0E0' : '#111'
  const mutedColor = isDark ? '#666' : '#888'
  const cardBg = isDark ? '#0f0f0f' : '#fff'

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
      {/* Header */}
      <h2
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          fontWeight: 700,
          color: textColor,
          margin: '0 0 20px 0',
          paddingLeft: '10px',
          borderLeft: '2px solid #7B2FBE',
          letterSpacing: '0.05em',
          transition: 'color 0.2s',
        }}
      >
        // TIMELINE
      </h2>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="skeleton" style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: '12px', width: `${60 + i * 7}%`, marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '10px', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: mutedColor }}>
          Nenhuma atividade pendente.
        </p>
      ) : (
        <div
          style={{
            borderLeft: '2px solid #7B2FBE',
            paddingLeft: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}
        >
          {events.map((ev, idx) => (
            <div
              key={ev.id}
              className="timeline-item"
              style={{
                animationDelay: `${idx * 50}ms`,
                position: 'relative',
                paddingBottom: idx < events.length - 1 ? '16px' : '0',
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-21px',
                  top: '4px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: ev.overdue ? '#444' : '#7B2FBE',
                  border: `2px solid ${isDark ? '#0f0f0f' : '#fff'}`,
                  flexShrink: 0,
                }}
              />

              <a
                href={ev.url || ev.action?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: ev.overdue ? 'line-through' : 'none',
                  color: ev.overdue ? '#444' : textColor,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!ev.overdue) (e.currentTarget as HTMLAnchorElement).style.color = '#9B4DCA'
                }}
                onMouseLeave={e => {
                  if (!ev.overdue) (e.currentTarget as HTMLAnchorElement).style.color = textColor
                }}
              >
                {ev.name}
              </a>

              {ev.course?.fullname && (
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: '#9B4DCA',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.course.fullname}
                </span>
              )}

              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem',
                  color: ev.overdue ? '#444' : mutedColor,
                }}
              >
                {formatDate(ev.timesort || ev.timestart)}
                {ev.overdue && ' — vencida'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
