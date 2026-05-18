import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LogOut, LayoutDashboard, Settings, Briefcase, PanelLeftClose, PanelLeftOpen, ScanLine } from 'lucide-react'

import { useEffect, useState, createContext } from 'react'
import toast from 'react-hot-toast'

export const NavContext = createContext({ activeNav: 'dashboard', setActiveNav: () => {} })

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [activeNav, setActiveNav] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = (navItem) => {
    setActiveNav(navItem)
    setIsMobileNavOpen(false)
    if (navItem === 'dashboard') {
      if (user?.role === 'admin') {
        navigate('/admin')
        return
      }
      navigate(user?.role === 'instructor' ? '/instructor' : '/student')
      return
    }
    if (navItem === 'classes') {
      if (user?.role === 'admin') {
        navigate('/admin')
        return
      }
      if (user?.role === 'student') {
        navigate('/student/classes')
        return
      }
      navigate('/instructor')
      return
    }
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

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (user?.role !== 'student') {
      return
    }
    if (location.pathname.startsWith('/student/classes')) {
      setActiveNav('classes')
      return
    }
    if (location.pathname.startsWith('/student')) {
      setActiveNav('dashboard')
    }
  }, [location.pathname, user?.role])

  useEffect(() => {
    if (user?.role !== 'admin') {
      return
    }
    if (location.pathname.startsWith('/admin')) {
      setActiveNav('dashboard')
    }
  }, [location.pathname, user?.role])

  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)
  const showCompactNav = isSidebarCollapsed && !isMobileNavOpen

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#f3f0ea] text-slate-800 antialiased flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto h-12 w-12 rounded-[16px] bg-[#18563e] flex items-center justify-center text-white shadow-xl shadow-[#18563e]/20 mb-4 transform -rotate-3">
            <ScanLine className="h-6 w-6 transform rotate-3" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-ink tracking-tight">Smart Attendance Monitoring</h2>
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
          } ${showCompactNav ? 'justify-center px-0' : 'justify-start gap-3 px-4'}`
        }
        title={showCompactNav ? label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span
          className={
            'text-[13px] font-black tracking-wide uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ' +
            (showCompactNav ? 'max-w-0 opacity-0 -translate-x-1 ml-0' : 'max-w-[140px] opacity-100 translate-x-0 ml-0')
          }
        >
          {label}
        </span>
      </button>
    )
  }

  return (
    <NavContext.Provider value={{ activeNav, setActiveNav }}>
      <div className="relative h-screen bg-[#ebeae7] font-sans text-[#1c1c1c] antialiased flex flex-col lg:flex-row lg:overflow-hidden lg:pl-5 lg:py-5 lg:pr-0 lg:gap-5">

        {/* Mobile Header (Clean & Native) */}
        <div className="lg:hidden shrink-0 h-[64px] bg-white border-b border-slate-200/60 px-4 flex items-center justify-between shadow-[0_2px_14px_rgba(0,0,0,0.03)] z-20">
            <div className="flex items-center gap-3">
               <div className="h-9 w-9 rounded-[10px] bg-[#18563e] flex items-center justify-center text-white shadow-sm transform -rotate-3">
                  <ScanLine className="h-4 w-4 transform rotate-3" />
               </div>
               <span className="font-extrabold text-[16px] tracking-tight text-ink pt-0.5">SAM</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center hover:text-ink hover:bg-slate-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
        </div>

        {/* Mobile Overlay Backdrop */}
        <div 
          className={`fixed inset-0 z-40 bg-[#1c1c1c]/20 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${isMobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
        
        {/* Expanded Sidebar */}
        <aside
          className={
            'bg-white flex flex-col justify-between shrink-0 ' +
            'fixed top-0 bottom-0 left-0 z-50 w-[280px] px-5 py-6 shadow-2xl ' +
            'transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] lg:transition-[width,padding,transform] lg:duration-500 ' +
            (isMobileNavOpen ? 'translate-x-0 ' : '-translate-x-full ') +
            'lg:static lg:translate-x-0 lg:shadow-sm lg:border lg:border-slate-200/60 lg:rounded-[2rem] lg:py-5 lg:h-full ' +
            (showCompactNav ? 'lg:w-[92px] lg:px-3 ' : 'lg:w-[250px] lg:px-4 ')
          }
        >
        <div className="flex flex-col w-full gap-6">
          <div className={"pb-3 border-b border-slate-100 flex items-center gap-3 " + (showCompactNav ? 'justify-center px-0' : 'justify-between px-2')}>
            {!showCompactNav && <div className="h-9 w-9 rounded-[0.9rem] bg-[#1c1c1c] text-white flex items-center justify-center text-[10px] font-black tracking-widest shrink-0">SAM</div>}
            <div className={'overflow-hidden transition-all duration-300 ' + (showCompactNav ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[200px] opacity-100 translate-x-0')}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black whitespace-nowrap">Workspace</p>
              <h2 className="text-[14px] font-black tracking-tight mt-1 text-[#1c1c1c] whitespace-nowrap overflow-hidden text-ellipsis">Smart Attendance Monitoring</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileNavOpen(false)
                  return
                }
                setIsSidebarCollapsed((prev) => !prev)
              }}
              className={
                'h-9 w-9 rounded-[0.85rem] border border-slate-200 bg-white text-slate-500 hover:text-[#1c1c1c] hover:bg-slate-50 transition-colors flex items-center justify-center shrink-0 ' +
                (showCompactNav ? '' : 'ml-auto')
              }
              title={showCompactNav ? 'Expand sidebar' : 'Collapse/Close sidebar'}
            >
              <span className="lg:hidden"><PanelLeftClose className="h-4 w-4" /></span>
              <span className="hidden lg:block">{showCompactNav ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</span>
            </button>
          </div>

          <nav className="flex flex-col gap-2 w-full pt-1">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            {user?.role !== 'admin' && <NavItem id="classes" icon={Briefcase} label="Classes" />}
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
              } ${showCompactNav ? 'justify-center px-0' : 'justify-start gap-3 px-4'}`
            }
            title={showCompactNav ? 'Settings' : undefined}
          >
             <Settings className="h-5 w-5" />
             <span className={'text-[12px] font-black tracking-wide uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ' + (showCompactNav ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[120px] opacity-100 translate-x-0')}>
               Settings
             </span>
          </button>
          <button
            onClick={onLogout}
            className={'w-full flex items-center h-11 rounded-[0.9rem] text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors text-left ' + (showCompactNav ? 'justify-center px-0' : 'justify-start gap-3 px-4')}
            title={showCompactNav ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5" />
            <span className={'text-[12px] font-black tracking-wide uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ' + (showCompactNav ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[120px] opacity-100 translate-x-0')}>
              Logout
            </span>
          </button>
          <div className={'flex items-center px-3 py-2 mt-1 rounded-[0.9rem] bg-[#f8f7f5] border border-slate-200/70 transition-all duration-300 ' + (showCompactNav ? 'justify-center' : 'gap-3')}>
            <div className="h-9 w-9 rounded-full bg-slate-900 shadow-sm flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden ring-[3px] ring-white">
              {user?.fullName?.substring(0, 2) || (user?.role === 'instructor' ? 'IN' : 'ST')}
            </div>
            <div className={'min-w-0 overflow-hidden transition-all duration-300 ' + (showCompactNav ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[120px] opacity-100 translate-x-0')}>
                <p className="text-[11px] font-black text-[#1c1c1c] truncate">{user?.fullName || 'User'}</p>
                <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">{user?.role || 'member'}</p>
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 p-4 lg:p-0 lg:pr-5">
           {children}
        </div>
      </main>

    </div>
    </NavContext.Provider>
  )
}



