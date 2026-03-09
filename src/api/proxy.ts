/**
 * proxy.ts — Moodle session proxy helpers
 *
 * IMPORTANT: Direct CORS proxy approaches to scrape sesskey are fundamentally
 * broken because:
 *   1. The CORS proxy fetches the page with ITS OWN HTTP session → gets a
 *      sesskey valid only for that proxy's session, not the user's browser
 *   2. When the user's browser uses that sesskey, Moodle rejects it:
 *      "error/moodle/invalidsesskey"
 *
 * CORRECT APPROACH:
 *   - Google login: redirect user directly to Moodle's login page
 *     The user's browser gets its own sesskey, logs in, comes back
 *   - Token login: POST to token.php (works if REST API enabled)
 *   - Session detection: try to call webservice with no token — only works
 *     if the Moodle server allows CORS with credentials (unlikely)
 *
 * This file provides:
 *   - moodleProxyRest: attempts REST calls via CORS proxy (for session mode)
 *   - checkMoodleSession: checks if user has active Moodle session
 */

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'

// ── Moodle REST call via CORS proxy (session-based, no token) ────────
// NOTE: This only works if Moodle allows cross-origin requests with cookies.
// Most Moodle servers do NOT, so this is a best-effort attempt.
export interface ProxyCallResult<T> {
  data?: T
  error?: string
}

export async function moodleProxyRest<T>(
  wsfunction: string,
  extraParams: Record<string, string | number> = {},
): Promise<ProxyCallResult<T>> {
  const params = new URLSearchParams({
    wsfunction,
    moodlewsrestformat: 'json',
    ...Object.fromEntries(
      Object.entries(extraParams).map(([k, v]) => [k, String(v)]),
    ),
  })

  const targetUrl = `${MOODLE_BASE}/webservice/rest/server.php?${params.toString()}`

  // Try via allorigins (doesn't forward cookies — session calls won't authenticate)
  // but may return public data or error messages
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { error: `HTTP ${res.status}` }
    const json = await res.json()
    const content = json.contents as string
    if (!content) return { error: 'Resposta vazia do proxy' }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return { error: 'Resposta inválida do servidor' }
    }

    if (parsed && typeof parsed === 'object' && 'exception' in parsed) {
      const p = parsed as { message?: string; exception?: string; errorcode?: string }
      // Session required — user is not authenticated via this proxy
      if (p.errorcode === 'servicerequireslogin' || p.errorcode === 'requireloginerror') {
        return { error: 'session_required' }
      }
      return { error: p.message || p.exception || 'Erro Moodle' }
    }

    return { data: parsed as T }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro de conexão' }
  }
}

// ── Check if user has an active Moodle session ───────────────────────
// This is best-effort — will likely return session_required for cross-origin calls
export async function checkMoodleSession(): Promise<{
  loggedIn: boolean
  userid?: number
  fullname?: string
}> {
  const result = await moodleProxyRest<{
    userid: number
    fullname: string
    sitename: string
  }>('core_webservice_get_site_info')

  if (result.data && result.data.userid && result.data.userid > 0) {
    return {
      loggedIn: true,
      userid: result.data.userid,
      fullname: result.data.fullname,
    }
  }
  return { loggedIn: false }
}
