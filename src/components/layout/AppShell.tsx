import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="app-shell"><a href="#main-content" className="skip-link">Pular para o conteúdo</a><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="app-main"><Header onMenu={() => setMenuOpen(true)} /><main id="main-content" className="main-content"><Outlet /></main></div></div>
}
