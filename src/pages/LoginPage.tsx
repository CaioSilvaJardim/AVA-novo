import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { moodleLogin, getSiteInfo } from '../api/moodle'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('moodle_token')
    if (token) navigate('/dashboard')
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Preencha usuário e senha.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { token } = await moodleLogin(username, password)
      localStorage.setItem('moodle_token', token)
      try {
        const info = await getSiteInfo(token)
        localStorage.setItem('moodle_userid', String(info.userid))
        localStorage.setItem('moodle_fullname', info.fullname || '')
      } catch {
        /* non-critical */
      }
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      if (msg.toLowerCase().includes('api') || msg.toLowerCase().includes('service')) {
        setError('API REST não habilitada no servidor Moodle.')
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('inválid')) {
        setError('Usuário ou senha incorretos.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '2.5rem',
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            AVA — ESCOLA PARQUE
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.9rem',
              color: '#9B4DCA',
              marginTop: '10px',
              marginBottom: 0,
            }}
          >
            &gt; acesse sua conta
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <input
            type="text"
            placeholder="usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              background: '#0f0f0f',
              border: '1px solid #2a2a2a',
              color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.9rem',
              padding: '12px 14px',
              borderRadius: '4px',
              outline: 'none',
              width: '100%',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => (e.target.style.borderColor = '#7B2FBE')}
            onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
          />
          <input
            type="password"
            placeholder="senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              background: '#0f0f0f',
              border: '1px solid #2a2a2a',
              color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.9rem',
              padding: '12px 14px',
              borderRadius: '4px',
              outline: 'none',
              width: '100%',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => (e.target.style.borderColor = '#7B2FBE')}
            onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
          />

          {error && (
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8rem',
                color: '#ff4444',
                margin: 0,
                padding: '8px 12px',
                background: '#1a0000',
                border: '1px solid #330000',
                borderRadius: '3px',
              }}
            >
              ✗ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#0f0f0f',
              border: '1px solid #7B2FBE',
              color: loading ? '#555' : '#9B4DCA',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.9rem',
              fontWeight: 700,
              padding: '12px 14px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.05em',
              transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              marginTop: '4px',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background = '#1a0a2e'
                ;(e.target as HTMLButtonElement).style.color = '#c77dff'
                ;(e.target as HTMLButtonElement).style.borderColor = '#9B4DCA'
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background = '#0f0f0f'
                ;(e.target as HTMLButtonElement).style.color = '#9B4DCA'
                ;(e.target as HTMLButtonElement).style.borderColor = '#7B2FBE'
              }
            }}
          >
            {loading ? '[ aguarde... ]' : '[ ENTRAR ]'}
          </button>
        </form>

        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: '#333',
            textAlign: 'center',
            margin: 0,
          }}
        >
          ava.escolaparque.g12.br
        </p>
      </div>
    </div>
  )
}
