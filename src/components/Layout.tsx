import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Music, Piano, Activity, Drum, BarChart2, Stars,
  Headphones, AlignLeft, Target, Wind, ChevronLeft, ChevronRight, Home
} from 'lucide-react'

const TOOLS = [
  { path: '/circle-of-fifths', name: 'Circle of Fifths', Icon: Music,       color: '#a855f7' },
  { path: '/chord-builder',    name: 'Chord Builder',    Icon: Piano,       color: '#3b82f6' },
  { path: '/oscilloscope',     name: 'Oscilloscope',     Icon: Activity,    color: '#22c55e' },
  { path: '/drum-machine',     name: 'Drum Machine',     Icon: Drum,        color: '#f97316' },
  { path: '/spectrum',         name: 'Spectrum Analyzer',Icon: BarChart2,   color: '#06b6d4' },
  { path: '/galaxy-map',       name: 'Galaxy Map',       Icon: Stars,       color: '#6366f1' },
  { path: '/ear-training',     name: 'Ear Training',     Icon: Headphones,  color: '#eab308' },
  { path: '/piano-roll',       name: 'Piano Roll',       Icon: AlignLeft,   color: '#ec4899' },
  { path: '/tuner',            name: 'Tuner',            Icon: Target,      color: '#14b8a6' },
  { path: '/ambient',          name: 'Ambient Engine',   Icon: Wind,        color: '#8b5cf6' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#030712', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220,
        minWidth: collapsed ? 56 : 220,
        background: '#0a0f1e',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {!collapsed && (
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontWeight: 700, fontSize: 15, letterSpacing: 1, textShadow: '0 0 10px #a855f7' }}>
              MusicTools
            </button>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, display: 'flex', alignItems: 'center' }}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Home link */}
        <div style={{ padding: '8px 8px 4px' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 6, textDecoration: 'none', color: '#64748b', fontSize: 13 }}
            className={({ isActive }) => isActive ? 'nav-active' : ''}>
            <Home size={16} />
            {!collapsed && <span>Home</span>}
          </NavLink>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px' }}>
          {TOOLS.map(({ path, name, Icon, color }) => (
            <NavLink key={path} to={path} title={collapsed ? name : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 8px', borderRadius: 6, marginBottom: 2,
                textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden',
                color: isActive ? color : '#94a3b8',
                background: isActive ? `${color}18` : 'transparent',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                transition: 'all 0.15s',
              })}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  )
}
