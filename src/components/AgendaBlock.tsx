import { MoodleEvent } from '../api/moodle'

interface Props {
  events: MoodleEvent[]
  loading: boolean
  theme: 'dark' | 'light'
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function dots(name: string, date: string, maxLen = 42): string {
  const total = maxLen - name.length - date.length
  if (total <= 2) return ' '
  return ' ' + '.'.repeat(Math.max(2, total)) + ' '
}

export default function AgendaBlock({ events, loading, theme }: Props) {
  const isDark = theme === 'dark'
  const textColor = isDark ? '#E0E0E0' : '#111'
  const mutedColor = isDark ? '#666' : '#888'
  const cardBg = isDark ? '#0f0f0f' : '#fff'
  const hoverBg = isDark ? '#141414' : '#f5f0ff'

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
          margin: '0 0 16px 0',
          paddingLeft: '10px',
          borderLeft: '2px solid #7B2FBE',
          letterSpacing: '0.05em',
          transition: 'color 0.2s',
        }}
      >
        // AGENDA
      </h2>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map(i => (
            <div className="skeleton" key={i} style={{ height: '32px', width: '100%', borderRadius: '3px' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: mutedColor }}>
          Nenhum evento próximo.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {events.slice(0, 10).map((ev, idx) => {
            const dateStr = formatDate(ev.timestart)
            const fill = dots(ev.name, dateStr)
            return (
              <a
                key={ev.id}
                href={ev.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-item"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '3px',
                  borderLeft: '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = hoverBg
                  el.style.borderLeftColor = '#7B2FBE'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'transparent'
                  el.style.borderLeftColor = 'transparent'
                }}
              >
                <span style={{ color: '#7B2FBE', fontSize: '0.7rem' }}>●</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.78rem',
                    color: textColor,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s',
                  }}
                >
                  {ev.name}
                  <span style={{ color: mutedColor, opacity: 0.5 }}>{fill}</span>
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: mutedColor,
                    flexShrink: 0,
                    transition: 'color 0.2s',
                  }}
                >
                  {dateStr}
                </span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
