import { useState } from 'react'
import { MoodleEvent } from '../api/moodle'

interface Props {
  events: MoodleEvent[]
  theme: 'dark' | 'light'
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function CalendarMini({ events, theme }: Props) {
  const isDark = theme === 'dark'
  const textColor = isDark ? '#E0E0E0' : '#111'
  const mutedColor = isDark ? '#444' : '#aaa'
  const cardBg = isDark ? '#0f0f0f' : '#fff'
  const cellBg = isDark ? '#1a1a1a' : '#f5f5f5'

  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Days with events
  const eventDays = new Set<number>()
  events.forEach(ev => {
    const d = new Date(ev.timestart * 1000)
    if (d.getFullYear() === year && d.getMonth() === month) {
      eventDays.add(d.getDate())
    }
  })

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()

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
        // CALENDÁRIO
      </h2>

      {/* Month nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: 'none',
            border: 'none',
            color: '#7B2FBE',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '2px 6px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => ((e.target as HTMLButtonElement).style.color = '#c77dff')}
          onMouseLeave={e => ((e.target as HTMLButtonElement).style.color = '#7B2FBE')}
        >
          ◄
        </button>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.78rem',
            color: textColor,
            fontWeight: 600,
            transition: 'color 0.2s',
          }}
        >
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          style={{
            background: 'none',
            border: 'none',
            color: '#7B2FBE',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '2px 6px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => ((e.target as HTMLButtonElement).style.color = '#c77dff')}
          onMouseLeave={e => ((e.target as HTMLButtonElement).style.color = '#7B2FBE')}
        >
          ►
        </button>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          marginBottom: '4px',
        }}
      >
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.65rem',
              color: mutedColor,
              textAlign: 'center',
              padding: '2px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}
      >
        {cells.map((day, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 2px',
              borderRadius: '4px',
              background: day && isToday(day) ? '#7B2FBE' : day ? cellBg : 'transparent',
              minHeight: '30px',
              transition: 'background 0.15s',
            }}
          >
            {day && (
              <>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    color: isToday(day) ? '#fff' : textColor,
                    fontWeight: isToday(day) ? 700 : 400,
                    lineHeight: 1,
                    transition: 'color 0.2s',
                  }}
                >
                  {day}
                </span>
                {eventDays.has(day) && !isToday(day) && (
                  <span
                    style={{
                      display: 'block',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: '#9B4DCA',
                      marginTop: '2px',
                    }}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
