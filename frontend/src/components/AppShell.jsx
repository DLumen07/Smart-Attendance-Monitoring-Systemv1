import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LogOut, LayoutDashboard, Settings, UserCircle, Briefcase, Activity, Calendar, LifeBuoy, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { useState, createContext } from 'react'
import toast from 'react-hot-toast'

export const NavContext = createContext({ activeNav: 'dashboard', setActiveNav: () => {} })

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [activeNav, setActiveNav] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = (navItem) => {
    setActiveNav(navItem)
    if (navItem !== 'dashboard') {
      toast.success(navItem.charAt(0).toUpperCase() + navItem.slice(1) + ' module activating soon!', {
        icon: '🚀',
        style: {
          borderRadius: '1rem',
          background: '#1c1c1c',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 'bold'
        }
      })
    }
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#f3f0ea] text-slate-800 antialiased flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <LifeBuoy className="mx-auto h-12 w-12 text-brand" />
          <h2 className="mt-4 text-3xl font-extrabold text-ink tracking-tight">Smart Attendance</h2>
        </div>
        {children}
      </div>
    )
  }

  const NavItem = ({ id, icon: Icon, label }) => {
    const isActive = activeNav === id
    return (
      <button 
        onClick={() => handleNavClick(id)}
        className={
          `group w-full flex items-center h-12 rounded-[1rem] transition-all duration-300 text-left ${
            isActive
              ? 'bg-[#1c1c1c] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)]'
              : 'text-slate-500 hover:text-[#1c1c1c] hover:bg-slate-100'
          } ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4'}`
        }
        title={isSidebarCollapsed ? label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span
          className={
            'text-[13px] font-black tracking-wide uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ' +
            (isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1 ml-0' : 'max-w-[140px] opacity-100 translate-x-0 ml-0')
          }
        >
          {label}
        </span>
      </button>
    )
  }

  return (
    <NavContext.Provider value={{ activeNav, setActiveNav }}>
      <div className="flex h-screen bg-[#ebeae7] font-sans text-[#1c1c1c] antialiased overflow-hidden pl-6 py-6 pr-0 gap-6">
        
        {/* Expanded Sidebar */}
      <aside className={(isSidebarCollapsed ? 'w-[96px] px-3 ' : 'w-[246px] px-4 ') + 'bg-white rounded-[2rem] flex flex-col py-6 shadow-sm justify-between z-20 shrink-0 border border-slate-200/60 transition-[width,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'}>
        <div className="flex flex-col w-full gap-6">
          <div className={"pb-3 border-b border-slate-100 flex items-center gap-3 " + (isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-2')}>
            {!isSidebarCollapsed && <div className="h-9 w-9 rounded-[0.9rem] bg-[#1c1c1c] text-white flex items-center justify-center text-[10px] font-black tracking-widest shrink-0">SA</div>}
            <div className={'overflow-hidden transition-all duration-300 ' + (isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[140px] opacity-100 translate-x-0')}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black whitespace-nowrap">Workspace</p>
              <h2 className="text-[15px] font-black tracking-tight mt-1 text-[#1c1c1c] whitespace-nowrap">Smart Attendance</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className={
                'h-9 w-9 rounded-[0.85rem] border border-slate-200 bg-white text-slate-500 hover:text-[#1c1c1c] hover:bg-slate-50 transition-colors flex items-center justify-center shrink-0 ' +
                (isSidebarCollapsed ? '' : 'ml-auto')
              }
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex flex-col gap-2 w-full pt-1">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="classes" icon={Briefcase} label="Classes" />
            <NavItem id="analytics" icon={Activity} label="Analytics" />
            <NavItem id="students" icon={UserCircle} label="Students" />
            <NavItem id="schedule" icon={Calendar} label="Schedule" />
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3 w-full pt-4 border-t border-slate-100">
          <button 
            onClick={() => handleNavClick('settings')}
            className={
              `w-full flex items-center h-11 rounded-[0.9rem] transition-all text-left ${
                activeNav === 'settings'
                  ? 'bg-slate-100 text-[#1c1c1c]'
                  : 'text-slate-500 hover:text-[#1c1c1c] hover:bg-slate-50'
              } ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4'}`
            }
            title={isSidebarCollapsed ? 'Settings' : undefined}
          >
             <Settings className="h-5 w-5" />
             <span className={'text-[12px] font-black tracking-wide uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ' + (isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[120px] opacity-100 translate-x-0')}>
               Settings
             </span>
          </button>
          <button
            onClick={onLogout}
            className={'w-full flex items-center h-11 rounded-[0.9rem] text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors text-left ' + (isSidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4')}
            title={isSidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5" />
            <span className={'text-[12px] font-black tracking-wide uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ' + (isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[120px] opacity-100 translate-x-0')}>
              Logout
            </span>
          </button>
          <div className={'flex items-center px-3 py-2 mt-1 rounded-[0.9rem] bg-[#f8f7f5] border border-slate-200/70 transition-all duration-300 ' + (isSidebarCollapsed ? 'justify-center' : 'gap-3')}>
            <div className="h-9 w-9 rounded-full bg-slate-900 shadow-sm flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden ring-[3px] ring-white">
              {user?.fullName?.substring(0, 2) || (user?.role === 'instructor' ? 'IN' : 'ST')}
            </div>
            <div className={'min-w-0 overflow-hidden transition-all duration-300 ' + (isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[120px] opacity-100 translate-x-0')}>
                <p className="text-[11px] font-black text-[#1c1c1c] truncate">{user?.fullName || 'User'}</p>
                <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">{user?.role || 'member'}</p>
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 pr-6">
           {children}
        </div>
      </main>

    </div>
    </NavContext.Provider>
  )
}



