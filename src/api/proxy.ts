/**
 * proxy.ts — Client-side CORS proxy helpers
 *
 * Scrapes the Moodle login page through multiple CORS proxy services
 * to extract the dynamic Google OAuth URL (sesskey changes every visit).
 *
 * Strategy:
 *  1. Try multiple CORS proxy services in sequence
 *  2. Extract OAuth URL via regex (handles &amp; entities)
 *  3. Also try extracting sesskey from M.cfg JS object as fallback
 *  4. Build URL from parts if needed
 */

const MOODLE_BASE = 'https://ava.escolaparque.g12.br'
const MOODLE_LOGIN_URL = `${MOODLE_BASE}/login/index.php`

// Multiple CORS proxy services to try in order
const CORS_PROXIES = [
  (url: string) =>
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) =>
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) =>
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) =>
    `https://thingproxy.freeboard.io/fetch/${url}`,
]

// ── Fetch HTML through a proxy, handling different response formats ────
async function fetchHtmlViaProxy(
  proxyFn: (url: string) => string,
  targetUrl: string,
  timeoutMs = 8000,
): Promise<string | null> {
  try {
    const proxyUrl = proxyFn(targetUrl)
    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    })

    if (!res.ok) return null

    const contentType = res.headers.get('content-type') || ''

    // allorigins / codetabs return JSON { contents: "..." }
    if (contentType.includes('application/json')) {
      try {
        const json = await res.json()
        return typeof json.contents === 'string'
          ? json.contents
          : typeof json === 'string'
            ? json
            : null
      } catch {
        return null
      }
    }

    // corsproxy.io / thingproxy return raw HTML
    const text = await res.text()
    return text || null
  } catch {
    return null
  }
}

// ── Extract Google OAuth URL from raw HTML ────────────────────────────
function extractOAuthUrl(html: string): string | null {
  // Primary: match the full href with or without HTML entities
  const patterns = [
    // With &amp; (HTML entities) — most common in raw HTML
    /href="(https?:\/\/ava\.escolaparque\.g12\.br\/auth\/oauth2\/login\.php[^"]+)"/i,
    // Without entities (already decoded)
    /href='(https?:\/\/ava\.escolaparque\.g12\.br\/auth\/oauth2\/login\.php[^']+)'/i,
    // Just the path
    /href="(\/auth\/oauth2\/login\.php[^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let url = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&#38;/g, '&')
        .trim()

      // Ensure absolute URL
      if (url.startsWith('/')) {
        url = `${MOODLE_BASE}${url}`
      }

      // Validate it has a sesskey param
      try {
        const parsed = new URL(url)
        if (parsed.searchParams.get('sesskey')) {
          return url
        }
      } catch {
        // continue trying
      }
    }
  }

  return null
}

// ── Extract sesskey from M.cfg JS block ──────────────────────────────
function extractSesskey(html: string): string | null {
  // M.cfg = {"...","sesskey":"XXXXXXXXXX",...}
  const match = html.match(/"sesskey"\s*:\s*"([^"]+)"/)
  return match ? match[1] : null
}

// ── Build Google OAuth URL from sesskey ──────────────────────────────
function buildOAuthUrl(sesskey: string): string {
  const wantsurl = encodeURIComponent(`${MOODLE_BASE}/`)
  return `${MOODLE_BASE}/auth/oauth2/login.php?id=1&wantsurl=${wantsurl}&sesskey=${sesskey}`
}

// ── Main: fetch Google login URL with dynamic sesskey ─────────────────
export async function fetchGoogleLoginUrl(): Promise<string | null> {
  let html: string | null = null

  // Try each proxy in sequence until one works
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyFn = CORS_PROXIES[i]
    console.log(`[proxy] Trying CORS proxy ${i + 1}/${CORS_PROXIES.length}...`)

    html = await fetchHtmlViaProxy(proxyFn, MOODLE_LOGIN_URL, 8000)

    if (html && html.length > 500) {
      console.log(`[proxy] Got HTML (${html.length} chars) from proxy ${i + 1}`)
      break
    }

    html = null
  }

  if (!html) {
    console.warn('[proxy] All CORS proxies failed — no HTML retrieved')
    return null
  }

  // Try to extract full OAuth URL directly
  const oauthUrl = extractOAuthUrl(html)
  if (oauthUrl) {
    console.log('[proxy] Extracted OAuth URL:', oauthUrl)
    return oauthUrl
  }

  // Fallback: build URL from sesskey only
  const sesskey = extractSesskey(html)
  if (sesskey) {
    const builtUrl = buildOAuthUrl(sesskey)
    console.log('[proxy] Built OAuth URL from sesskey:', builtUrl)
    return builtUrl
  }

  console.warn('[proxy] Could not extract OAuth URL or sesskey from HTML')
  return null
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
  const params = new URLSearchParams({
    wsfunction,
    moodlewsrestformat: 'json',
    ...Object.fromEntries(
      Object.entries(extraParams).map(([k, v]) => [k, String(v)]),
    ),
  })

  const targetUrl = `${MOODLE_BASE}/webservice/rest/server.php?${params.toString()}`

  let lastError = 'Todas as tentativas falharam'

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      const html = await fetchHtmlViaProxy(CORS_PROXIES[i], targetUrl, 12000)
      if (!html) continue

      let parsed: unknown
      try {
        parsed = JSON.parse(html)
      } catch {
        continue
      }

      if (parsed && typeof parsed === 'object' && 'exception' in parsed) {
        const p = parsed as { message?: string; exception?: string }
        return { error: p.message || p.exception || 'Erro Moodle' }
      }

      return { data: parsed as T }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Erro desconhecido'
    }
  }

  return { error: lastError }
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
