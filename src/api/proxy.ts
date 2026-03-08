/**
 * proxy.ts — Client-side CORS proxy helpers
 *
 * Since this is a pure Vite SPA (no server-side API routes), we use
 * allorigins.win as a CORS proxy to scrape the Moodle login page
 * and extract the dynamic Google OAuth URL (sesskey changes every visit).
 *
 * For Moodle REST API calls we use the token approach (if available)
 * or direct fetch when the user's browser has the Moodle session cookie
 * (same-origin with wantsurl pointing back to our app).
 */

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'
const CORS_PROXY = 'https://api.allorigins.win/get?url='

// ── Scrape Moodle login page and extract Google OAuth URL ─────────────
export async function fetchGoogleLoginUrl(): Promise<string | null> {
  try {
    const targetUrl = encodeURIComponent(`${MOODLE_BASE}/login/index.php`)
    const res = await fetch(`${CORS_PROXY}${targetUrl}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`CORS proxy returned ${res.status}`)
    const data = await res.json()
    const html: string = data.contents || ''

    // Extract href from <a class="login-identityprovider-btn" href="...">
    // Pattern: auth/oauth2/login.php?id=1&...&sesskey=XXXXXXXX
    const match = html.match(
      /href="(https?:\/\/ava\.escolaparque\.g12\.br\/auth\/oauth2\/login\.php[^"]+)"/,
    )
    if (match && match[1]) {
      // Decode HTML entities
      return match[1].replace(/&amp;/g, '&')
    }

    // Fallback: search for any oauth2 login link
    const fallback = html.match(/href="([^"]*auth\/oauth2\/login\.php[^"]*)"/i)
    if (fallback && fallback[1]) {
      return fallback[1].replace(/&amp;/g, '&')
    }

    return null
  } catch (err) {
    console.warn('[proxy] fetchGoogleLoginUrl failed:', err)
    return null
  }
}

// ── Extract sesskey from an OAuth URL ────────────────────────────────
export function extractSesskey(url: string): string | null {
  try {
    const u = new URL(url)
    return u.searchParams.get('sesskey')
  } catch {
    return null
  }
}

// ── Moodle REST call via CORS proxy (session-based, no token) ────────
export interface ProxyCallResult<T> {
  data?: T
  error?: string
}

export async function moodleProxyRest<T>(
  wsfunction: string,
  extraParams: Record<string, string | number> = {},
): Promise<ProxyCallResult<T>> {
  try {
    const params = new URLSearchParams({
      wsfunction,
      moodlewsrestformat: 'json',
      ...Object.fromEntries(
        Object.entries(extraParams).map(([k, v]) => [k, String(v)]),
      ),
    })

    const targetUrl = encodeURIComponent(
      `${MOODLE_BASE}/webservice/rest/server.php?${params.toString()}`,
    )

    const res = await fetch(`${CORS_PROXY}${targetUrl}`, {
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`Proxy error ${res.status}`)

    const wrapper = await res.json()
    const raw = wrapper.contents

    let parsed: unknown
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      throw new Error('Resposta inválida do servidor Moodle.')
    }

    if (parsed && typeof parsed === 'object' && 'exception' in parsed) {
      const p = parsed as { message?: string; exception?: string }
      return { error: p.message || p.exception || 'Erro Moodle' }
    }

    return { data: parsed as T }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: msg }
  }
}

// ── Check if user has an active Moodle session (via proxy) ───────────
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
