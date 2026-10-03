import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const previousMenuOpen = useRef(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (menuOpen) document.querySelector<HTMLButtonElement>('.sidebar-close')?.focus()
    else if (previousMenuOpen.current && window.matchMedia('(max-width: 720px)').matches) menuButton.current?.focus()
    previousMenuOpen.current = menuOpen
  }, [menuOpen])
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])
  return <div className="app-shell"><a href="#main-content" className="skip-link">Pular para o conteúdo</a><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="app-main"><Header menuOpen={menuOpen} onMenu={() => setMenuOpen((open) => !open)} menuButtonRef={menuButton} /><main id="main-content" className="main-content"><Outlet /></main></div></div>
}
