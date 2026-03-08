/**
 * moodle.ts — Moodle REST API client
 *
 * Supports two authentication modes:
 *   1. TOKEN mode  — uses wstoken= parameter (moodle_mobile_app service)
 *   2. SESSION mode — uses the CORS proxy (allorigins) with session cookies
 *      (session cookies are handled by the browser automatically after OAuth)
 *
 * For the session-based proxy, see proxy.ts → moodleProxyRest.
 */

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'

// ── Types ─────────────────────────────────────────────────────────────
export interface MoodleCourse {
  id: number
  fullname: string
  shortname: string
  startdate: number
  enddate: number
  viewurl?: string
}

export interface MoodleEvent {
  id: number
  name: string
  timestart: number
  url: string
  course?: { fullname: string }
  normalisedeventtype?: string
}

export interface MoodleTimelineEvent {
  id: number
  name: string
  timestart: number
  timesort: number
  url: string
  course?: { id: number; fullname: string }
  overdue?: boolean
  action?: { actionable: boolean; url: string }
}

export interface MoodleSiteInfo {
  userid: number
  username: string
  fullname: string
  sitename: string
}

// ── Auth: token login (manual username/password) ─────────────────────
export async function moodleLogin(
  username: string,
  password: string,
): Promise<{ token: string }> {
  const params = new URLSearchParams({
    username,
    password,
    service: 'moodle_mobile_app',
  })

  const res = await fetch(`${MOODLE_BASE}/login/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    mode: 'cors',
  })

  if (!res.ok) {
    throw new Error(`Erro de rede: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  if (data.error) {
    const msg: string = data.error
    if (
      msg.includes('enablewsdescription') ||
      msg.includes('web service') ||
      msg.includes('not enabled')
    ) {
      throw new Error(
        'API REST não habilitada no servidor. Use o login com Google.',
      )
    }
    if (
      msg.includes('Invalid login') ||
      msg.includes('invalid login') ||
      msg.includes('invalidlogin')
    ) {
      throw new Error('Usuário ou senha incorretos.')
    }
    throw new Error(data.error)
  }

  if (!data.token) {
    throw new Error('Token não recebido. Verifique suas credenciais.')
  }

  return { token: data.token }
}

// ── Generic REST call (token-based) ───────────────────────────────────
export async function moodleRest<T>(
  token: string,
  wsfunction: string,
  extraParams: Record<string, string | number> = {},
): Promise<T> {
  const params = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: 'json',
    ...Object.fromEntries(
      Object.entries(extraParams).map(([k, v]) => [k, String(v)]),
    ),
  })

  const res = await fetch(`${MOODLE_BASE}/webservice/rest/server.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()
  if (data && data.exception) throw new Error(data.message || data.exception)
  return data as T
}

// ── Site info (token mode) ────────────────────────────────────────────
export async function getSiteInfo(token: string): Promise<MoodleSiteInfo> {
  return moodleRest<MoodleSiteInfo>(token, 'core_webservice_get_site_info')
}

// ── Courses (token mode) ──────────────────────────────────────────────
export async function getUserCourses(
  token: string,
  userid: number,
): Promise<MoodleCourse[]> {
  const data = await moodleRest<MoodleCourse[]>(
    token,
    'core_enrol_get_users_courses',
    { userid },
  )
  return Array.isArray(data) ? data : []
}

// ── Upcoming events (token mode) ──────────────────────────────────────
export async function getUpcomingEvents(
  token: string,
): Promise<MoodleEvent[]> {
  const data = await moodleRest<{ events: MoodleEvent[] }>(
    token,
    'core_calendar_get_calendar_upcoming_view',
  )
  return Array.isArray(data?.events) ? data.events : []
}

// ── Timeline (token mode) ─────────────────────────────────────────────
export async function getTimelineEvents(
  token: string,
): Promise<MoodleTimelineEvent[]> {
  const now = Math.floor(Date.now() / 1000)
  const data = await moodleRest<{ events: MoodleTimelineEvent[] }>(
    token,
    'core_calendar_get_action_events_by_timesort',
    {
      timesortfrom: now,
      timesortto: now + 90 * 24 * 3600,
      limitnum: 20,
    },
  )
  return Array.isArray(data?.events) ? data.events : []
}

// ── Session-based calls (via proxy, no token) ─────────────────────────
// These use moodleProxyRest from proxy.ts — imported by dashboard
export { moodleProxyRest } from './proxy'
