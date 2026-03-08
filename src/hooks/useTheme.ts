import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('ava_theme')
    return (saved === 'light' ? 'light' : 'dark') as Theme
  })

  useEffect(() => {
    localStorage.setItem('ava_theme', theme)
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return [theme, toggle]
}
