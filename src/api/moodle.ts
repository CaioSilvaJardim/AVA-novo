const MOODLE_BASE = 'https://ava.escolaparque.g12.br'

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

// ── Auth ──────────────────────────────────────────────────────────────
export async function moodleLogin(
  username: string,
  password: string,
): Promise<{ token: string; error?: string }> {
  const params = new URLSearchParams({
    username,
    password,
    service: 'moodle_mobile_app',
  })
  const res = await fetch(`${MOODLE_BASE}/login/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  if (!data.token) throw new Error('Token não recebido do servidor.')
  return { token: data.token }
}

// ── Generic REST call ─────────────────────────────────────────────────
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

// ── Site info (to get userid) ─────────────────────────────────────────
export async function getSiteInfo(
  token: string,
): Promise<{ userid: number; username: string; fullname: string }> {
  return moodleRest(token, 'core_webservice_get_site_info')
}

// ── Courses ───────────────────────────────────────────────────────────
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

// ── Upcoming events ───────────────────────────────────────────────────
export async function getUpcomingEvents(
  token: string,
): Promise<MoodleEvent[]> {
  const data = await moodleRest<{ events: MoodleEvent[] }>(
    token,
    'core_calendar_get_calendar_upcoming_view',
  )
  return Array.isArray(data?.events) ? data.events : []
}

// ── Timeline ──────────────────────────────────────────────────────────
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
