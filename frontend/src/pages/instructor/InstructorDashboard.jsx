import { useMemo, useState, useEffect, useContext } from 'react'
import { NavContext } from '../../components/AppShell'
import { QRCodeSVG } from 'qrcode.react'
import { apiRequest } from '../../api/client'
import {
  Plus,
  Activity,
  Users,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Copy,
  Check,
  CheckCircle,
  ClipboardList,
  MoreHorizontal,
  FolderDot,
  Radio,
  Ban,
  Clock,
  Calendar,
  Book,
  Search,
  Bell,
  MessageSquare,
  BarChart3,
  BadgeDollarSign,
  Asterisk,
  Fingerprint,
  Trash2,
  History as LucideHistory,
  MousePointerClick
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../auth/AuthContext'

// --- Dribbble / Bento Style Shared Components ---

function Modal({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white text-ink">
              <h3 className="font-bold tracking-tight">{title}</h3>
            </div>
            <div className="p-8 bg-white">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Card({ children, className = '', noPadding = false }) {
  return (
      <div
         className={
            'rounded-[1.35rem] bg-[linear-gradient(180deg,#ffffff_0%,#fcfcfb_100%)] border border-white/55 shadow-[0_2px_14px_rgba(20,24,22,0.03)] ' +
            (noPadding ? '' : 'p-6 ') +
            className
         }
      >
      {children}
    </div>
  )
}

function Button({ icon: Icon, label, onClick, disabled, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-brand text-white hover:bg-teal-800 shadow-xl shadow-brand/20',
    secondary: 'bg-[#f4f2ee] text-ink hover:bg-[#eae6de] font-semibold',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/20',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-ink font-semibold',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
         className={
            'inline-flex h-11 px-5 items-center justify-center gap-2.5 rounded-full text-[13px] font-bold transition-all focus:outline-none ' +
            (disabled ? 'opacity-50 cursor-not-allowed ' : variants[variant] + ' ') +
            className
         }
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label && <span>{label}</span>}
    </button>
  )
}

const formatDate = (value) => (
  value
    ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown date'
)

const formatTime = (value) => (
  value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''
)

// --- Main Application Component ---

export default function InstructorDashboard() {
  const { user } = useAuth()
  const navContext = useContext(NavContext)
  
  // Data State
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)

  // Sync Nav Sidebar with Dashboard View
  useEffect(() => {
    if (navContext?.activeNav === 'dashboard' && selectedClassId !== null) {
      setSelectedClassId(null)
    }
  }, [navContext?.activeNav])

  const handleSelectClass = (id) => {
    setSelectedClassId(id)
    if (navContext?.setActiveNav) {
      navContext.setActiveNav('classes')
    }
  }

  const [sessions, setSessions] = useState([])
  const [attendance, setAttendance] = useState([])
   const [activeAttendance, setActiveAttendance] = useState([])
  const [students, setStudents] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState(null)

  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalClasses: 0,
    totalSessions: 0,
    attendanceRate: 0,
  })

  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false)
  const [isStartSessionModalOpen, setIsStartSessionModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Form State
  const [newClassName, setNewClassName] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [attendanceMode, setAttendanceMode] = useState('qr_or_code')

  const selectedClass = useMemo(
    () => classes.find((item) => String(item.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  )

  const activeSession = sessions.find((session) => session.status === 'open')
  const closedSessions = sessions.filter((session) => session.status === 'closed')
   const selectedSession = useMemo(
      () => closedSessions.find((session) => String(session.id) === String(selectedSessionId)) || null,
      [closedSessions, selectedSessionId]
   )
   const presentCount = attendance.filter((record) => record.status === 'present').length
   const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0
   const activePresentCount = activeAttendance.filter((record) => record.status === 'present').length
   const activePendingCount = activeAttendance.filter((record) => record.status === 'pending').length
   const activeAbsentCount = activeAttendance.filter((record) => record.status === 'absent').length
   const liveTotalCount = activePresentCount + activePendingCount + activeAbsentCount
   const presentPercent = liveTotalCount ? Math.round((activePresentCount / liveTotalCount) * 100) : 0
   const pendingPercent = liveTotalCount ? Math.round((activePendingCount / liveTotalCount) * 100) : 0
   const absentPercent = liveTotalCount ? Math.round((activeAbsentCount / liveTotalCount) * 100) : 0
   const donutRadius = 26
   const donutCircumference = 2 * Math.PI * donutRadius
   const presentArc = (presentPercent / 100) * donutCircumference
   const pendingArc = (pendingPercent / 100) * donutCircumference
   const absentArc = (absentPercent / 100) * donutCircumference
   const liveAttendance = useMemo(() => {
      const priority = { present: 0, pending: 1, absent: 2 }
      return activeAttendance
        .slice()
        .sort((a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3))
   }, [activeAttendance])
   const classJoinCode = selectedClass?.joinCode || selectedClass?.join_code || ''
   const classJoinLink = selectedClass?.joinLink || selectedClass?.join_link || ''
   const fallbackJoinLink = classJoinCode && typeof window !== 'undefined'
      ? window.location.origin + '/join/' + classJoinCode
      : ''
   const shareLink = classJoinLink || fallbackJoinLink

   const getStudentName = (student) => (
      student?.fullName || student?.full_name || student?.name || student?.email || 'Student'
   )

   const getStudentEmail = (student) => (
      student?.email || student?.studentEmail || student?.student_email || ''
   )

   const getInitials = (value) => {
      if (!value) return 'S'
      return value
         .split(' ')
         .filter(Boolean)
         .map((part) => part[0])
         .slice(0, 2)
         .join('')
         .toUpperCase()
   }

   const getSessionName = (session) => (
      session?.sessionName || session?.session_name || session?.name || 'Session'
   )

   const getSessionStart = (session) => (
      session?.startsAt || session?.starts_at || session?.startTime || session?.start_time || session?.createdAt || session?.created_at
   )

   const getSessionEnd = (session) => (
      session?.endsAt || session?.ends_at || session?.endTime || session?.end_time || session?.endedAt || session?.ended_at
   )

   const getSessionCode = (session) => (
      session?.sessionCode || session?.session_code || session?.code || ''
   )

   const escapeCsv = (value) => {
      const safe = value == null ? '' : String(value)
      if (/[",\n]/.test(safe)) {
         return '"' + safe.replace(/"/g, '""') + '"'
      }
      return safe
   }

   const exportAttendanceCsv = () => {
      if (!selectedSession) {
         toast.error('Select a session to export')
         return
      }
      if (!attendance.length) {
         toast.error('No attendance data to export')
         return
      }
      const rows = attendance.map((record) => {
         const student = record.student || {}
         const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || 'Student'
         const email = record.studentEmail || record.student_email || record.email || student.email || ''
         const status = record.status || 'unknown'
         const method = record.method || 'unknown'
         const checkedAt = record.checkedInAt || record.checked_in_at || record.checkedAt || record.checked_at || ''
         return [name, email, status, method, checkedAt]
      })
      const header = ['Student', 'Email', 'Status', 'Method', 'Checked In At']
      const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
      const classSlug = (selectedClass?.name || 'class').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'class'
      const sessionSlug = (getSessionName(selectedSession) || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'session'
      const filename = 'attendance-' + classSlug + '-' + sessionSlug + '.csv'
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
   }

  const withFeedback = async (action) => {
    try {
      await action()
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  // --- API Calls ---

  const loadClasses = () => withFeedback(async () => {
    const [data, analyticsData] = await Promise.all([
      apiRequest('/instructor/classes'),
      apiRequest('/instructor/analytics').catch(() => ({ analytics: { totalClasses: 0, totalSessions: 0, attendanceRate: 0 } })),
    ])
    setClasses(data.classes)
    setAnalytics(analyticsData.analytics)
  })

  useEffect(() => { loadClasses() }, [])

  const loadSessions = (isPolling = false) => {
    if (!selectedClassId) return
    return withFeedback(async () => {
         const data = await apiRequest("/instructor/classes/" + selectedClassId + "/sessions")
      setSessions(data.sessions)
      if (!isPolling) {
        setAttendance([])
        setSelectedSessionId(null)
      }
    })
  }

  const loadStudents = () => {
    if (!selectedClassId) return
    return withFeedback(async () => {
         const data = await apiRequest("/instructor/classes/" + selectedClassId + "/students")
      setStudents(data.students)
    })
  }

  useEffect(() => {
    if (selectedClassId) {
      loadSessions()
      loadStudents()
      setActiveTab('overview')
      
      const interval = setInterval(() => {
         loadSessions(true)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [selectedClassId])

   useEffect(() => {
      if (!activeSession?.id) {
         setActiveAttendance([])
         return
      }

      loadActiveAttendance(activeSession.id)
      const interval = setInterval(() => {
         loadActiveAttendance(activeSession.id, true)
      }, 5000)

      return () => clearInterval(interval)
   }, [activeSession?.id])

   const loadAttendance = (sessionId) => withFeedback(async () => {
         const data = await apiRequest("/instructor/sessions/" + sessionId + "/attendance")
      setAttendance(data.attendance)
      setSelectedSessionId(String(sessionId))
   })

   const loadActiveAttendance = async (sessionId, silent = false) => {
      try {
         const data = await apiRequest("/instructor/sessions/" + sessionId + "/attendance")
         setActiveAttendance(data.attendance)
      } catch (requestError) {
         if (!silent) {
            toast.error(requestError.message)
         }
      }
   }

  // --- Mutations ---

  const createClass = (e) => {
    e.preventDefault()
    withFeedback(async () => {
         await apiRequest('/instructor/classes', {
            method: 'POST',
            body: JSON.stringify({ name: newClassName.trim() }),
         })
      toast.success('Class created')
      setNewClassName('')
      setIsCreateClassModalOpen(false)
      loadClasses()
    })
  }

  const createSession = (e) => {
    e.preventDefault()
      const trimmedName = sessionName.trim()
      if (!trimmedName) {
         toast.error('Session name is required')
         return
      }
    withFeedback(async () => {
             await apiRequest("/instructor/classes/" + selectedClassId + "/sessions", {
        method: 'POST',
            body: JSON.stringify({ sessionName: trimmedName, attendanceMode }),
      })
      toast.success('Live session started')
      setSessionName('')
      setIsStartSessionModalOpen(false)
      loadSessions()
      setActiveTab('overview')
    })
  }

  const changeSessionStatus = (sessionId, status) => withFeedback(async () => {
         await apiRequest("/instructor/sessions/" + sessionId + "/status", {
         method: 'PATCH',
         body: JSON.stringify({ status }),
    })
    toast.success('Session ended')
    loadSessions()
  })

  const reviewAttendance = (attendanceId, status) => withFeedback(async () => {
         await apiRequest("/instructor/attendance/" + attendanceId, {
         method: 'PATCH',
         body: JSON.stringify({ status }),
    })
    toast.success('Attendance updated')
    if (selectedSessionId) loadAttendance(selectedSessionId)
  })

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // --- Render Global View (All Classes) ---
  if (!selectedClass) {
    return (
      <div className="min-h-[100vh] bg-transparent w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 transition-colors">
         {/* Top Navigation Bar */}
         <div className="flex flex-col md:flex-row items-center justify-between mb-10 pt-2 pb-4">
            <div className="flex items-center gap-4">
               <Asterisk className="w-10 h-10 text-[#546e5e] shrink-0" />
               <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">Hello, {user?.fullName?.split(' ')[0] || 'Sample'}!</h1>
                  <p className="text-sm text-slate-500 font-medium mt-1">Explore information and activity about your classes</p>
               </div>
            </div>
            <div className="flex items-center gap-4 mt-6 md:mt-0">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Search..." className="h-12 w-72 bg-white rounded-full pl-12 pr-14 text-sm font-semibold text-[#1c1c1c] placeholder:text-slate-400 focus:outline-none shadow-sm" />
                  <button className="absolute right-2 top-2 h-8 w-8 rounded-full bg-[#1c1c1c] text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-colors">
                     <Search className="w-4 h-4" />
                  </button>
               </div>
               <button className="h-12 w-12 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-sm hover:text-[#1c1c1c] transition-colors relative">
                  <MessageSquare className="w-5 h-5" />
                  <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
               </button>
               <button className="h-12 w-12 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-sm hover:text-[#1c1c1c] transition-colors">
                  <Bell className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* Dashboard Top Stats */}
         <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_280px] gap-6 mb-6">
            <div className="col-span-1 lg:col-span-3 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="rounded-[1.25rem] p-4 border border-white/55 bg-[linear-gradient(160deg,#ffffff_0%,#fcfbf9_62%,#f6f8f7_100%)] shadow-[0_4px_14px_rgba(20,24,22,0.03)] flex flex-col justify-between h-28 hover:shadow-[0_10px_22px_rgba(92,124,109,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <Asterisk className="w-3.5 h-3.5 text-[#5c7c6d]" /> Total Classes
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between leading-none">
                     {analytics.totalClasses}
                     <div className="w-10 h-10 rounded-full bg-white border border-[#5c7c6d]/20 flex items-center justify-center shadow-[0_4px_12px_rgba(92,124,109,0.16)]">
                        <Activity className="w-4 h-4 text-[#5c7c6d]" />
                     </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#5c7c6d]/70">Across Your Workspace</div>
               </Card>
               
               <Card className="rounded-[1.25rem] p-4 border border-white/55 bg-[linear-gradient(160deg,#ffffff_0%,#fcfbf9_62%,#f6f8f7_100%)] shadow-[0_4px_14px_rgba(20,24,22,0.03)] flex flex-col justify-between h-28 hover:shadow-[0_10px_22px_rgba(92,124,109,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <Users className="w-3.5 h-3.5 text-[#5c7c6d]" /> Total Students
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between leading-none">
                     {classes.reduce((acc) => acc + 10, 0)}
                     <svg className="w-16 h-8 text-[#c8dad0]" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#5c7c6d]/70">Realtime Enrollment Pulse</div>
               </Card>

               <Card className="rounded-[1.25rem] p-4 border border-white/55 bg-[linear-gradient(160deg,#ffffff_0%,#fcfbf9_62%,#f6f8f7_100%)] shadow-[0_4px_14px_rgba(20,24,22,0.03)] flex flex-col justify-between h-28 hover:shadow-[0_10px_22px_rgba(92,124,109,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <BadgeDollarSign className="w-3.5 h-3.5 text-[#5c7c6d]" /> Attendance
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between leading-none">
                     {analytics.attendanceRate}%
                     <div className="w-10 h-10 rounded-full bg-white border border-[#5c7c6d]/20 flex items-center justify-center shadow-[0_4px_12px_rgba(92,124,109,0.16)]">
                        <BarChart3 className="w-4 h-4 text-[#5c7c6d]" />
                     </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#5c7c6d]/70">Current Overall Rate</div>
               </Card>
            </div>

            {/* Right tall green card */}
            <Card className="col-span-1 lg:row-span-2 xl:col-start-4 xl:row-start-1 !bg-[linear-gradient(145deg,#5c7c6d_0%,#6f9481_46%,#4a6357_100%)] !border-[#4f6a5d]/80 !text-white p-4 shadow-[0_12px_28px_rgba(58,88,74,0.30)] rounded-[1.25rem] flex flex-col justify-between min-h-[280px] relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.16),transparent_44%),radial-gradient(circle_at_22%_86%,rgba(255,255,255,0.06),transparent_30%)]"></div>
               <div className="relative z-10 text-[10px] font-black uppercase tracking-widest text-white/90 flex items-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.16)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-200 shadow-[0_0_8px_rgba(167,243,208,0.95)]"></span>
                  Live Sessions
               </div>
               <div className="relative z-10 text-6xl font-black mt-auto flex justify-between items-end pb-4 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.18)]">
                  {activeSession ? 1 : 0}
                  <svg className="w-16 h-8 text-emerald-100 opacity-90" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
               </div>
            </Card>

            {/* Recent Classes Area */}
            <Card className="col-span-1 lg:col-span-2 p-6 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border-0 bg-white relative overflow-hidden h-[280px] flex flex-col">
               <div className="relative z-10 flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                  <div className="min-w-0">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                           <Book className="w-5 h-5 text-[#5C7C6D]" />
                        </div>
                        <div>
                           <h3 className="text-[17px] font-semibold tracking-tight text-[#111827] leading-none">Recent Classes</h3>
                           <p className="text-[12px] font-medium text-gray-500 mt-1">Quick access and class spotlight</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full whitespace-nowrap">
                        {classes.length} total
                     </span>
                     <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="bg-[#111827] text-white hover:bg-black h-8 px-4 text-[12px] rounded-full transition-all" />
                  </div>
               </div>

               <div className="relative z-10 flex-1 flex flex-col gap-3 min-h-0">
                  {classes.length === 0 ? (
                     <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-[16px] h-full border border-dashed border-gray-300">
                        <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                           <Book className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-[13px] text-gray-500 font-medium">No classes yet. Create one above.</p>
                     </div>
                  ) : (
                     <div className="flex-1 flex gap-3 min-h-0">
                        {/* FEATURED: The Latest Class */}
                        <button 
                           type="button"
                           onClick={() => handleSelectClass(classes[0]?.id)}
                           className="hidden sm:flex flex-col w-1/2 p-5 text-left rounded-[20px] bg-gradient-to-b from-[#f8fbf9] to-white relative overflow-hidden group hover:ring-1 hover:ring-[#5c7c6d]/20 transition-all cursor-pointer"
                        >
                           {/* Subtle background abstract element */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-[#5c7c6d]/[0.03] rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
                           
                           <div className="flex items-center justify-between z-10 w-full mb-2">
                              <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-white text-[#5C7C6D] shadow-[0_2px_8px_rgba(0,0,0,0.04)] uppercase tracking-widest group-hover:bg-[#5c7c6d] group-hover:text-white transition-colors ml-auto">
                                 Spotlight
                              </span>
                           </div>

                           <div className="mt-auto z-10 w-full">
                              <h4 className="text-[17px] font-bold text-[#111827] truncate group-hover:text-[#5c7c6d] transition-colors" title={classes[0]?.name}>{classes[0]?.name}</h4>
                              <p className="text-[11px] font-medium text-gray-500 mt-1 line-clamp-1">Manage attendees and sessions.</p>
                              
                              <div className="flex items-center gap-2 mt-4">
                                 <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">ID</span>
                                    <span className="text-[11px] font-semibold text-[#111827]">{classes[0]?.id}</span>
                                 </div>
                                 <div className="flex items-center gap-2 bg-[#fdf2f2] px-3 py-1.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#d93025]/70">Code</span>
                                    <span className="text-[11px] font-semibold text-[#d93025]">{classes[0]?.joinCode || 'None'}</span>
                                 </div>
                              </div>
                              
                              <div className="w-full mt-4 bg-[#111827] group-hover:bg-[#5c7c6d] text-white text-[12px] font-semibold py-2.5 rounded-[12px] flex items-center justify-center gap-2 transition-colors shadow-sm">
                                 Open Workspace
                                 <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </div>
                           </div>
                        </button>

                        {/* LIST: Remaining Recent Classes */}
                        <div className="flex-1 flex flex-col min-h-0 sm:w-1/2 overflow-y-auto custom-scrollbar pl-2 pr-1 py-1">
                           <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2 sm:hidden mb-1">All Classes</div>
                           <div className="flex flex-col gap-2">
                              {/* On very tiny screens we show the first one here too, else we skip it if featured space allowed it */}
                              {classes.map((cls, index) => {
                                 // Render the first class only on mobile screens (since Spotlight handles it on sm+)
                                 const isSelected = String(selectedClassId) === String(cls.id)
                                 return (
                                    <button
                                       key={cls.id}
                                       type="button"
                                       onClick={() => handleSelectClass(cls.id)}
                                       className={
                                          'w-full text-left cursor-pointer rounded-[14px] px-4 py-3.5 transition-all duration-300 group flex items-center justify-between border ' +
                                          (isSelected ? 'bg-[#5c7c6d]/5 border-[#5c7c6d]/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100') + 
                                          (index === 0 ? ' sm:hidden' : '') // Hide index 0 since it's the spotlight!
                                       }
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className="min-w-0 flex-1">
                                             <h4 className={"font-semibold text-[14.5px] truncate transition-colors mb-0.5 " + (isSelected ? 'text-[#5c7c6d]' : 'text-[#111827] group-hover:text-[#5c7c6d]')}>{cls.name}</h4>
                                             <div className="flex items-center gap-2.5">
                                                <span className="text-[11px] font-medium text-gray-400">ID: {cls.id}</span>
                                                {cls.joinCode && (
                                                   <>
                                                      <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                                                      <span className="text-[11px] font-medium text-gray-400">Code: <span className="text-[#d93025]">{cls.joinCode}</span></span>
                                                   </>
                                                )}
                                             </div>
                                          </div>
                                       </div>

                                       <div className={"flex items-center justify-center w-8 h-8 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 " + (isSelected ? 'bg-white opacity-100 translate-x-0' : 'bg-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0')}>
                                          <ChevronRight className={"w-4 h-4 transition-transform " + (isSelected ? 'text-[#5c7c6d]' : 'text-[#5c7c6d] group-hover:translate-x-0.5')} />
                                       </div>
                                    </button>
                                 )
                              })}
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </Card>

            {/* Profile Info Area */}
            <Card className="col-span-1 p-6 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-white border-0 relative overflow-hidden h-[280px]">
               <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                     <div className="text-[17px] font-semibold tracking-tight text-[#111827]">Your profile</div>
                     <div className="bg-gray-100/80 px-2.5 py-1 flex items-center justify-center rounded-full">
                        <span className="text-[12px] font-medium text-gray-500">Active</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-14 h-14 rounded-full bg-gray-100/80 flex items-center justify-center text-[16px] font-semibold text-gray-600 shrink-0">
                        {getInitials(user?.fullName || 'Instructor')}
                     </div>
                     <div className="min-w-0">
                        <div className="font-semibold text-[16px] text-[#111827] truncate leading-none mb-1">{user?.fullName || 'Sample Instructor'}</div>
                        <div className="text-[13px] text-gray-400 font-medium truncate">{user?.email || 'instructor@demo.local'}</div>
                     </div>
                  </div>

                  <div className="mt-auto space-y-3">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Book className="w-4 h-4 text-gray-400" />
                           <span className="text-[13px] font-medium text-gray-500">Classes created</span>
                        </div>
                        <div className="w-[30%] h-2 rounded-full bg-gray-100 relative overflow-hidden">
                           <div className="absolute top-0 left-0 h-full bg-[#5c7c6d] rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <span className="text-[14px] font-bold text-[#111827] w-6 text-right">{analytics.totalClasses}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Users className="w-4 h-4 text-gray-400" />
                           <span className="text-[13px] font-medium text-gray-500">Total students</span>
                        </div>
                        <div className="w-[30%] h-2 rounded-full bg-gray-100 relative overflow-hidden">
                           <div className="absolute top-0 left-0 h-full bg-[#5c7c6d] rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <span className="text-[14px] font-bold text-[#111827] w-6 text-right">{classes.reduce((acc) => acc + 10, 0)}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <ClipboardList className="w-4 h-4 text-gray-400" />
                           <span className="text-[13px] font-medium text-gray-500">Total sessions</span>
                        </div>
                        <div className="w-[30%] h-2 rounded-full bg-gray-100 relative overflow-hidden">
                           <div className="absolute top-0 left-0 h-full bg-[#5c7c6d] rounded-full" style={{ width: '80%' }}></div>
                        </div>
                        <span className="text-[14px] font-bold text-[#111827] w-6 text-right">{analytics.totalSessions}</span>
                     </div>
                  </div>
               </div>
            </Card>
         </div>

         {/* Dashboard Bottom Row */}
         <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <Card className="flex-[0_1_auto] w-full lg:w-[600px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white overflow-hidden relative shadow-[0_4px_24px_rgba(0,0,0,0.04)] border-0 rounded-[24px] h-auto min-h-[160px]">
               <div className="flex flex-col h-full max-w-[340px] z-10 justify-center">
                  <div className="flex items-center gap-2.5 mb-3">
                     <span className="w-2 h-2 rounded-full bg-[#5c7c6d]"></span>
                     <span className="text-[12px] font-semibold text-[#111827] uppercase tracking-wider">Class Manager</span>
                  </div>
                  <h3 className="text-[20px] font-bold text-[#111827] tracking-tight leading-tight">Available Class Options</h3>
                  <p className="text-[13px] text-gray-500 font-medium mt-2 leading-relaxed">Create new modules and securely invite students into your class portal.</p>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="mt-5 bg-[#111827] hover:bg-black text-white w-fit h-10 px-6 font-semibold text-[13px] rounded-full shadow-sm transition-all" />
               </div>
               
               {/* Minimalist Graphic Element matching Bento */}
               <div className="relative w-[140px] h-[140px] shrink-0 hidden sm:flex items-center justify-center bg-gray-50 rounded-full border border-gray-100 z-10">
                  <div className="absolute w-[90px] h-[90px] bg-white rounded-full shadow-sm flex items-center justify-center">
                     <Book className="w-8 h-8 text-[#5C7C6D]" />
                  </div>
                  <div className="absolute right-0 bottom-0 text-[10px] font-bold bg-[#5c7c6d] text-white px-2 py-0.5 rounded-full shadow-sm">+Add</div>
               </div>
            </Card>

            <Card className="w-full lg:w-[320px] p-6 flex flex-col justify-center border-0 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[24px] bg-white h-auto min-h-[160px]">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">Recent Sessions</h3>
                  <div className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">History</div>
               </div>
               <div className="space-y-3">
                  {classes.flatMap(c => c.sessions || []).slice(0, 3).map((session, i) => (
                     <div key={session.id || i} className="flex justify-between items-center group hover:bg-slate-50 transition-colors rounded-[12px] p-2 -mx-2">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-100 flex flex-col items-center justify-center leading-none">
                              <span className="text-[9px] font-bold text-gray-500 uppercase">{new Date(session.startTime).toLocaleString('default', { month: 'short' })}</span>
                           </div>
                           <div>
                              <div className="text-[14px] font-semibold text-[#111827] tracking-tight">{new Date(session.startTime).getDate()} {new Date(session.startTime).toLocaleString('default', { month: 'short', year:'numeric' })}</div>
                              <div className="text-[12px] font-medium text-gray-400">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                           </div>
                        </div>
                        <div className="text-[12px] font-semibold text-white bg-[#5C7C6D] px-2.5 py-1 rounded-full shadow-sm">
                           +{session.attendances?.length || 0}
                        </div>
                     </div>
                  ))}
                  {classes.length === 0 && (
                     <div className="flex flex-col items-center justify-center p-4">
                        <div className="text-[13px] font-medium text-gray-400">No recent sessions</div>
                     </div>
                  )}
               </div>
            </Card>

            <Card className="flex-1 w-full lg:max-w-[230px] p-6 flex flex-col items-center text-center justify-center bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[24px] border-0 h-auto min-h-[160px]">
               <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4 group cursor-pointer hover:bg-gray-100 transition-colors">
                  <Fingerprint className="w-6 h-6 text-gray-400 group-hover:text-[#5c7c6d] transition-colors" strokeWidth={1.5} />
               </div>
               <h3 className="text-[15px] font-semibold text-[#111827]">Security</h3>
               <p className="text-[12px] text-gray-500 font-medium mt-1">Review devices</p>
            </Card>
         </div>

         <Modal isOpen={isCreateClassModalOpen} onClose={() => setIsCreateClassModalOpen(false)} title="Create New Class">
           <form onSubmit={createClass} className="space-y-4">
             <div>
               <label className="block mb-1.5 text-[11px] font-bold text-[#1c1c1c] uppercase tracking-wider">Class Name</label>
               <input
                 required
                 autoFocus
                 value={newClassName}
                 onChange={(e) => setNewClassName(e.target.value)}
                 placeholder="e.g. CS-101 Fall"
                 className="w-full h-10 rounded-xl bg-[#f4f2ee] px-3 text-xs font-semibold text-[#1c1c1c] focus:bg-white focus:ring-2 focus:ring-[#5C7C6D] shadow-inner focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
               />
             </div>
             <div className="flex justify-end gap-2 pt-2">
               <Button label="Cancel" onClick={() => setIsCreateClassModalOpen(false)} variant="ghost" className="h-8 text-xs font-bold" />
               <Button label="Add Class" onClick={createClass} className="bg-[#1c1c1c] hover:bg-[#2c2c2c] text-white h-8 text-xs font-bold px-4" />
             </div>
           </form>
         </Modal>
      </div>
    )
  }


  // --- Render Class Detailed View ---
  return (
   <div className="min-h-[100vh] w-full max-w-7xl mx-auto px-5 lg:px-10 py-7 transition-colors">
      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row items-start lg:items-center justify-between mb-7 gap-4 pt-1 pb-4 border-b border-slate-100/80">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
               setSelectedClassId(null)
               if (navContext?.setActiveNav) navContext.setActiveNav('dashboard')
            }}
            className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-[#1c1c1c] hover:bg-slate-50 transition-colors shadow-sm shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Asterisk className="w-8 h-8 text-[#5c7c6d] shrink-0 hidden md:block" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">{selectedClass?.name || 'Class Details'}</h1>
                {activeSession && (
                  <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                    Live
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Class ID {selectedClass?.id || '--'} &nbsp;�&nbsp; Join Code: <strong className="text-[#1c1c1c]">{classJoinCode || '--'}</strong>
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <Button
            icon={copiedCode ? Check : Copy}
            label={copiedCode ? 'Copied Link' : 'Join Link'}
            onClick={() => handleCopyCode(shareLink)}
            variant="secondary"
            className="h-10 px-4 text-[13px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] bg-white border border-slate-200 hover:bg-slate-50 transition-all font-bold text-slate-600 hover:text-[#1c1c1c]"
          />
          {activeSession ? (
            <Button
              icon={Ban}
              label="End Session"
              onClick={() => changeSessionStatus(activeSession.id, 'closed')}
              variant="danger"
              className="h-10 px-5 text-[13px] shadow-xl shadow-rose-500/20 font-bold"
            />
          ) : (
            <Button
              icon={Radio}
              label="Start Session"
              onClick={() => setIsStartSessionModalOpen(true)}
              className="h-10 px-5 text-[13px] bg-[#1c1c1c] hover:bg-black font-bold shadow-xl shadow-black/10"
            />
          )}
        </div>
      </div>

         {/* Hero Row: Live Tracking + QR Actions */}
         <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
                  <Card className={"xl:col-span-3 p-5 rounded-[1.2rem] border relative flex flex-col overflow-hidden transition-all duration-500 " + (activeSession ? "bg-[linear-gradient(180deg,#f6fbf8_0%,#ffffff_100%)] border-[#5c7c6d]/25 shadow-[0_14px_32px_rgba(60,85,72,0.12)] min-h-[300px]" : "bg-[linear-gradient(180deg,#f8faf9_0%,#ffffff_100%)] border-slate-300/70 shadow-[0_8px_18px_rgba(20,24,22,0.06)] min-h-[300px]")}>
          {activeSession && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b6dfcf] via-[#5c7c6d] to-[#b6dfcf] opacity-80"></div>}

               {/* Header: Title + Refresh */}
               <div className="relative z-10 flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                     <div className={"w-10 h-10 rounded-[1rem] border flex items-center justify-center shadow-md " + (activeSession ? "bg-[#f0f6f3] border-[#5c7c6d]/25 text-[#5c7c6d]" : "bg-white border-slate-200 text-slate-400")}>
                        <Radio className="w-4.5 h-4.5" />
                     </div>
                     <div>
                        <h3 className={"text-[16px] font-black tracking-tight leading-none " + (activeSession ? "text-[#1c1c1c]" : "text-slate-500")}>Live Tracking</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] mt-1.5">Active attendance</p>
                     </div>
                  </div>
                  <button onClick={loadSessions} className={"w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 shadow-sm hover:scale-110 " + (activeSession ? "bg-[#f4f8f6] hover:bg-[#eef4f0] border-[#5c7c6d]/20 text-[#5c7c6d]" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500")}>
                     <Activity className="w-4 h-4" />
                  </button>
               </div>

               {/* Status Breakdown: Present / Late / Absent - Compact Premium Style */}
               <div className="relative z-10 grid grid-cols-3 gap-3 mb-5">
                  {/* Present - Green Gradient */}
                  <div className="rounded-[1rem] border-none bg-[linear-gradient(135deg,#5c7c6d_0%,#466356_100%)] p-3 shadow-[0_6px_16px_rgba(92,124,109,0.2)] hover:shadow-[0_8px_20px_rgba(92,124,109,0.3)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden relative">
                     <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity duration-500 group-hover:scale-110">
                         <CheckCircle className="w-16 h-16 text-white" />
                     </div>
                     <div className="flex justify-between items-start relative z-10 mb-1.5">
                        <div className="text-[20px] font-black text-white leading-none drop-shadow-sm">{activePresentCount}</div>
                        <div className="w-6 h-6 rounded-[0.5rem] bg-white/10 border border-white/10 flex items-center justify-center shadow-inner group-hover:bg-white/20 transition-colors">
                           <CheckCircle className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        </div>
                     </div>
                     <div className="relative z-10 flex items-center justify-between mt-3">
                        <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white">Present</span>
                        <span className="text-[7.5px] font-bold text-white bg-black/10 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">{presentPercent}%</span>
                     </div>
                  </div>

                  {/* Late - Amber Gradient */}
                  <div className="rounded-[1rem] border-none bg-[linear-gradient(135deg,#d97706_0%,#b45309_100%)] p-3 shadow-[0_6px_16px_rgba(217,119,6,0.2)] hover:shadow-[0_8px_20px_rgba(217,119,6,0.3)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden relative">
                     <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity duration-500 group-hover:scale-110">
                         <Clock className="w-16 h-16 text-white" />
                     </div>
                     <div className="flex justify-between items-start relative z-10 mb-1.5">
                        <div className="text-[20px] font-black text-white leading-none drop-shadow-sm">{activePendingCount}</div>
                        <div className="w-6 h-6 rounded-[0.5rem] bg-white/10 border border-white/10 flex items-center justify-center shadow-inner group-hover:bg-white/20 transition-colors">
                           <Clock className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        </div>
                     </div>
                     <div className="relative z-10 flex items-center justify-between mt-3">
                        <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white">Late</span>
                        <span className="text-[7.5px] font-bold text-white bg-black/10 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">{pendingPercent}%</span>
                     </div>
                  </div>

                  {/* Absent - Rose Gradient */}
                  <div className="rounded-[1rem] border-none bg-[linear-gradient(135deg,#e11d48_0%,#be123c_100%)] p-3 shadow-[0_6px_16px_rgba(225,29,72,0.2)] hover:shadow-[0_8px_20px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden relative">
                     <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity duration-500 group-hover:scale-110">
                         <Ban className="w-16 h-16 text-white" />
                     </div>
                     <div className="flex justify-between items-start relative z-10 mb-1.5">
                        <div className="text-[20px] font-black text-white leading-none drop-shadow-sm">{activeAbsentCount}</div>
                        <div className="w-6 h-6 rounded-[0.5rem] bg-white/10 border border-white/10 flex items-center justify-center shadow-inner group-hover:bg-white/20 transition-colors">
                           <Ban className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        </div>
                     </div>
                     <div className="relative z-10 flex items-center justify-between mt-3">
                        <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white">Absent</span>
                        <span className="text-[7.5px] font-bold text-white bg-black/10 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">{absentPercent}%</span>
                     </div>
                  </div>
               </div>

          {/* Roster Divider */}
          <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent mb-4"></div>

          {/* Roster List */}
          <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-2.5 space-y-2.5 w-full pb-2">
            {liveAttendance.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 h-full text-center">
                  <div className={"w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg border bg-gradient-to-br from-[#f4f7f6] to-[#eef4f0] border-[#5c7c6d]/10"}>
                    <Users className="w-8 h-8 text-[#5c7c6d]/35" />
                  </div>
                  <div className="text-[14px] font-black tracking-tight mb-1 text-[#1c1c1c]">No students scanned</div>
                  <div className="text-[11.5px] text-slate-400 font-medium max-w-[270px] leading-relaxed">Students will appear here once they scan the QR code with their account</div>
               </div>
            ) : (
               liveAttendance.map((record, index) => {
                  const status = record.status || "late"
                  const statusStyles = {
                     present: "border-[#5c7c6d]/25 bg-[linear-gradient(180deg,#f6fbf8_0%,#ffffff_100%)] shadow-[0_8px_16px_rgba(92,124,109,0.06)] hover:shadow-[0_12px_24px_rgba(92,124,109,0.10)]",
                     late: "border-amber-600/25 bg-[linear-gradient(180deg,#fffbf7_0%,#ffffff_100%)] shadow-[0_8px_16px_rgba(217,119,6,0.06)] hover:shadow-[0_12px_24px_rgba(217,119,6,0.10)]",
                     absent: "border-rose-400/25 bg-[linear-gradient(180deg,#fef8f7_0%,#ffffff_100%)] shadow-[0_8px_16px_rgba(244,63,94,0.06)] hover:shadow-[0_12px_24px_rgba(244,63,94,0.10)]",
                     pending: "border-amber-600/25 bg-[linear-gradient(180deg,#fffbf7_0%,#ffffff_100%)] shadow-[0_8px_16px_rgba(217,119,6,0.06)] hover:shadow-[0_12px_24px_rgba(217,119,6,0.10)]",
                  }
                  const statusDot = { present: "bg-[#5c7c6d]", late: "bg-amber-500", pending: "bg-amber-400", absent: "bg-rose-400" }
                  const statusBadgeStyles = { 
                     present: "text-[#5c7c6d] bg-[#eef4f0] border-[#5c7c6d]/25", 
                     late: "text-amber-700 bg-amber-100 border-amber-600/25", 
                     pending: "text-amber-700 bg-amber-100 border-amber-600/25", 
                     absent: "text-rose-700 bg-rose-100 border-rose-400/25" 
                  }
                  const statusLabel = { present: 'present', late: 'late', pending: 'pending', absent: 'absent' }
                  
                  return (
                     <div key={record.id || index} className={"flex items-center justify-between rounded-[1rem] px-3.5 py-3 border transition-all duration-300 group hover:scale-[1.01] hover:-translate-y-0.5 " + (statusStyles[status] || "border-slate-200/60 bg-white")}>
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                           <div className="relative shrink-0">
                              <div className={"w-9.5 h-9.5 rounded-[0.9rem] flex items-center justify-center text-[11px] font-black transition-all duration-300 border " + 
                                 (status === 'present' ? "bg-[#eef4f0] text-[#5c7c6d] border-[#5c7c6d]/25" :
                                  status === 'late' || status === 'pending' ? "bg-amber-100 text-amber-700 border-amber-600/25" :
                                  "bg-rose-100 text-rose-700 border-rose-400/25"
                              )}>
                                 {getInitials(record.studentName || record.studentEmail || "S")}
                              </div>
                              <span className={"absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md z-20 " + statusDot[status]}></span>
                           </div>
                           <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-black text-[#1c1c1c] tracking-tight truncate">
                                 {record.studentName || record.studentEmail || "Student"}
                              </div>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                 <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[7px] leading-none font-black uppercase tracking-[0.16em] border " + (statusBadgeStyles[status])}>
                                    {statusLabel[status]}
                                 </span>
                              </div>
                           </div>
                        </div>
                        {record.checkedInAt && (
                           <div className="text-right flex flex-col justify-center items-end shrink-0 ml-4">
                              <div className="text-[7px] uppercase tracking-[0.2em] text-[#1c1c1c]/45 font-black mb-0.5">Time</div>
                              <div className="text-[12px] font-black text-[#1c1c1c]">{formatTime(record.checkedInAt)}</div>
                           </div>
                        )}
                     </div>
                  )
               })
            )}
          </div>
</Card>

            <Card className={"xl:col-span-1 shadow-[0_12px_24px_rgba(60,85,72,0.28)] rounded-[1.2rem] flex flex-col transition-all relative overflow-hidden ring-1 ring-white/10 group min-h-[276px] " + (activeSession ? "bg-gradient-to-tr from-[#1f2a25] via-[#3f5a4f] to-[#5c7c6d] text-white" : "bg-gradient-to-tr from-[#25332d] via-[#3d5449] to-[#5b7b6c] text-white")} noPadding>
               <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.14)_0%,_transparent_60%)] pointer-events-none"></div>
          <div className="p-5 h-full flex flex-col justify-center relative z-10">
             {activeSession ? (
                <div className="flex flex-col h-full items-center justify-between py-2">
                   <div className="absolute top-4 left-0 w-full flex justify-center">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">Transmitting Live</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-center justify-center w-full flex-1 mt-8">
                      {getSessionCode(activeSession) ? (
                         <div className="bg-white p-3.5 rounded-[1.6rem] shadow-[0_14px_34px_rgba(0,0,0,0.22)] transform hover:scale-[1.03] transition-all duration-300 cursor-pointer relative group" onClick={() => handleCopyCode(getSessionCode(activeSession))}>
                            <QRCodeSVG value={getSessionCode(activeSession)} size={145} bgColor="transparent" fgColor="#1c1c1c" />
                         </div>
                      ) : (
                         <div className="w-[145px] h-[145px] flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10"><Smartphone className="w-10 h-10 text-white/50" /></div>
                      )}
                   </div>
                   <div className="text-center mt-2 shrink-0">
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100/60 mb-2">Class Join Code</div>
                      <div className="text-[34px] font-black tracking-widest text-white drop-shadow-md leading-none">{getSessionCode(activeSession) || '--'}</div>
                   </div>
                </div>
             ) : (
                 <div className="flex flex-col h-full justify-center">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/70 mb-6 w-full">
                      <span className="flex items-center gap-1.5"><Radio className="w-3 h-3 text-white/80" /> Quick Actions</span>
                   </div>
                   <div className="flex flex-col items-center justify-center flex-1 my-4">
                      <div className="w-16 h-16 bg-white/10 rounded-[1.25rem] border border-white/10 flex items-center justify-center mb-5 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-500">
                         <Radio className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-[16px] font-black text-white text-center leading-tight">Start Tracking</h3>
                      <p className="text-[11px] text-white/70 text-center font-medium mt-2.5 max-w-[200px] leading-relaxed">Launch a session to reveal the QR code for student check-ins.</p>
                   </div>
                   <Button
                      icon={Radio}
                      label="Launch Attendance"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="w-full h-11 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 mt-2 shadow-[0_8px_20px_rgba(0,0,0,0.15)] text-[12px] font-black rounded-[0.95rem] border border-white/20"
                   />
                </div>
             )}
          </div>
        </Card>
      </div>

         {/* Metrics Strip */}
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <Card className="rounded-[1.2rem] p-4 border border-slate-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#f7faf8_100%)] shadow-[0_8px_18px_rgba(20,24,22,0.05)] h-[122px] hover:shadow-[0_12px_24px_rgba(20,24,22,0.08)] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
               <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                     <Users className="w-3.5 h-3.5 text-[#5c7c6d]" /> Enrolled Students
                  </div>
                  <div className="w-8 h-8 rounded-[0.8rem] bg-[#eef4f0] border border-[#5c7c6d]/20 flex items-center justify-center">
                     <Users className="w-4 h-4 text-[#5c7c6d]" />
                  </div>
               </div>
               <div className="mt-3 flex items-end justify-between">
                  <div className="text-[34px] leading-none font-black text-[#1c1c1c]">{students.length}</div>
                  <svg className="w-20 h-10 text-[#5c7c6d]/65" viewBox="0 0 100 40" fill="none">
                     <path d="M5 30 C20 10, 36 34, 52 18 C65 6, 80 28, 95 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
               </div>
            </Card>

            <Card className="rounded-[1.2rem] p-4 border border-slate-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#f7faf8_100%)] shadow-[0_8px_18px_rgba(20,24,22,0.05)] h-[122px] hover:shadow-[0_12px_24px_rgba(20,24,22,0.08)] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
               <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                     <ClipboardList className="w-3.5 h-3.5 text-[#5c7c6d]" /> Total Sessions
                  </div>
                  <div className="w-8 h-8 rounded-[0.8rem] bg-[#eef4f0] border border-[#5c7c6d]/20 flex items-center justify-center">
                     <Book className="w-4 h-4 text-[#5c7c6d]" />
                  </div>
               </div>
               <div className="mt-3 flex items-end justify-between">
                  <div className="text-[34px] leading-none font-black text-[#1c1c1c]">{sessions.length}</div>
                  <div className="flex items-end gap-1.5 h-10">
                     <span className="w-2.5 h-4 rounded-full bg-[#dfe9e3]"></span>
                     <span className="w-2.5 h-6 rounded-full bg-[#cadbcf]"></span>
                     <span className="w-2.5 h-8 rounded-full bg-[#a8c2b3]"></span>
                     <span className="w-2.5 h-10 rounded-full bg-[#5c7c6d]"></span>
                  </div>
               </div>
            </Card>

            <Card className="rounded-[1.2rem] p-4 border border-[#5c7c6d]/25 bg-[linear-gradient(180deg,#f6fbf8_0%,#ffffff_100%)] shadow-[0_10px_22px_rgba(92,124,109,0.10)] h-[122px] hover:shadow-[0_14px_28px_rgba(92,124,109,0.14)] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
               <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#5c7c6d]">
                     <BarChart3 className="w-3.5 h-3.5 text-[#5c7c6d]" /> Avg Attendance
                  </div>
                  <div className="w-8 h-8 rounded-[0.8rem] bg-[#eef4f0] border border-[#5c7c6d]/20 flex items-center justify-center">
                     <Activity className="w-4 h-4 text-[#5c7c6d]" />
                  </div>
               </div>
               <div className="mt-3 flex items-end justify-between">
                  <div className="text-[34px] leading-none font-black text-[#5c7c6d]">{attendanceRate}%</div>
                  <div className="relative w-11 h-11">
                     <div className="absolute inset-0 rounded-full border-[4px] border-[#d8e5de]"></div>
                     <div className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-[#5c7c6d] border-r-[#5c7c6d] rotate-45"></div>
                  </div>
               </div>
            </Card>

            <Card className="rounded-[1.2rem] p-4 border border-[#5c7c6d]/25 bg-[linear-gradient(180deg,#f6fbf8_0%,#ffffff_100%)] shadow-[0_10px_22px_rgba(92,124,109,0.10)] h-[122px] hover:shadow-[0_14px_28px_rgba(92,124,109,0.14)] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
               <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-[#5c7c6d]">
                  <span className="inline-flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-[#5c7c6d]" /> Attendance Mix</span>
                  <span className={"w-2 h-2 rounded-full " + (activeSession ? 'bg-[#5c7c6d] animate-pulse shadow-lg shadow-[#5c7c6d]/40' : 'bg-slate-300')}></span>
               </div>
               <div className="mt-2.5 flex items-center justify-between">
                  <div className="relative w-[58px] h-[58px] shrink-0">
                     <svg viewBox="0 0 64 64" className="w-[58px] h-[58px] -rotate-90">
                        <circle cx="32" cy="32" r={donutRadius} stroke="#d8e5de" strokeWidth="7" fill="none" />
                        <circle
                           cx="32"
                           cy="32"
                           r={donutRadius}
                           stroke="#5c7c6d"
                           strokeWidth="7"
                           fill="none"
                           strokeDasharray={donutCircumference}
                           strokeDashoffset={donutCircumference - presentArc}
                           strokeLinecap="round"
                        />
                        <circle
                           cx="32"
                           cy="32"
                           r={donutRadius}
                           stroke="#f59e0b"
                           strokeWidth="7"
                           fill="none"
                           strokeDasharray={donutCircumference}
                           strokeDashoffset={donutCircumference - pendingArc}
                           strokeLinecap="round"
                           transform={`rotate(${(presentPercent / 100) * 360} 32 32)`}
                        />
                        <circle
                           cx="32"
                           cy="32"
                           r={donutRadius}
                           stroke="#f43f5e"
                           strokeWidth="7"
                           fill="none"
                           strokeDasharray={donutCircumference}
                           strokeDashoffset={donutCircumference - absentArc}
                           strokeLinecap="round"
                           transform={`rotate(${((presentPercent + pendingPercent) / 100) * 360} 32 32)`}
                        />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#5c7c6d]">{liveTotalCount}</div>
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#5c7c6d]/80 space-y-1">
                     <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#5c7c6d]"></span>P {presentPercent}%</div>
                     <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>L {pendingPercent}%</div>
                     <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span>A {absentPercent}%</div>
                  </div>
               </div>
            </Card>
         </div>

      {/* Lower area - Session History and Archive */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        
        {/* Session History List */}
      <Card className="xl:col-span-1 p-6 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-white border-0 h-[420px] flex flex-col relative overflow-hidden">
         <div className="flex items-center justify-between mb-5 relative z-10">
              <h3 className="text-[17px] font-semibold tracking-tight text-[#111827]">Session history</h3>
              <div className="bg-gray-100/80 px-2.5 py-1 flex items-center justify-center rounded-full">
                 <span className="text-[12px] font-medium text-gray-500">{closedSessions.length} total</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-3 relative z-10">
               {closedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                     <div className="text-[14px] font-medium text-gray-600">No history yet</div>
                     <p className="text-[12px] text-gray-400 mt-1">Sessions will display here</p>
                  </div>
               ) : (
                  closedSessions.map((session, idx) => {
                     const isActive = String(selectedSessionId) === String(session.id)
                     const participantCount = session.attendanceCount || session.attendances?.length || 0;
                     return (
                        <button
                           key={session.id}
                           type="button"
                           onClick={() => loadAttendance(session.id)}
                           className={
                              "w-full text-left rounded-[20px] p-4 transition-all duration-200 group relative " +
                              (isActive 
                                 ? "bg-[#fafcfb]" 
                                 : "bg-white hover:bg-slate-50")
                           }
                        >
                           <div className="flex items-center justify-between mb-3">
                              <div className={`text-[11px] font-semibold px-3 py-1 rounded-full ${isActive ? 'bg-[#5c7c6d] text-white shadow-[0_2px_8px_rgba(92,124,109,0.3)]' : 'bg-slate-100 text-slate-500'}`}>
                                 Session {idx + 1}
                              </div>
                              {isActive && <div className="w-2 h-2 rounded-full bg-[#5c7c6d]"></div>}
                           </div>

                           <div className="flex flex-col gap-2.5">
                              <div className={`font-semibold text-[15px] truncate tracking-tight leading-none ${isActive ? "text-[#1c1c1c]" : "text-[#111827]"}`}>
                                 {getSessionName(session)}
                              </div>
                              
                              <div className="flex items-center justify-between">
                                 <div className="text-[13px] font-medium flex items-center gap-1.5 text-gray-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDate(getSessionStart(session))}
                                 </div>
                                 <div className="flex items-center">
                                    <span className="text-[13px] font-bold text-gray-800">{participantCount}</span>
                                    <span className="text-[13px] font-medium text-gray-400 ml-1">joined</span>
                                 </div>
                              </div>
                           </div>
                        </button>
                     )
                  })
               )}
            </div>
          </Card>

            {/* Right Side: Session Details */}
         <div className="xl:col-span-2 min-h-0">
          {/* Selected Session Details Data Table */}
          <Card className="p-6 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-white border-0 h-[420px] flex flex-col relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4 relative z-10 w-full pb-2">
               <div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-[#111827]">Historical Data</h3>
               </div>
               <div className="flex items-center gap-3">
                  <div className="bg-gray-100/80 px-2.5 py-1 flex items-center justify-center rounded-full">
                     <span className="text-[12px] font-medium text-gray-500">Record</span>
                  </div>
                  <Button
                     icon={LucideHistory}
                     label="Export"
                     onClick={exportAttendanceCsv}
                     disabled={!selectedSession || attendance.length === 0}
                     className="h-8 px-4 text-[12px] bg-[#111827] text-white rounded-full font-semibold shadow-sm hover:bg-black transition-colors"
                  />
               </div>
            </div>

            {selectedSession ? (
               <div className="flex-1 flex flex-col relative z-10 min-h-0">
                  <div className="flex flex-wrap md:flex-nowrap items-stretch bg-gray-50/50 rounded-[20px] p-2.5 mb-5 shrink-0">
                     <div className="flex-1 flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0">
                           <div className="text-[11px] font-medium text-gray-400 mb-0.5">Session</div>
                           <div className="font-semibold text-[14px] text-[#111827] truncate">{getSessionName(selectedSession)}</div>
                        </div>
                     </div>
                     <div className="hidden md:block w-[1px] my-2 bg-gray-200"></div>
                     <div className="flex-1 flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0">
                           <div className="text-[11px] font-medium text-gray-400 mb-0.5">Date</div>
                           <div className="font-semibold text-[14px] text-[#111827] truncate">{formatDate(getSessionStart(selectedSession))}</div>
                        </div>
                     </div>
                     <div className="hidden md:block w-[1px] my-2 bg-gray-200"></div>
                     <div className="flex-1 flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0">
                           <div className="text-[11px] font-medium text-gray-400 mb-0.5">Time</div>
                           <div className="font-semibold text-[14px] text-[#111827] truncate">{formatTime(getSessionStart(selectedSession))}</div>
                        </div>
                     </div>
                     <div className="flex items-center justify-center gap-1.5 px-4 bg-white rounded-[16px] shadow-sm ml-2">
                        <span className="font-bold text-[18px] text-[#111827]">{attendance.length}</span>
                        <span className="text-[12px] font-medium text-gray-400">Total</span>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2.5">
                     {attendance.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center py-10 opacity-70">
                           <div className="text-[13px] text-gray-400 font-medium">No records found.</div>
                        </div>
                     ) : (
                        attendance.map((record, index) => {
                           const student = record.student || {}
                           const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || 'Student'
                           const status = record.status || 'pending'
                           const statusStyles = {
                              present: 'bg-[#5c7c6d] text-white shadow-[0_2px_8px_rgba(92,124,109,0.3)]',
                              pending: 'bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)]',
                              absent: 'bg-rose-500 text-white shadow-[0_2px_8px_rgba(243,33,113,0.3)]',
                           }
                           return (
                              <div key={record.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[16px] p-3 border border-gray-100 hover:bg-gray-50/50 transition-all gap-3 sm:gap-0">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-gray-100/80 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">
                                        {getInitials(name)}
                                     </div>
                                     <div>
                                       <div className="text-[14px] font-semibold text-[#111827] leading-none mb-1">{name}</div>
                                       <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                                           {record.method || 'Manual entry'}
                                        </div>
                                     </div>
                                 </div>
                                 <span className={"text-[11px] sm:self-center self-start font-semibold px-3 py-1 rounded-full capitalize " + (statusStyles[status] || 'bg-gray-100 text-gray-600')}>
                                    {status}
                                 </span>
                              </div>
                           )
                        })
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-[20px] text-center relative z-10 m-2 mt-0">
                  <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                     <MousePointerClick className="w-5 h-5 text-gray-400" />
                  </div>
                  <h4 className="text-[15px] font-semibold text-[#111827]">No Session Selected</h4>
                  <p className="text-[13px] text-gray-500 max-w-[240px] mt-2">Click a past session in the history panel to view details.</p>
               </div>
            )}
          </Card>

            </div>

            <Card className="xl:col-span-1 p-6 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-white border-0 h-[420px] flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="text-[17px] font-semibold tracking-tight text-[#111827]">Students Roster</h3>
                  <div className="bg-gray-100/80 px-2.5 py-1 flex items-center justify-center rounded-full">
                     <span className="text-[12px] font-medium text-gray-500">{students.length} total</span>
                  </div>
               </div>

               <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-3">
                  {students.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="text-[14px] font-medium text-gray-600">No students yet</div>
                     </div>
                  ) : (
                     students.slice(0, 20).map((student, index) => {
                        const studentName = getStudentName(student)
                        const studentEmail = getStudentEmail(student)
                        return (
                           <div
                              key={student.id || studentEmail || index}
                              className="flex items-center gap-3 bg-white hover:bg-slate-50 transition-all p-2 rounded-[16px] cursor-default"
                           >
                              <div className="w-10 h-10 rounded-full bg-gray-100/80 flex items-center justify-center text-[12px] font-semibold text-gray-600 shrink-0">
                                 {getInitials(studentName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="text-[14px] font-semibold text-[#111827] truncate leading-none mb-1">{studentName}</div>
                                 <div className="text-[12px] text-gray-400 font-medium truncate">{studentEmail || 'No email'}</div>
                              </div>
                           </div>
                        )
                     })
                  )}
               </div>
            </Card>
         </div>

      <Modal isOpen={isStartSessionModalOpen} onClose={() => setIsStartSessionModalOpen(false)} title="Launch Live Session">
         <form onSubmit={createSession} className="space-y-6">
            <div>
               <label className="block mb-2 text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest">Session Label</label>
               <input
                  required
                  autoFocus
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g. Week 2 Lecture"
                  className="w-full h-12 rounded-[1rem] bg-[#fbfaf8] px-4 text-[14px] font-bold text-[#1c1c1c] focus:bg-white focus:ring-2 focus:ring-[#5C7C6D] border border-slate-200 focus:border-[#5c7c6d] shadow-inner focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
               />
            </div>
            <div>
               <label className="block mb-2 text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest">Capture Mode</label>
               <select
                  value={attendanceMode}
                  onChange={(e) => setAttendanceMode(e.target.value)}
                  className="w-full h-12 rounded-[1rem] bg-[#fbfaf8] px-4 text-[14px] font-bold text-[#1c1c1c] focus:bg-white focus:ring-2 focus:ring-[#5C7C6D] border border-slate-200 focus:border-[#5c7c6d] shadow-inner focus:outline-none transition-all"
               >
                  <option value="qr_or_code">Digital QR + Link Tracking</option>
                  <option value="manual_only">Manual Roll Call (No QR)</option>
               </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <Button label="Cancel" onClick={() => setIsStartSessionModalOpen(false)} variant="ghost" className="h-11 text-[13px] font-bold px-6" />
               <Button label="Initialize Session" onClick={createSession} className="bg-[#1c1c1c] hover:bg-black text-white h-11 text-[13px] font-black px-8 shadow-[0_8px_20px_rgba(0,0,0,0.15)] rounded-[1rem]" />
            </div>
         </form>
      </Modal>
    </div>
  )
}

