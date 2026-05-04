import { useMemo, useState, useEffect } from 'react'
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
            'rounded-3xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] ' +
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
  
  // Data State
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
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
      () => closedSessions.find((session) => session.id === selectedSessionId) || null,
      [closedSessions, selectedSessionId]
   )
   const presentCount = attendance.filter((record) => record.status === 'present').length
   const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0
   const activePresentCount = activeAttendance.filter((record) => record.status === 'present').length
   const activePendingCount = activeAttendance.filter((record) => record.status === 'pending').length
   const activeAbsentCount = activeAttendance.filter((record) => record.status === 'absent').length
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

  const loadSessions = () => {
    if (!selectedClassId) return
    return withFeedback(async () => {
         const data = await apiRequest("/instructor/classes/" + selectedClassId + "/sessions")
      setSessions(data.sessions)
      setAttendance([])
      setSelectedSessionId(null)
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
         loadSessions()
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
    setSelectedSessionId(sessionId)
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
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     Total Classes
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.totalClasses}
                     <Activity className="w-6 h-6 text-[#5c7c6d]" />
                  </div>
               </Card>
               
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <Users className="w-3.5 h-3.5" /> Total Students
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {classes.reduce((acc) => acc + 10, 0)}
                     <svg className="w-16 h-8 text-blue-100" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                  </div>
               </Card>

               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <BadgeDollarSign className="w-3.5 h-3.5" /> Attendance
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.attendanceRate}%
                  </div>
               </Card>
            </div>

            {/* Right tall green card */}
            <Card className="col-span-1 lg:row-span-2 xl:col-start-4 xl:row-start-1 bg-[#5c7c6d] border-[#4a6357] text-white p-6 shadow-sm rounded-[1.25rem] flex flex-col justify-between min-h-[300px]">
               <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Live Sessions</div>
               <div className="text-6xl font-black mt-auto flex justify-between items-end pb-4">
                  {activeSession ? 1 : 0}
                  <svg className="w-16 h-8 text-emerald-300 opacity-50" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
               </div>
            </Card>

            {/* Active Classes Area */}
            <Card className="col-span-1 lg:col-span-2 p-7 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative overflow-hidden h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <h3 className="text-base font-bold text-[#1c1c1c]">Active Classes</h3>
                     <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> On Track</span>
                  </div>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="bg-[#1c1c1c] text-white h-9 px-5 shadow-sm text-xs rounded-full" />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {classes.length === 0 ? (
                     <div className="flex items-center justify-center p-4 bg-[#f8f7f5]/40 rounded-xl">
                        <p className="text-sm text-slate-500 font-semibold">No classes yet. Create one above.</p>
                     </div>
                  ) : (
                     classes.map(cls => (
                        <div key={cls.id} onClick={() => setSelectedClassId(cls.id)} className="cursor-pointer border border-slate-100 bg-[#f8f7f5] rounded-[1rem] p-4 hover:shadow-md hover:border-slate-200 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-bold text-[#1c1c1c] text-[15px] group-hover:text-[#5c7c6d] transition-colors">{cls.name}</h4>
                              <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5 flex shrink-0 bg-white shadow-sm p-1 rounded-full items-center justify-center text-slate-400" /></button>
                           </div>
                           <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-6">
                              <div>
                                 <div className="mb-1">Class ID</div>
                                 <div className="text-xs text-[#1c1c1c]">{cls.id}</div>
                              </div>
                              <div className="text-right">
                                 <div className="mb-1 text-slate-400">Join Code</div>
                                 <div className="text-xs text-rose-500">{cls.joinCode}</div>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </Card>

            {/* Profile Info Area */}
            <Card className="col-span-1 p-6 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative flex flex-col items-center justify-center text-center h-[300px]">
               <div className="w-16 h-16 rounded-full bg-[#f4f2ee] shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group">
                  <Users className="w-7 h-7 text-slate-400" />
               </div>
               <div className="font-bold text-[#1c1c1c] text-[15px]">{user?.fullName || 'Sample Instructor'}</div>
               <div className="text-[10px] font-extrabold tracking-widest text-slate-400 mt-1 mb-6 uppercase">{user?.email || 'INSTRUCTOR@DEMO.LOCAL'}</div>
               
               <div className="flex w-full justify-between items-center gap-2 p-3 bg-[#ebeae7] rounded-[1rem] shadow-inner border border-slate-200/50">
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Classes</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalClasses}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Students</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{classes.reduce((acc) => acc + 10, 0)}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Sessions</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalSessions}</div>
                  </div>
               </div>
            </Card>
         </div>

         {/* Dashboard Bottom Row */}
         <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <Card className="flex-[0_1_auto] w-full lg:w-[600px] p-6 flex items-center justify-between gap-4 bg-white overflow-hidden relative shadow-sm border border-slate-200/60 rounded-[1.25rem] hover:shadow-md transition-shadow h-[180px]">
               <div className="flex flex-col h-full max-w-[320px] z-10 justify-center">
                  <h3 className="text-base font-bold text-[#1c1c1c]">Available Class Options</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">Create new modules and securely invite students into your class portal.</p>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="mt-5 bg-[#5c7c6d] hover:bg-[#4a6357] text-white w-fit min-h-0 h-9 px-6 font-bold text-[11px] rounded-full" />
               </div>
               <div className="absolute right-0 top-0 w-64 h-full bg-[#f4f4f5]/50 -skew-x-12 translate-x-8 z-0"></div>
               <div className="relative w-28 h-32 transform scale-110 z-10 translate-x-2 hidden md:block">
                  <div className="absolute w-full h-full bg-[#5C7C6D]/10 rounded-xl rotate-6 translate-x-1.5 translate-y-1.5"></div>
                  <div className="absolute w-full h-full bg-[#5C7C6D] rounded-lg flex items-center justify-center shadow-lg shadow-[#5C7C6D]/20">
                     <Book className="w-10 h-10 text-white/90" />
                  </div>
               </div>
            </Card>
            <Card className="w-full lg:w-[320px] p-6 flex flex-col justify-center border border-slate-200/60 shadow-sm rounded-[1.25rem] bg-white hover:shadow-md transition-shadow h-[180px]">
               <h3 className="text-sm font-bold text-[#1c1c1c] mb-4">Recent Sessions</h3>
               <div className="space-y-4">
                  {classes.flatMap(c => c.sessions || []).slice(0, 3).map((session, i) => (
                     <div key={session.id || i} className="flex justify-between items-center px-1">
                        <div className="relative pl-3 border-l-2 border-[#5C7C6D]">
                           <div className="text-[12px] font-bold text-[#1c1c1c] tracking-tight">{new Date(session.startTime).toLocaleDateString()}</div>
                           <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-[11px] font-bold text-[#5C7C6D] bg-[#E8EFEA] px-2.5 py-0.5 rounded-full shadow-sm ring-1 ring-white">
                           +{session.attendances?.length || 0}
                        </div>
                     </div>
                  ))}
                  {classes.length === 0 && (
                     <div className="flex flex-col items-center justify-center p-3">
                        <div className="w-10 h-10 rounded-full bg-[#f4f4f5] flex items-center justify-center mb-2"><Clock className="w-4 h-4 text-slate-300" /></div>
                        <div className="text-[11px] font-bold text-slate-400">No sessions</div>
                     </div>
                  )}
               </div>
            </Card>
            <Card className="flex-1 w-full lg:max-w-[230px] p-6 flex flex-col items-center text-center justify-center bg-white shadow-sm rounded-[1.25rem] border border-slate-200/60 hover:shadow-md transition-shadow h-[180px]">
               <div className="w-12 h-12 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group cursor-pointer hover:border-[#5c7c6d] transition-colors">
                  <Fingerprint className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
               </div>
               <h3 className="text-[13px] font-bold text-[#1c1c1c]">Security Check</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-relaxed">Update devices</p>
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
    <div className="min-h-[100vh] bg-transparent w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 transition-colors">
      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row items-start lg:items-center justify-between mb-10 gap-4 pt-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedClassId(null)}
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

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <Users className="w-3.5 h-3.5" /> Enrolled Students
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {students.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <ClipboardList className="w-3.5 h-3.5" /> Total Sessions
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {sessions.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Book className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <BarChart3 className="w-3.5 h-3.5" /> Avg Attendance
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {attendanceRate}%
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Section: Live Tracking & QR */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
        
        {/* Live Attendance Panel - Elegant Theme */}
        <Card className={"col-span-1 p-8 rounded-[1.5rem] border relative flex flex-col overflow-hidden transition-all duration-500 " + (activeSession ? "bg-white border-[#5c7c6d]/20 shadow-[0_15px_60px_rgba(92,124,109,0.08)] min-h-[440px]" : "bg-[#fcfcfa] border-slate-200/50 shadow-sm min-h-[350px]")}>
          {activeSession && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-[#5c7c6d] to-emerald-400 opacity-50"></div>}
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className={"text-[20px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Live Tracking</h3>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Real-time Class Roster</p>
            </div>
            <button onClick={loadSessions} className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors shadow-sm focus:outline-none">
              <Activity className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-[#ffffff] rounded-[1.25rem] border border-slate-200/60 p-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.03)] mb-8 relative z-10 w-full overflow-hidden">
            <div className="flex-1 text-center py-3 relative group hover:bg-[#f4f7f6]/60 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-[#5c7c6d] font-black mb-1.5 opacity-90"><CheckCircle className="w-3.5 h-3.5" /> Present</div>
               <div className="text-[34px] md:text-[40px] font-black text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{activePresentCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 relative group hover:bg-amber-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-amber-600 font-black mb-1.5 opacity-90"><Clock className="w-3.5 h-3.5" /> Pending</div>
               <div className="text-[34px] md:text-[40px] font-black text-amber-500 leading-none tracking-tighter drop-shadow-sm">{activePendingCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 group hover:bg-rose-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-rose-600 font-black mb-1.5 opacity-90"><Ban className="w-3.5 h-3.5" /> Absent</div>
               <div className="text-[34px] md:text-[40px] font-black text-rose-500 leading-none tracking-tighter drop-shadow-sm">{activeAbsentCount}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-3.5 relative z-10 w-full pl-1 pb-2">
            {liveAttendance.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 h-full text-center bg-[#fdfcfb] rounded-[1.5rem] border border-dashed border-slate-200 mx-1">
                  <div className={"w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border " + (activeSession ? "bg-[#f4f7f6] border-[#5c7c6d]/10 animate-pulse" : "bg-[#f8f7f5] border-slate-100")}>
                    <Users className={"w-10 h-10 " + (activeSession ? "text-[#5c7c6d]/40" : "text-slate-300")} />
                  </div>
                  <div className={"text-[17px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Monitoring Active Room...</div>
                  <div className="text-[13px] text-slate-400 mt-2 font-medium max-w-[250px] leading-relaxed">Students will appear right here as soon as they scan the session code.</div>
               </div>
            ) : (
               liveAttendance.map((record, index) => {
                  const status = record.status || "pending"
                  const statusStyles = {
                     present: "bg-white border-emerald-100/60 shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:shadow-[0_12px_30px_rgba(16,185,129,0.12)]",
                     pending: "bg-white border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]",
                     absent: "bg-white border-rose-100/60 shadow-[0_8px_20px_rgba(244,63,94,0.06)] hover:shadow-[0_12px_30px_rgba(244,63,94,0.12)]",
                  }
                  const statusDot = { present: "bg-emerald-500", pending: "bg-amber-400", absent: "bg-rose-500" }
                  const statusBadge = { present: "text-emerald-700 bg-emerald-50 border border-emerald-100", pending: "text-amber-700 bg-amber-50 border border-amber-100", absent: "text-rose-700 bg-rose-50 border border-rose-100" }
                  
                  return (
                     <div key={record.id || index} className={"flex items-center justify-between rounded-[1.25rem] p-4 border transition-all duration-300 transform hover:-translate-y-1 group " + (statusStyles[status] || "bg-white border-slate-100")} style={{animationDelay: (index * 50) + "ms"}}>
                        <div className="flex justify-start items-center gap-4">
                           <div className="relative">
                              <div className="w-[50px] h-[50px] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center text-[16px] font-black text-slate-600 shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-300 group-hover:border-[#5c7c6d]/30 group-hover:text-[#5c7c6d]">
                                 {getInitials(record.studentName || record.studentEmail || "Student")}
                              </div>
                              <span className={"absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20 " + statusDot[status]}></span>
                           </div>
                           <div className="flex flex-col justify-center">
                              <div className="text-[15px] font-black text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">
                                 {record.studentName || record.studentEmail || "Student"}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mt-1.5 flex items-center gap-2 w-full">
                                 <span className={"px-2 py-0.5 rounded-full shadow-sm " + (statusBadge[status])}>{status}</span>
                                 <span className="opacity-50 font-black">•</span>
                                 <span className="flex items-center gap-1 opacity-75 font-semibold tracking-wide"><MousePointerClick className="w-3 h-3" /> {record.method || "manual"}</span>
                              </div>
                           </div>
                        </div>
                        {record.checkedInAt && (
                           <div className="text-right flex flex-col justify-center items-end mr-2">
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/40 font-black mb-1 truncate">Rec. Time</div>
                              <div className="text-[13px] font-black text-[#1c1c1c] bg-[#f4f7f6] px-3 py-1 rounded-lg border border-[#5c7c6d]/10 shadow-inner group-hover:bg-[#5c7c6d] group-hover:text-white transition-colors">{formatTime(record.checkedInAt)}</div>
                           </div>
                        )}
                     </div>
                  )
               })
            )}
          </div>
</Card>

        {/* QR Code / Session Status Card - More compact and perfectly themed */}
        <Card className={"col-span-1 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[1.5rem] flex flex-col transition-all relative overflow-hidden ring-1 ring-white/10 group " + (activeSession ? "bg-gradient-to-tr from-[#2d3a33] to-[#5c7c6d] text-white" : "bg-gradient-to-tr from-gray-900 to-[#1c1c1c] text-white")} noPadding>
          {activeSession && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)] pointer-events-none"></div>}
          <div className="p-7 h-full flex flex-col justify-center relative z-10">
             {activeSession ? (
                <>
                   <div className="absolute top-4 left-0 w-full flex justify-center">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">Transmitting Live</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-center justify-center w-full mt-10 mb-4">
                      {getSessionCode(activeSession) ? (
                         <div className="bg-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform hover:scale-[1.03] transition-all duration-300 cursor-pointer relative group" onClick={() => handleCopyCode(getSessionCode(activeSession))}>
                            <QRCodeSVG value={getSessionCode(activeSession)} size={160} bgColor="transparent" fgColor="#1c1c1c" />
                         </div>
                      ) : (
                         <div className="w-[160px] h-[160px] flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10"><Smartphone className="w-12 h-12 text-white/50" /></div>
                      )}
                   </div>
                   <div className="text-center mt-auto">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60 mb-2">Class Join Code</div>
                      <div className="text-[38px] font-black tracking-widest text-white drop-shadow-md leading-none">{getSessionCode(activeSession) || '--'}</div>
                   </div>
                </>
             ) : (
                <div className="flex flex-col h-full justify-center">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400/80 mb-6 w-full">
                      <span>Quick Actions</span>
                      <Radio className="w-4 h-4 opacity-50" />
                   </div>
                   <div className="flex flex-col items-center justify-center flex-1 my-4">
                      <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] border border-white/10 flex items-center justify-center mb-6 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-500">
                         <Radio className="w-8 h-8 text-white/80" />
                      </div>
                      <h3 className="text-[18px] font-black text-white text-center leading-tight">Start Tracking</h3>
                      <p className="text-[12px] text-slate-400 text-center font-medium mt-3 max-w-[200px] leading-relaxed">Launch a session to reveal the QR code for student check-ins.</p>
                   </div>
                   <Button
                      icon={Radio}
                      label="Launch Attendance"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="w-full h-12 bg-white text-[#1c1c1c] hover:bg-slate-200 mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-[13px] font-black rounded-[1rem]"
                   />
                </div>
             )}
          </div>
        </Card>
      </div>

      {/* Lower area - Session History and Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[360px_1fr] gap-6">
        
        {/* Past Sessions List */}
        <Card className="col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 bg-white min-h-[350px] max-h-[500px] flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
              <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                <LucideHistory className="w-[18px] h-[18px] text-slate-400" /> Past Sessions
              </h3>
              <span className="text-[10px] uppercase font-black text-[#5c7c6d] bg-[#f4f7f6] border border-[#5c7c6d]/20 px-2.5 py-1 rounded-lg tracking-widest">{closedSessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2.5 -mr-1 space-y-2.5">
               {closedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                     <div className="w-14 h-14 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        <Clock className="w-6 h-6 text-slate-300" />
                     </div>
                     <div className="text-[14px] font-black text-slate-400">No session history yet</div>
                     <p className="text-[11px] text-slate-400/80 mt-1.5 font-medium max-w-[200px]">Sessions you end will appear here.</p>
                  </div>
               ) : (
                  closedSessions.map((session) => {
                     const isActive = selectedSessionId === session.id
                     return (
                        <button
                           key={session.id}
                           type="button"
                           onClick={() => loadAttendance(session.id)}
                           className={
                              "w-full text-left rounded-xl p-3 border transition-all duration-300 group flex items-center justify-between " +
                              (isActive ? "border-[#5c7c6d]/40 bg-[#f4f7f6] shadow-[0_4px_15px_rgba(92,124,109,0.1)] -translate-y-0.5" : "border-slate-100/80 hover:bg-[#fbfaf8] hover:border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]")
                           }
                        >
                           <div className="flex flex-col gap-1 w-full overflow-hidden">
                              <div className={"font-bold text-[13px] truncate pr-2 tracking-tight " + (isActive ? "text-[#5c7c6d]" : "text-[#1c1c1c] group-hover:text-slate-700 transition-colors")}>{getSessionName(session)}</div>
                              <div className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-60">
                                 <Clock className="w-[10px] h-[10px] text-slate-400" /> {formatDate(getSessionStart(session))}
                              </div>
                           </div>
                           <div className="flex flex-col items-center justify-center shrink-0 pl-3">
                              <div className={"text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-colors " + (isActive ? "bg-[#5c7c6d] text-white border-[#5c7c6d]" : "bg-white border-slate-200 text-slate-500 group-hover:border-slate-300")}>
                                 {session.attendanceCount || session.attendances?.length || 0}
                              </div>
                           </div>
                        </button>
                     )
                  })
               )}
            </div>
          </Card>

        {/* Selected Session Details Data Table */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 min-h-[350px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7] to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10 w-full border-b border-slate-100 pb-5">
             <div>
                <h3 className="text-lg font-black tracking-tight text-[#1c1c1c] flex items-center gap-2">
                   <FolderDot className="w-4 h-4 text-slate-400" /> Historical Data Archive
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
             </div>
             <Button
                icon={LucideHistory}
                label="Export CSV Data"
                onClick={exportAttendanceCsv}
                disabled={!selectedSession || attendance.length === 0}
                className="h-11 px-5 text-[13px] bg-[#1c1c1c] text-white rounded-[1rem] shrink-0 font-black shadow-[0_5px_20px_rgba(0,0,0,0.15)] hover:bg-black transition-colors"
             />
          </div>

          {selectedSession ? (
             <div className="flex-1 flex flex-col relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#fbfaf8] rounded-2xl p-5 border border-slate-100 shadow-inner">
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><ClipboardList className="w-3 h-3" /> Name</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c] truncate">{getSessionName(selectedSession)}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Clock className="w-3 h-3" /> Date</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatDate(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Activity className="w-3 h-3" /> Time</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatTime(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Users className="w-3 h-3" /> Records</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]"><span className="text-[#5c7c6d]">{attendance.length}</span> students</div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2.5 max-h-[300px] border border-slate-100 rounded-[1rem] p-2 bg-[#fcfcfa]">
                   {attendance.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center py-10 opacity-70">
                         <div className="text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                            <Ban className="w-6 h-6 mb-1" />
                            No attendance records found for this session.
                         </div>
                      </div>
                   ) : (
                      attendance.map((record, index) => {
                         const student = record.student || {}
                         const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || 'Student'
                         const status = record.status || 'pending'
                         const statusStyles = {
                            present: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60',
                            pending: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
                            absent: 'bg-rose-50/80 text-rose-800 border-rose-200/60',
                         }
                         return (
                            <div key={record.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[1rem] p-3.5 border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all gap-3 sm:gap-0 group">
                               <div className="flex items-center gap-3.5">
                                   <div className="w-9 h-9 rounded-full bg-[#f4f2ee] shadow-inner flex items-center justify-center text-[13px] font-black text-slate-500 border border-slate-200/80 group-hover:border-[#5c7c6d] group-hover:text-[#5c7c6d] transition-colors shrink-0">
                                      {getInitials(name)}
                                   </div>
                                   <div>
                                      <div className="text-[13px] font-bold text-[#1c1c1c]">{name}</div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                         <MousePointerClick className="w-3 h-3" /> {record.method || 'manual'}
                                      </div>
                                   </div>
                               </div>
                               <span className={"text-[10px] sm:self-center self-start font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm " + (statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>
                                  {status}
                               </span>
                            </div>
                         )
                      })
                   )}
                </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fbfaf8] rounded-[1.5rem] border border-slate-200/50 border-dashed text-center relative z-10 m-2 mt-0">
                <div className="w-16 h-16 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.03)] rounded-full flex items-center justify-center mb-5 border border-slate-100">
                   <MousePointerClick className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-[16px] font-black tracking-tight text-[#1c1c1c]">No Session Selected</h4>
                <p className="text-[13px] text-slate-500 font-medium max-w-[280px] mt-2.5 leading-relaxed">Click on a past session from the history panel to view its check-in records or to download a spreadsheet.</p>
             </div>
          )}
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

 = Get-Content 'C:\xampp\htdocs\Smart Attendance Monitoring\frontend\src\pages\instructor\InstructorDashboard.jsx' -Raw

 = '<Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 min-h-[350px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7] to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10 w-full border-b border-slate-100 pb-5">
               <div>
                  <h3 className="text-lg font-black tracking-tight text-[#1c1c1c] flex items-center gap-2">
                     <FolderDot className="w-4 h-4 text-slate-400" /> Historical Data Archive
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
               </div>
               <Button
                  icon={LucideHistory}
                  label="Export CSV Data"
                  onClick={exportAttendanceCsv}
                  disabled={!selectedSession || attendance.length === 0}
                  className="h-11 px-5 text-[13px] bg-[#1c1c1c] text-white rounded-[1rem] shrink-0 font-black shadow-[0_5px_20px_rgba(0,0,0,0.15)] hover:bg-black transition-colors"
               />
            </div>
  
            {selectedSession ? (
               <div className="flex-1 flex flex-col relative z-10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#fbfaf8] rounded-2xl p-5 border border-slate-100 shadow-inner">
                     <div>
                        <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><ClipboardList className="w-3 h-3" /> Name</div>
                        <div className="font-bold text-[13px] text-[#1c1c1c] truncate">{getSessionName(selectedSession)}</div>
                     </div>
                     <div>
                        <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Clock className="w-3 h-3" /> Date</div>
                        <div className="font-bold text-[13px] text-[#1c1c1c]">{formatDate(getSessionStart(selectedSession))}</div>
                     </div>
                     <div>
                        <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Activity className="w-3 h-3" /> Time</div>
                        <div className="font-bold text-[13px] text-[#1c1c1c]">{formatTime(getSessionStart(selectedSession))}</div>
                     </div>
                     <div>
                        <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Users className="w-3 h-3" /> Records</div>
                        <div className="font-bold text-[13px] text-[#1c1c1c]"><span className="text-[#5c7c6d]">{attendance.length}</span> students</div>
                     </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2.5 max-h-[300px] border border-slate-100 rounded-[1rem] p-2 bg-[#fcfcfa]">
                     {attendance.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center py-10 opacity-70">
                           <div className="text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                              <Ban className="w-6 h-6 mb-1" />
                              No attendance records found for this session.
                           </div>
                        </div>
                     ) : (
                        attendance.map((record, index) => {
                           const student = record.student || {}
                           const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || ''Student''
                           const status = record.status || ''pending''
                           const statusStyles = {
                              present: ''bg-emerald-50/80 text-emerald-800 border-emerald-200/60'',
                              pending: ''bg-amber-50/80 text-amber-800 border-amber-200/60'',
                              absent: ''bg-rose-50/80 text-rose-800 border-rose-200/60'',
                           }
                           return (
                              <div key={record.id || index} className="flex items-center justify-between p-3 rounded-[1rem] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                 <div className="flex items-center gap-3">
                                    <div className="w-[38px] h-[38px] rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                                       {getInitials(name)}
                                    </div>
                                    <div>
                                       <div className="font-bold text-[13px] text-[#1c1c1c]">{name}</div>
                                       <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                          <span className={"px-2.5 py-0.5 rounded-full border " + (statusStyles[status] || '')}>{status}</span>
                                          <span className="opacity-50 text-[8px]">•</span> <span>{record.method || ''manual''}</span>
                                       </div>
                                    </div>
                                 </div>
                                 {record.checkedInAt && (
                                    <div className="text-right">
                                       <span className="text-[11px] font-bold text-slate-400 border border-slate-100 bg-slate-50 px-2 py-1 rounded-md shadow-sm">
                                          {formatTime(record.checkedInAt)}
                                       </span>
                                    </div>
                                 )}
                              </div>
                           )
                        })
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex items-center justify-center h-full text-center py-20 opacity-70">
                  <div className="text-xs font-bold text-slate-400 flex flex-col items-center gap-3">
                     <FolderDot className="w-8 h-8 opacity-40 mb-1" />
                     Select a past session to view historical data
                  </div>
               </div>
            )}
          </Card>'

<Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-slate-200/60 min-h-[350px] max-h-[500px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7]/50 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10 w-full border-b border-slate-100 pb-4">
               <div>
                  <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                     <FolderDot className="w-[18px] h-[18px] text-[#5c7c6d]" /> Historical Data Archive
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
               </div>
               <Button
                  icon={DownloadCloud}
                  label="Export CSV"
                  onClick={exportAttendanceCsv}
                  disabled={!selectedSession || attendance.length === 0}
                  className="h-10 px-4 text-[12px] bg-[#1c1c1c] text-white rounded-xl shrink-0 font-black shadow-md hover:bg-black hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 space-x-2"
               />
            </div>
  
            {selectedSession ? (
               <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-slate-100 bg-[#fbfaf8] rounded-xl p-3 shrink-0 mb-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><ClipboardList className="w-3 h-3 text-[#5c7c6d]" /> Name</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight truncate">{getSessionName(selectedSession)}</div>
                     </div>
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-amber-500" /> Date</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight">{formatDate(getSessionStart(selectedSession))}</div>
                     </div>
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3 text-blue-500" /> Time</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight">{formatTime(getSessionStart(selectedSession))}</div>
                     </div>
                     <div className="bg-[#f4f7f6] border border-[#5c7c6d]/20 rounded-lg p-2.5 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="text-[9px] uppercase tracking-widest text-[#5c7c6d]/70 font-black mb-0.5">Records</div>
                        <div className="font-black text-[18px] text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{attendance.length} <span className="text-[10px] text-[#5c7c6d]/60 font-bold ml-0.5">students</span></div>
                     </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2 rounded-xl bg-white min-h-[0]">
                     {attendance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                           <div className="w-12 h-12 rounded-full bg-[#fcfcfa] border border-slate-200 border-dashed flex items-center justify-center mb-3">
                              <Ban className="w-5 h-5 text-slate-300" />
                           </div>
                           <div className="text-[13px] text-slate-400 font-bold">No attendance records found</div>
                        </div>
                     ) : (
                        attendance.map((record, index) => {
                           const student = record.student || {}
                           const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || "Student"
                           const status = record.status || "pending"
                           const statusStyles = {
                              present: "bg-emerald-50 border border-emerald-100/80 text-emerald-700",
                              pending: "bg-slate-50 border border-slate-200/80 text-slate-700",
                              absent: "bg-rose-50 border border-rose-100/80 text-rose-700",
                           }
                           const dotColor = {
                              present: "bg-emerald-500",
                              pending: "bg-slate-400",
                              absent: "bg-rose-500",
                           }
                           return (
                              <div key={record.id || index} className="flex items-center justify-between p-3 rounded-xl border border-slate-100/50 hover:bg-[#fbfaf8] hover:border-slate-200 transition-colors group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                       {getInitials(name)}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-bold text-[13px] text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">{name}</span>
                                       <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className={"px-2 py-0.5 text-[9px] uppercase tracking-widest font-black rounded-full flex items-center gap-1 shrink-0 " + (statusStyles[status])}>
                                             <span className={"w-[5px] h-[5px] rounded-full " + (dotColor[status])}></span>
                                             {status}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                                       {formatTime(record.checkedInAt || record.created_at)}
                                    </span>
                                 </div>
                              </div>
                           )
                        })
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
                  <div className="w-16 h-16 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                     <FolderDot className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="text-[15px] font-black text-slate-400">Select a past session</div>
                  <p className="text-[12px] text-slate-400/80 mt-1.5 font-medium max-w-[220px]">Click any session from the history list to analyze its records.</p>
               </div>
            )} = '<Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 bg-white min-h-[350px] max-h-[500px] flex flex-col hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7]/50 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4 relative z-10 w-full border-b border-slate-100 pb-4">
               <div>
                  <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                     <FolderDot className="w-[18px] h-[18px] text-[#5c7c6d]" /> Historical Data Archive
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
               </div>
               <Button
                  icon={LucideHistory}
                  label="Export CSV"
                  onClick={exportAttendanceCsv}
                  disabled={!selectedSession || attendance.length === 0}
                  className="h-10 px-4 text-[12px] bg-[#1c1c1c] text-white rounded-xl shrink-0 font-black shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-black hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 space-x-2"
               />
            </div>
  
            {selectedSession ? (
               <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-slate-100 bg-[#fbfaf8] rounded-xl p-3 shrink-0 mb-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><ClipboardList className="w-3 h-3 text-[#5c7c6d]" /> Name</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight truncate">{getSessionName(selectedSession)}</div>
                     </div>
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-500" /> Date</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight">{formatDate(getSessionStart(selectedSession))}</div>
                     </div>
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><Activity className="w-3 h-3 text-blue-500" /> Time</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight">{formatTime(getSessionStart(selectedSession))}</div>
                     </div>
                     <div className="bg-[#f4f7f6] border border-[#5c7c6d]/20 rounded-lg p-2.5 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="text-[9px] uppercase tracking-widest text-[#5c7c6d]/70 font-black mb-0.5">Records</div>
                        <div className="font-black text-[18px] text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{attendance.length} <span className="text-[10px] text-[#5c7c6d]/60 font-bold ml-0.5">students</span></div>
                     </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2 rounded-xl bg-white min-h-[0]">
                     {attendance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-center">
                           <div className="w-12 h-12 rounded-full bg-[#fcfcfa] border border-slate-200 border-dashed flex items-center justify-center mb-3">
                              <Ban className="w-5 h-5 text-slate-300" />
                           </div>
                           <div className="text-[13px] text-slate-400 font-bold">No attendance records</div>
                        </div>
                     ) : (
                        attendance.map((record, index) => {
                           const student = record.student || {}
                           const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || "Student"
                           const status = record.status || "pending"
                           const statusStyles = {
                              present: "bg-emerald-50 border border-emerald-100/80 text-emerald-700",
                              pending: "bg-slate-50 border border-slate-200/80 text-slate-700",
                              absent: "bg-rose-50 border border-rose-100/80 text-rose-700",
                           }
                           const dotColor = {
                              present: "bg-emerald-500",
                              pending: "bg-slate-400",
                              absent: "bg-rose-500",
                           }
                           return (
                              <div key={record.id || index} className="flex items-center justify-between p-3 rounded-xl border border-slate-100/50 hover:bg-[#fbfaf8] hover:border-slate-200 transition-colors group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                       {getInitials(name)}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-bold text-[13px] text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">{name}</span>
                                       <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className={"px-2 py-0.5 text-[9px] uppercase tracking-widest font-black rounded-full flex items-center gap-1 shrink-0 " + (statusStyles[status])}>
                                             <span className={"w-[5px] h-[5px] rounded-full " + (dotColor[status])}></span>
                                             {status}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                                       {formatTime(record.checkedInAt || record.created_at)}
                                    </span>
                                 </div>
                              </div>
                           )
                        })
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center flex-1 min-h-[250px] text-center opacity-70">
                  <div className="w-16 h-16 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                     <FolderDot className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="text-[15px] font-black text-slate-400">Select a past session</div>
                  <p className="text-[12px] text-slate-400/80 mt-1.5 font-medium max-w-[220px]">Click any session from the history list to analyze its records.</p>
               </div>
            )}
          </Card>'

import { useMemo, useState, useEffect } from 'react'
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
            'rounded-3xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] ' +
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
  
  // Data State
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
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
      () => closedSessions.find((session) => session.id === selectedSessionId) || null,
      [closedSessions, selectedSessionId]
   )
   const presentCount = attendance.filter((record) => record.status === 'present').length
   const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0
   const activePresentCount = activeAttendance.filter((record) => record.status === 'present').length
   const activePendingCount = activeAttendance.filter((record) => record.status === 'pending').length
   const activeAbsentCount = activeAttendance.filter((record) => record.status === 'absent').length
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

  const loadSessions = () => {
    if (!selectedClassId) return
    return withFeedback(async () => {
         const data = await apiRequest("/instructor/classes/" + selectedClassId + "/sessions")
      setSessions(data.sessions)
      setAttendance([])
      setSelectedSessionId(null)
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
         loadSessions()
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
    setSelectedSessionId(sessionId)
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
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     Total Classes
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.totalClasses}
                     <Activity className="w-6 h-6 text-[#5c7c6d]" />
                  </div>
               </Card>
               
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <Users className="w-3.5 h-3.5" /> Total Students
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {classes.reduce((acc) => acc + 10, 0)}
                     <svg className="w-16 h-8 text-blue-100" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                  </div>
               </Card>

               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <BadgeDollarSign className="w-3.5 h-3.5" /> Attendance
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.attendanceRate}%
                  </div>
               </Card>
            </div>

            {/* Right tall green card */}
            <Card className="col-span-1 lg:row-span-2 xl:col-start-4 xl:row-start-1 bg-[#5c7c6d] border-[#4a6357] text-white p-6 shadow-sm rounded-[1.25rem] flex flex-col justify-between min-h-[300px]">
               <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Live Sessions</div>
               <div className="text-6xl font-black mt-auto flex justify-between items-end pb-4">
                  {activeSession ? 1 : 0}
                  <svg className="w-16 h-8 text-emerald-300 opacity-50" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
               </div>
            </Card>

            {/* Active Classes Area */}
            <Card className="col-span-1 lg:col-span-2 p-7 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative overflow-hidden h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <h3 className="text-base font-bold text-[#1c1c1c]">Active Classes</h3>
                     <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> On Track</span>
                  </div>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="bg-[#1c1c1c] text-white h-9 px-5 shadow-sm text-xs rounded-full" />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {classes.length === 0 ? (
                     <div className="flex items-center justify-center p-4 bg-[#f8f7f5]/40 rounded-xl">
                        <p className="text-sm text-slate-500 font-semibold">No classes yet. Create one above.</p>
                     </div>
                  ) : (
                     classes.map(cls => (
                        <div key={cls.id} onClick={() => setSelectedClassId(cls.id)} className="cursor-pointer border border-slate-100 bg-[#f8f7f5] rounded-[1rem] p-4 hover:shadow-md hover:border-slate-200 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-bold text-[#1c1c1c] text-[15px] group-hover:text-[#5c7c6d] transition-colors">{cls.name}</h4>
                              <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5 flex shrink-0 bg-white shadow-sm p-1 rounded-full items-center justify-center text-slate-400" /></button>
                           </div>
                           <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-6">
                              <div>
                                 <div className="mb-1">Class ID</div>
                                 <div className="text-xs text-[#1c1c1c]">{cls.id}</div>
                              </div>
                              <div className="text-right">
                                 <div className="mb-1 text-slate-400">Join Code</div>
                                 <div className="text-xs text-rose-500">{cls.joinCode}</div>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </Card>

            {/* Profile Info Area */}
            <Card className="col-span-1 p-6 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative flex flex-col items-center justify-center text-center h-[300px]">
               <div className="w-16 h-16 rounded-full bg-[#f4f2ee] shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group">
                  <Users className="w-7 h-7 text-slate-400" />
               </div>
               <div className="font-bold text-[#1c1c1c] text-[15px]">{user?.fullName || 'Sample Instructor'}</div>
               <div className="text-[10px] font-extrabold tracking-widest text-slate-400 mt-1 mb-6 uppercase">{user?.email || 'INSTRUCTOR@DEMO.LOCAL'}</div>
               
               <div className="flex w-full justify-between items-center gap-2 p-3 bg-[#ebeae7] rounded-[1rem] shadow-inner border border-slate-200/50">
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Classes</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalClasses}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Students</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{classes.reduce((acc) => acc + 10, 0)}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Sessions</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalSessions}</div>
                  </div>
               </div>
            </Card>
         </div>

         {/* Dashboard Bottom Row */}
         <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <Card className="flex-[0_1_auto] w-full lg:w-[600px] p-6 flex items-center justify-between gap-4 bg-white overflow-hidden relative shadow-sm border border-slate-200/60 rounded-[1.25rem] hover:shadow-md transition-shadow h-[180px]">
               <div className="flex flex-col h-full max-w-[320px] z-10 justify-center">
                  <h3 className="text-base font-bold text-[#1c1c1c]">Available Class Options</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">Create new modules and securely invite students into your class portal.</p>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="mt-5 bg-[#5c7c6d] hover:bg-[#4a6357] text-white w-fit min-h-0 h-9 px-6 font-bold text-[11px] rounded-full" />
               </div>
               <div className="absolute right-0 top-0 w-64 h-full bg-[#f4f4f5]/50 -skew-x-12 translate-x-8 z-0"></div>
               <div className="relative w-28 h-32 transform scale-110 z-10 translate-x-2 hidden md:block">
                  <div className="absolute w-full h-full bg-[#5C7C6D]/10 rounded-xl rotate-6 translate-x-1.5 translate-y-1.5"></div>
                  <div className="absolute w-full h-full bg-[#5C7C6D] rounded-lg flex items-center justify-center shadow-lg shadow-[#5C7C6D]/20">
                     <Book className="w-10 h-10 text-white/90" />
                  </div>
               </div>
            </Card>
            <Card className="w-full lg:w-[320px] p-6 flex flex-col justify-center border border-slate-200/60 shadow-sm rounded-[1.25rem] bg-white hover:shadow-md transition-shadow h-[180px]">
               <h3 className="text-sm font-bold text-[#1c1c1c] mb-4">Recent Sessions</h3>
               <div className="space-y-4">
                  {classes.flatMap(c => c.sessions || []).slice(0, 3).map((session, i) => (
                     <div key={session.id || i} className="flex justify-between items-center px-1">
                        <div className="relative pl-3 border-l-2 border-[#5C7C6D]">
                           <div className="text-[12px] font-bold text-[#1c1c1c] tracking-tight">{new Date(session.startTime).toLocaleDateString()}</div>
                           <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-[11px] font-bold text-[#5C7C6D] bg-[#E8EFEA] px-2.5 py-0.5 rounded-full shadow-sm ring-1 ring-white">
                           +{session.attendances?.length || 0}
                        </div>
                     </div>
                  ))}
                  {classes.length === 0 && (
                     <div className="flex flex-col items-center justify-center p-3">
                        <div className="w-10 h-10 rounded-full bg-[#f4f4f5] flex items-center justify-center mb-2"><Clock className="w-4 h-4 text-slate-300" /></div>
                        <div className="text-[11px] font-bold text-slate-400">No sessions</div>
                     </div>
                  )}
               </div>
            </Card>
            <Card className="flex-1 w-full lg:max-w-[230px] p-6 flex flex-col items-center text-center justify-center bg-white shadow-sm rounded-[1.25rem] border border-slate-200/60 hover:shadow-md transition-shadow h-[180px]">
               <div className="w-12 h-12 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group cursor-pointer hover:border-[#5c7c6d] transition-colors">
                  <Fingerprint className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
               </div>
               <h3 className="text-[13px] font-bold text-[#1c1c1c]">Security Check</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-relaxed">Update devices</p>
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
    <div className="min-h-[100vh] bg-transparent w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 transition-colors">
      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row items-start lg:items-center justify-between mb-10 gap-4 pt-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedClassId(null)}
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

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <Users className="w-3.5 h-3.5" /> Enrolled Students
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {students.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <ClipboardList className="w-3.5 h-3.5" /> Total Sessions
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {sessions.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Book className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <BarChart3 className="w-3.5 h-3.5" /> Avg Attendance
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {attendanceRate}%
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Section: Live Tracking & QR */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
        
        {/* Live Attendance Panel - Elegant Theme */}
        <Card className={"col-span-1 p-8 rounded-[1.5rem] border relative flex flex-col overflow-hidden transition-all duration-500 " + (activeSession ? "bg-white border-[#5c7c6d]/20 shadow-[0_15px_60px_rgba(92,124,109,0.08)] min-h-[440px]" : "bg-[#fcfcfa] border-slate-200/50 shadow-sm min-h-[350px]")}>
          {activeSession && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-[#5c7c6d] to-emerald-400 opacity-50"></div>}
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className={"text-[20px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Live Tracking</h3>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Real-time Class Roster</p>
            </div>
            <button onClick={loadSessions} className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors shadow-sm focus:outline-none">
              <Activity className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-[#ffffff] rounded-[1.25rem] border border-slate-200/60 p-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.03)] mb-8 relative z-10 w-full overflow-hidden">
            <div className="flex-1 text-center py-3 relative group hover:bg-[#f4f7f6]/60 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-[#5c7c6d] font-black mb-1.5 opacity-90"><CheckCircle className="w-3.5 h-3.5" /> Present</div>
               <div className="text-[34px] md:text-[40px] font-black text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{activePresentCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 relative group hover:bg-amber-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-amber-600 font-black mb-1.5 opacity-90"><Clock className="w-3.5 h-3.5" /> Pending</div>
               <div className="text-[34px] md:text-[40px] font-black text-amber-500 leading-none tracking-tighter drop-shadow-sm">{activePendingCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 group hover:bg-rose-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-rose-600 font-black mb-1.5 opacity-90"><Ban className="w-3.5 h-3.5" /> Absent</div>
               <div className="text-[34px] md:text-[40px] font-black text-rose-500 leading-none tracking-tighter drop-shadow-sm">{activeAbsentCount}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-3.5 relative z-10 w-full pl-1 pb-2">
            {liveAttendance.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 h-full text-center bg-[#fdfcfb] rounded-[1.5rem] border border-dashed border-slate-200 mx-1">
                  <div className={"w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border " + (activeSession ? "bg-[#f4f7f6] border-[#5c7c6d]/10 animate-pulse" : "bg-[#f8f7f5] border-slate-100")}>
                    <Users className={"w-10 h-10 " + (activeSession ? "text-[#5c7c6d]/40" : "text-slate-300")} />
                  </div>
                  <div className={"text-[17px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Monitoring Active Room...</div>
                  <div className="text-[13px] text-slate-400 mt-2 font-medium max-w-[250px] leading-relaxed">Students will appear right here as soon as they scan the session code.</div>
               </div>
            ) : (
               liveAttendance.map((record, index) => {
                  const status = record.status || "pending"
                  const statusStyles = {
                     present: "bg-white border-emerald-100/60 shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:shadow-[0_12px_30px_rgba(16,185,129,0.12)]",
                     pending: "bg-white border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]",
                     absent: "bg-white border-rose-100/60 shadow-[0_8px_20px_rgba(244,63,94,0.06)] hover:shadow-[0_12px_30px_rgba(244,63,94,0.12)]",
                  }
                  const statusDot = { present: "bg-emerald-500", pending: "bg-amber-400", absent: "bg-rose-500" }
                  const statusBadge = { present: "text-emerald-700 bg-emerald-50 border border-emerald-100", pending: "text-amber-700 bg-amber-50 border border-amber-100", absent: "text-rose-700 bg-rose-50 border border-rose-100" }
                  
                  return (
                     <div key={record.id || index} className={"flex items-center justify-between rounded-[1.25rem] p-4 border transition-all duration-300 transform hover:-translate-y-1 group " + (statusStyles[status] || "bg-white border-slate-100")} style={{animationDelay: (index * 50) + "ms"}}>
                        <div className="flex justify-start items-center gap-4">
                           <div className="relative">
                              <div className="w-[50px] h-[50px] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center text-[16px] font-black text-slate-600 shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-300 group-hover:border-[#5c7c6d]/30 group-hover:text-[#5c7c6d]">
                                 {getInitials(record.studentName || record.studentEmail || "Student")}
                              </div>
                              <span className={"absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20 " + statusDot[status]}></span>
                           </div>
                           <div className="flex flex-col justify-center">
                              <div className="text-[15px] font-black text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">
                                 {record.studentName || record.studentEmail || "Student"}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mt-1.5 flex items-center gap-2 w-full">
                                 <span className={"px-2 py-0.5 rounded-full shadow-sm " + (statusBadge[status])}>{status}</span>
                                 <span className="opacity-50 font-black">•</span>
                                 <span className="flex items-center gap-1 opacity-75 font-semibold tracking-wide"><MousePointerClick className="w-3 h-3" /> {record.method || "manual"}</span>
                              </div>
                           </div>
                        </div>
                        {record.checkedInAt && (
                           <div className="text-right flex flex-col justify-center items-end mr-2">
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/40 font-black mb-1 truncate">Rec. Time</div>
                              <div className="text-[13px] font-black text-[#1c1c1c] bg-[#f4f7f6] px-3 py-1 rounded-lg border border-[#5c7c6d]/10 shadow-inner group-hover:bg-[#5c7c6d] group-hover:text-white transition-colors">{formatTime(record.checkedInAt)}</div>
                           </div>
                        )}
                     </div>
                  )
               })
            )}
          </div>
</Card>

        {/* QR Code / Session Status Card - More compact and perfectly themed */}
        <Card className={"col-span-1 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[1.5rem] flex flex-col transition-all relative overflow-hidden ring-1 ring-white/10 group " + (activeSession ? "bg-gradient-to-tr from-[#2d3a33] to-[#5c7c6d] text-white" : "bg-gradient-to-tr from-gray-900 to-[#1c1c1c] text-white")} noPadding>
          {activeSession && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)] pointer-events-none"></div>}
          <div className="p-7 h-full flex flex-col justify-center relative z-10">
             {activeSession ? (
                <>
                   <div className="absolute top-4 left-0 w-full flex justify-center">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">Transmitting Live</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-center justify-center w-full mt-10 mb-4">
                      {getSessionCode(activeSession) ? (
                         <div className="bg-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform hover:scale-[1.03] transition-all duration-300 cursor-pointer relative group" onClick={() => handleCopyCode(getSessionCode(activeSession))}>
                            <QRCodeSVG value={getSessionCode(activeSession)} size={160} bgColor="transparent" fgColor="#1c1c1c" />
                         </div>
                      ) : (
                         <div className="w-[160px] h-[160px] flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10"><Smartphone className="w-12 h-12 text-white/50" /></div>
                      )}
                   </div>
                   <div className="text-center mt-auto">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60 mb-2">Class Join Code</div>
                      <div className="text-[38px] font-black tracking-widest text-white drop-shadow-md leading-none">{getSessionCode(activeSession) || '--'}</div>
                   </div>
                </>
             ) : (
                <div className="flex flex-col h-full justify-center">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400/80 mb-6 w-full">
                      <span>Quick Actions</span>
                      <Radio className="w-4 h-4 opacity-50" />
                   </div>
                   <div className="flex flex-col items-center justify-center flex-1 my-4">
                      <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] border border-white/10 flex items-center justify-center mb-6 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-500">
                         <Radio className="w-8 h-8 text-white/80" />
                      </div>
                      <h3 className="text-[18px] font-black text-white text-center leading-tight">Start Tracking</h3>
                      <p className="text-[12px] text-slate-400 text-center font-medium mt-3 max-w-[200px] leading-relaxed">Launch a session to reveal the QR code for student check-ins.</p>
                   </div>
                   <Button
                      icon={Radio}
                      label="Launch Attendance"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="w-full h-12 bg-white text-[#1c1c1c] hover:bg-slate-200 mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-[13px] font-black rounded-[1rem]"
                   />
                </div>
             )}
          </div>
        </Card>
      </div>

      {/* Lower area - Session History and Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[360px_1fr] gap-6">
        
        {/* Past Sessions List */}
        <Card className="col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 bg-white min-h-[350px] max-h-[500px] flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
              <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                <LucideHistory className="w-[18px] h-[18px] text-slate-400" /> Past Sessions
              </h3>
              <span className="text-[10px] uppercase font-black text-[#5c7c6d] bg-[#f4f7f6] border border-[#5c7c6d]/20 px-2.5 py-1 rounded-lg tracking-widest">{closedSessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2.5 -mr-1 space-y-2.5">
               {closedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                     <div className="w-14 h-14 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        <Clock className="w-6 h-6 text-slate-300" />
                     </div>
                     <div className="text-[14px] font-black text-slate-400">No session history yet</div>
                     <p className="text-[11px] text-slate-400/80 mt-1.5 font-medium max-w-[200px]">Sessions you end will appear here.</p>
                  </div>
               ) : (
                  closedSessions.map((session) => {
                     const isActive = selectedSessionId === session.id
                     return (
                        <button
                           key={session.id}
                           type="button"
                           onClick={() => loadAttendance(session.id)}
                           className={
                              "w-full text-left rounded-xl p-3 border transition-all duration-300 group flex items-center justify-between " +
                              (isActive ? "border-[#5c7c6d]/40 bg-[#f4f7f6] shadow-[0_4px_15px_rgba(92,124,109,0.1)] -translate-y-0.5" : "border-slate-100/80 hover:bg-[#fbfaf8] hover:border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]")
                           }
                        >
                           <div className="flex flex-col gap-1 w-full overflow-hidden">
                              <div className={"font-bold text-[13px] truncate pr-2 tracking-tight " + (isActive ? "text-[#5c7c6d]" : "text-[#1c1c1c] group-hover:text-slate-700 transition-colors")}>{getSessionName(session)}</div>
                              <div className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-60">
                                 <Clock className="w-[10px] h-[10px] text-slate-400" /> {formatDate(getSessionStart(session))}
                              </div>
                           </div>
                           <div className="flex flex-col items-center justify-center shrink-0 pl-3">
                              <div className={"text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-colors " + (isActive ? "bg-[#5c7c6d] text-white border-[#5c7c6d]" : "bg-white border-slate-200 text-slate-500 group-hover:border-slate-300")}>
                                 {session.attendanceCount || session.attendances?.length || 0}
                              </div>
                           </div>
                        </button>
                     )
                  })
               )}
            </div>
          </Card>

        {/* Selected Session Details Data Table */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 min-h-[350px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7] to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10 w-full border-b border-slate-100 pb-5">
             <div>
                <h3 className="text-lg font-black tracking-tight text-[#1c1c1c] flex items-center gap-2">
                   <FolderDot className="w-4 h-4 text-slate-400" /> Historical Data Archive
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
             </div>
             <Button
                icon={LucideHistory}
                label="Export CSV Data"
                onClick={exportAttendanceCsv}
                disabled={!selectedSession || attendance.length === 0}
                className="h-11 px-5 text-[13px] bg-[#1c1c1c] text-white rounded-[1rem] shrink-0 font-black shadow-[0_5px_20px_rgba(0,0,0,0.15)] hover:bg-black transition-colors"
             />
          </div>

          {selectedSession ? (
             <div className="flex-1 flex flex-col relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#fbfaf8] rounded-2xl p-5 border border-slate-100 shadow-inner">
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><ClipboardList className="w-3 h-3" /> Name</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c] truncate">{getSessionName(selectedSession)}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Clock className="w-3 h-3" /> Date</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatDate(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Activity className="w-3 h-3" /> Time</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatTime(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Users className="w-3 h-3" /> Records</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]"><span className="text-[#5c7c6d]">{attendance.length}</span> students</div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2.5 max-h-[300px] border border-slate-100 rounded-[1rem] p-2 bg-[#fcfcfa]">
                   {attendance.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center py-10 opacity-70">
                         <div className="text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                            <Ban className="w-6 h-6 mb-1" />
                            No attendance records found for this session.
                         </div>
                      </div>
                   ) : (
                      attendance.map((record, index) => {
                         const student = record.student || {}
                         const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || 'Student'
                         const status = record.status || 'pending'
                         const statusStyles = {
                            present: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60',
                            pending: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
                            absent: 'bg-rose-50/80 text-rose-800 border-rose-200/60',
                         }
                         return (
                            <div key={record.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[1rem] p-3.5 border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all gap-3 sm:gap-0 group">
                               <div className="flex items-center gap-3.5">
                                   <div className="w-9 h-9 rounded-full bg-[#f4f2ee] shadow-inner flex items-center justify-center text-[13px] font-black text-slate-500 border border-slate-200/80 group-hover:border-[#5c7c6d] group-hover:text-[#5c7c6d] transition-colors shrink-0">
                                      {getInitials(name)}
                                   </div>
                                   <div>
                                      <div className="text-[13px] font-bold text-[#1c1c1c]">{name}</div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                         <MousePointerClick className="w-3 h-3" /> {record.method || 'manual'}
                                      </div>
                                   </div>
                               </div>
                               <span className={"text-[10px] sm:self-center self-start font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm " + (statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>
                                  {status}
                               </span>
                            </div>
                         )
                      })
                   )}
                </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fbfaf8] rounded-[1.5rem] border border-slate-200/50 border-dashed text-center relative z-10 m-2 mt-0">
                <div className="w-16 h-16 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.03)] rounded-full flex items-center justify-center mb-5 border border-slate-100">
                   <MousePointerClick className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-[16px] font-black tracking-tight text-[#1c1c1c]">No Session Selected</h4>
                <p className="text-[13px] text-slate-500 font-medium max-w-[280px] mt-2.5 leading-relaxed">Click on a past session from the history panel to view its check-in records or to download a spreadsheet.</p>
             </div>
          )}
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

 = import { useMemo, useState, useEffect } from 'react'
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
            'rounded-3xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] ' +
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
  
  // Data State
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
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
      () => closedSessions.find((session) => session.id === selectedSessionId) || null,
      [closedSessions, selectedSessionId]
   )
   const presentCount = attendance.filter((record) => record.status === 'present').length
   const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0
   const activePresentCount = activeAttendance.filter((record) => record.status === 'present').length
   const activePendingCount = activeAttendance.filter((record) => record.status === 'pending').length
   const activeAbsentCount = activeAttendance.filter((record) => record.status === 'absent').length
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

  const loadSessions = () => {
    if (!selectedClassId) return
    return withFeedback(async () => {
         const data = await apiRequest("/instructor/classes/" + selectedClassId + "/sessions")
      setSessions(data.sessions)
      setAttendance([])
      setSelectedSessionId(null)
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
         loadSessions()
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
    setSelectedSessionId(sessionId)
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
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     Total Classes
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.totalClasses}
                     <Activity className="w-6 h-6 text-[#5c7c6d]" />
                  </div>
               </Card>
               
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <Users className="w-3.5 h-3.5" /> Total Students
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {classes.reduce((acc) => acc + 10, 0)}
                     <svg className="w-16 h-8 text-blue-100" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                  </div>
               </Card>

               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <BadgeDollarSign className="w-3.5 h-3.5" /> Attendance
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.attendanceRate}%
                  </div>
               </Card>
            </div>

            {/* Right tall green card */}
            <Card className="col-span-1 lg:row-span-2 xl:col-start-4 xl:row-start-1 bg-[#5c7c6d] border-[#4a6357] text-white p-6 shadow-sm rounded-[1.25rem] flex flex-col justify-between min-h-[300px]">
               <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Live Sessions</div>
               <div className="text-6xl font-black mt-auto flex justify-between items-end pb-4">
                  {activeSession ? 1 : 0}
                  <svg className="w-16 h-8 text-emerald-300 opacity-50" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
               </div>
            </Card>

            {/* Active Classes Area */}
            <Card className="col-span-1 lg:col-span-2 p-7 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative overflow-hidden h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <h3 className="text-base font-bold text-[#1c1c1c]">Active Classes</h3>
                     <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> On Track</span>
                  </div>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="bg-[#1c1c1c] text-white h-9 px-5 shadow-sm text-xs rounded-full" />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {classes.length === 0 ? (
                     <div className="flex items-center justify-center p-4 bg-[#f8f7f5]/40 rounded-xl">
                        <p className="text-sm text-slate-500 font-semibold">No classes yet. Create one above.</p>
                     </div>
                  ) : (
                     classes.map(cls => (
                        <div key={cls.id} onClick={() => setSelectedClassId(cls.id)} className="cursor-pointer border border-slate-100 bg-[#f8f7f5] rounded-[1rem] p-4 hover:shadow-md hover:border-slate-200 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-bold text-[#1c1c1c] text-[15px] group-hover:text-[#5c7c6d] transition-colors">{cls.name}</h4>
                              <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5 flex shrink-0 bg-white shadow-sm p-1 rounded-full items-center justify-center text-slate-400" /></button>
                           </div>
                           <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-6">
                              <div>
                                 <div className="mb-1">Class ID</div>
                                 <div className="text-xs text-[#1c1c1c]">{cls.id}</div>
                              </div>
                              <div className="text-right">
                                 <div className="mb-1 text-slate-400">Join Code</div>
                                 <div className="text-xs text-rose-500">{cls.joinCode}</div>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </Card>

            {/* Profile Info Area */}
            <Card className="col-span-1 p-6 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative flex flex-col items-center justify-center text-center h-[300px]">
               <div className="w-16 h-16 rounded-full bg-[#f4f2ee] shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group">
                  <Users className="w-7 h-7 text-slate-400" />
               </div>
               <div className="font-bold text-[#1c1c1c] text-[15px]">{user?.fullName || 'Sample Instructor'}</div>
               <div className="text-[10px] font-extrabold tracking-widest text-slate-400 mt-1 mb-6 uppercase">{user?.email || 'INSTRUCTOR@DEMO.LOCAL'}</div>
               
               <div className="flex w-full justify-between items-center gap-2 p-3 bg-[#ebeae7] rounded-[1rem] shadow-inner border border-slate-200/50">
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Classes</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalClasses}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Students</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{classes.reduce((acc) => acc + 10, 0)}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Sessions</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalSessions}</div>
                  </div>
               </div>
            </Card>
         </div>

         {/* Dashboard Bottom Row */}
         <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <Card className="flex-[0_1_auto] w-full lg:w-[600px] p-6 flex items-center justify-between gap-4 bg-white overflow-hidden relative shadow-sm border border-slate-200/60 rounded-[1.25rem] hover:shadow-md transition-shadow h-[180px]">
               <div className="flex flex-col h-full max-w-[320px] z-10 justify-center">
                  <h3 className="text-base font-bold text-[#1c1c1c]">Available Class Options</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">Create new modules and securely invite students into your class portal.</p>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="mt-5 bg-[#5c7c6d] hover:bg-[#4a6357] text-white w-fit min-h-0 h-9 px-6 font-bold text-[11px] rounded-full" />
               </div>
               <div className="absolute right-0 top-0 w-64 h-full bg-[#f4f4f5]/50 -skew-x-12 translate-x-8 z-0"></div>
               <div className="relative w-28 h-32 transform scale-110 z-10 translate-x-2 hidden md:block">
                  <div className="absolute w-full h-full bg-[#5C7C6D]/10 rounded-xl rotate-6 translate-x-1.5 translate-y-1.5"></div>
                  <div className="absolute w-full h-full bg-[#5C7C6D] rounded-lg flex items-center justify-center shadow-lg shadow-[#5C7C6D]/20">
                     <Book className="w-10 h-10 text-white/90" />
                  </div>
               </div>
            </Card>
            <Card className="w-full lg:w-[320px] p-6 flex flex-col justify-center border border-slate-200/60 shadow-sm rounded-[1.25rem] bg-white hover:shadow-md transition-shadow h-[180px]">
               <h3 className="text-sm font-bold text-[#1c1c1c] mb-4">Recent Sessions</h3>
               <div className="space-y-4">
                  {classes.flatMap(c => c.sessions || []).slice(0, 3).map((session, i) => (
                     <div key={session.id || i} className="flex justify-between items-center px-1">
                        <div className="relative pl-3 border-l-2 border-[#5C7C6D]">
                           <div className="text-[12px] font-bold text-[#1c1c1c] tracking-tight">{new Date(session.startTime).toLocaleDateString()}</div>
                           <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-[11px] font-bold text-[#5C7C6D] bg-[#E8EFEA] px-2.5 py-0.5 rounded-full shadow-sm ring-1 ring-white">
                           +{session.attendances?.length || 0}
                        </div>
                     </div>
                  ))}
                  {classes.length === 0 && (
                     <div className="flex flex-col items-center justify-center p-3">
                        <div className="w-10 h-10 rounded-full bg-[#f4f4f5] flex items-center justify-center mb-2"><Clock className="w-4 h-4 text-slate-300" /></div>
                        <div className="text-[11px] font-bold text-slate-400">No sessions</div>
                     </div>
                  )}
               </div>
            </Card>
            <Card className="flex-1 w-full lg:max-w-[230px] p-6 flex flex-col items-center text-center justify-center bg-white shadow-sm rounded-[1.25rem] border border-slate-200/60 hover:shadow-md transition-shadow h-[180px]">
               <div className="w-12 h-12 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group cursor-pointer hover:border-[#5c7c6d] transition-colors">
                  <Fingerprint className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
               </div>
               <h3 className="text-[13px] font-bold text-[#1c1c1c]">Security Check</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-relaxed">Update devices</p>
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
    <div className="min-h-[100vh] bg-transparent w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 transition-colors">
      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row items-start lg:items-center justify-between mb-10 gap-4 pt-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedClassId(null)}
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

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <Users className="w-3.5 h-3.5" /> Enrolled Students
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {students.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <ClipboardList className="w-3.5 h-3.5" /> Total Sessions
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {sessions.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Book className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <BarChart3 className="w-3.5 h-3.5" /> Avg Attendance
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {attendanceRate}%
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Section: Live Tracking & QR */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
        
        {/* Live Attendance Panel - Elegant Theme */}
        <Card className={"col-span-1 p-8 rounded-[1.5rem] border relative flex flex-col overflow-hidden transition-all duration-500 " + (activeSession ? "bg-white border-[#5c7c6d]/20 shadow-[0_15px_60px_rgba(92,124,109,0.08)] min-h-[440px]" : "bg-[#fcfcfa] border-slate-200/50 shadow-sm min-h-[350px]")}>
          {activeSession && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-[#5c7c6d] to-emerald-400 opacity-50"></div>}
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className={"text-[20px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Live Tracking</h3>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Real-time Class Roster</p>
            </div>
            <button onClick={loadSessions} className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors shadow-sm focus:outline-none">
              <Activity className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-[#ffffff] rounded-[1.25rem] border border-slate-200/60 p-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.03)] mb-8 relative z-10 w-full overflow-hidden">
            <div className="flex-1 text-center py-3 relative group hover:bg-[#f4f7f6]/60 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-[#5c7c6d] font-black mb-1.5 opacity-90"><CheckCircle className="w-3.5 h-3.5" /> Present</div>
               <div className="text-[34px] md:text-[40px] font-black text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{activePresentCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 relative group hover:bg-amber-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-amber-600 font-black mb-1.5 opacity-90"><Clock className="w-3.5 h-3.5" /> Pending</div>
               <div className="text-[34px] md:text-[40px] font-black text-amber-500 leading-none tracking-tighter drop-shadow-sm">{activePendingCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 group hover:bg-rose-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-rose-600 font-black mb-1.5 opacity-90"><Ban className="w-3.5 h-3.5" /> Absent</div>
               <div className="text-[34px] md:text-[40px] font-black text-rose-500 leading-none tracking-tighter drop-shadow-sm">{activeAbsentCount}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-3.5 relative z-10 w-full pl-1 pb-2">
            {liveAttendance.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 h-full text-center bg-[#fdfcfb] rounded-[1.5rem] border border-dashed border-slate-200 mx-1">
                  <div className={"w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border " + (activeSession ? "bg-[#f4f7f6] border-[#5c7c6d]/10 animate-pulse" : "bg-[#f8f7f5] border-slate-100")}>
                    <Users className={"w-10 h-10 " + (activeSession ? "text-[#5c7c6d]/40" : "text-slate-300")} />
                  </div>
                  <div className={"text-[17px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Monitoring Active Room...</div>
                  <div className="text-[13px] text-slate-400 mt-2 font-medium max-w-[250px] leading-relaxed">Students will appear right here as soon as they scan the session code.</div>
               </div>
            ) : (
               liveAttendance.map((record, index) => {
                  const status = record.status || "pending"
                  const statusStyles = {
                     present: "bg-white border-emerald-100/60 shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:shadow-[0_12px_30px_rgba(16,185,129,0.12)]",
                     pending: "bg-white border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]",
                     absent: "bg-white border-rose-100/60 shadow-[0_8px_20px_rgba(244,63,94,0.06)] hover:shadow-[0_12px_30px_rgba(244,63,94,0.12)]",
                  }
                  const statusDot = { present: "bg-emerald-500", pending: "bg-amber-400", absent: "bg-rose-500" }
                  const statusBadge = { present: "text-emerald-700 bg-emerald-50 border border-emerald-100", pending: "text-amber-700 bg-amber-50 border border-amber-100", absent: "text-rose-700 bg-rose-50 border border-rose-100" }
                  
                  return (
                     <div key={record.id || index} className={"flex items-center justify-between rounded-[1.25rem] p-4 border transition-all duration-300 transform hover:-translate-y-1 group " + (statusStyles[status] || "bg-white border-slate-100")} style={{animationDelay: (index * 50) + "ms"}}>
                        <div className="flex justify-start items-center gap-4">
                           <div className="relative">
                              <div className="w-[50px] h-[50px] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center text-[16px] font-black text-slate-600 shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-300 group-hover:border-[#5c7c6d]/30 group-hover:text-[#5c7c6d]">
                                 {getInitials(record.studentName || record.studentEmail || "Student")}
                              </div>
                              <span className={"absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20 " + statusDot[status]}></span>
                           </div>
                           <div className="flex flex-col justify-center">
                              <div className="text-[15px] font-black text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">
                                 {record.studentName || record.studentEmail || "Student"}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mt-1.5 flex items-center gap-2 w-full">
                                 <span className={"px-2 py-0.5 rounded-full shadow-sm " + (statusBadge[status])}>{status}</span>
                                 <span className="opacity-50 font-black">•</span>
                                 <span className="flex items-center gap-1 opacity-75 font-semibold tracking-wide"><MousePointerClick className="w-3 h-3" /> {record.method || "manual"}</span>
                              </div>
                           </div>
                        </div>
                        {record.checkedInAt && (
                           <div className="text-right flex flex-col justify-center items-end mr-2">
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/40 font-black mb-1 truncate">Rec. Time</div>
                              <div className="text-[13px] font-black text-[#1c1c1c] bg-[#f4f7f6] px-3 py-1 rounded-lg border border-[#5c7c6d]/10 shadow-inner group-hover:bg-[#5c7c6d] group-hover:text-white transition-colors">{formatTime(record.checkedInAt)}</div>
                           </div>
                        )}
                     </div>
                  )
               })
            )}
          </div>
</Card>

        {/* QR Code / Session Status Card - More compact and perfectly themed */}
        <Card className={"col-span-1 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[1.5rem] flex flex-col transition-all relative overflow-hidden ring-1 ring-white/10 group " + (activeSession ? "bg-gradient-to-tr from-[#2d3a33] to-[#5c7c6d] text-white" : "bg-gradient-to-tr from-gray-900 to-[#1c1c1c] text-white")} noPadding>
          {activeSession && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)] pointer-events-none"></div>}
          <div className="p-7 h-full flex flex-col justify-center relative z-10">
             {activeSession ? (
                <>
                   <div className="absolute top-4 left-0 w-full flex justify-center">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">Transmitting Live</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-center justify-center w-full mt-10 mb-4">
                      {getSessionCode(activeSession) ? (
                         <div className="bg-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform hover:scale-[1.03] transition-all duration-300 cursor-pointer relative group" onClick={() => handleCopyCode(getSessionCode(activeSession))}>
                            <QRCodeSVG value={getSessionCode(activeSession)} size={160} bgColor="transparent" fgColor="#1c1c1c" />
                         </div>
                      ) : (
                         <div className="w-[160px] h-[160px] flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10"><Smartphone className="w-12 h-12 text-white/50" /></div>
                      )}
                   </div>
                   <div className="text-center mt-auto">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60 mb-2">Class Join Code</div>
                      <div className="text-[38px] font-black tracking-widest text-white drop-shadow-md leading-none">{getSessionCode(activeSession) || '--'}</div>
                   </div>
                </>
             ) : (
                <div className="flex flex-col h-full justify-center">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400/80 mb-6 w-full">
                      <span>Quick Actions</span>
                      <Radio className="w-4 h-4 opacity-50" />
                   </div>
                   <div className="flex flex-col items-center justify-center flex-1 my-4">
                      <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] border border-white/10 flex items-center justify-center mb-6 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-500">
                         <Radio className="w-8 h-8 text-white/80" />
                      </div>
                      <h3 className="text-[18px] font-black text-white text-center leading-tight">Start Tracking</h3>
                      <p className="text-[12px] text-slate-400 text-center font-medium mt-3 max-w-[200px] leading-relaxed">Launch a session to reveal the QR code for student check-ins.</p>
                   </div>
                   <Button
                      icon={Radio}
                      label="Launch Attendance"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="w-full h-12 bg-white text-[#1c1c1c] hover:bg-slate-200 mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-[13px] font-black rounded-[1rem]"
                   />
                </div>
             )}
          </div>
        </Card>
      </div>

      {/* Lower area - Session History and Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[360px_1fr] gap-6">
        
        {/* Past Sessions List */}
        <Card className="col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 bg-white min-h-[350px] max-h-[500px] flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
              <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                <LucideHistory className="w-[18px] h-[18px] text-slate-400" /> Past Sessions
              </h3>
              <span className="text-[10px] uppercase font-black text-[#5c7c6d] bg-[#f4f7f6] border border-[#5c7c6d]/20 px-2.5 py-1 rounded-lg tracking-widest">{closedSessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2.5 -mr-1 space-y-2.5">
               {closedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                     <div className="w-14 h-14 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        <Clock className="w-6 h-6 text-slate-300" />
                     </div>
                     <div className="text-[14px] font-black text-slate-400">No session history yet</div>
                     <p className="text-[11px] text-slate-400/80 mt-1.5 font-medium max-w-[200px]">Sessions you end will appear here.</p>
                  </div>
               ) : (
                  closedSessions.map((session) => {
                     const isActive = selectedSessionId === session.id
                     return (
                        <button
                           key={session.id}
                           type="button"
                           onClick={() => loadAttendance(session.id)}
                           className={
                              "w-full text-left rounded-xl p-3 border transition-all duration-300 group flex items-center justify-between " +
                              (isActive ? "border-[#5c7c6d]/40 bg-[#f4f7f6] shadow-[0_4px_15px_rgba(92,124,109,0.1)] -translate-y-0.5" : "border-slate-100/80 hover:bg-[#fbfaf8] hover:border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]")
                           }
                        >
                           <div className="flex flex-col gap-1 w-full overflow-hidden">
                              <div className={"font-bold text-[13px] truncate pr-2 tracking-tight " + (isActive ? "text-[#5c7c6d]" : "text-[#1c1c1c] group-hover:text-slate-700 transition-colors")}>{getSessionName(session)}</div>
                              <div className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-60">
                                 <Clock className="w-[10px] h-[10px] text-slate-400" /> {formatDate(getSessionStart(session))}
                              </div>
                           </div>
                           <div className="flex flex-col items-center justify-center shrink-0 pl-3">
                              <div className={"text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-colors " + (isActive ? "bg-[#5c7c6d] text-white border-[#5c7c6d]" : "bg-white border-slate-200 text-slate-500 group-hover:border-slate-300")}>
                                 {session.attendanceCount || session.attendances?.length || 0}
                              </div>
                           </div>
                        </button>
                     )
                  })
               )}
            </div>
          </Card>

        {/* Selected Session Details Data Table */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 min-h-[350px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7] to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10 w-full border-b border-slate-100 pb-5">
             <div>
                <h3 className="text-lg font-black tracking-tight text-[#1c1c1c] flex items-center gap-2">
                   <FolderDot className="w-4 h-4 text-slate-400" /> Historical Data Archive
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
             </div>
             <Button
                icon={LucideHistory}
                label="Export CSV Data"
                onClick={exportAttendanceCsv}
                disabled={!selectedSession || attendance.length === 0}
                className="h-11 px-5 text-[13px] bg-[#1c1c1c] text-white rounded-[1rem] shrink-0 font-black shadow-[0_5px_20px_rgba(0,0,0,0.15)] hover:bg-black transition-colors"
             />
          </div>

          {selectedSession ? (
             <div className="flex-1 flex flex-col relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#fbfaf8] rounded-2xl p-5 border border-slate-100 shadow-inner">
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><ClipboardList className="w-3 h-3" /> Name</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c] truncate">{getSessionName(selectedSession)}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Clock className="w-3 h-3" /> Date</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatDate(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Activity className="w-3 h-3" /> Time</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatTime(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Users className="w-3 h-3" /> Records</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]"><span className="text-[#5c7c6d]">{attendance.length}</span> students</div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2.5 max-h-[300px] border border-slate-100 rounded-[1rem] p-2 bg-[#fcfcfa]">
                   {attendance.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center py-10 opacity-70">
                         <div className="text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                            <Ban className="w-6 h-6 mb-1" />
                            No attendance records found for this session.
                         </div>
                      </div>
                   ) : (
                      attendance.map((record, index) => {
                         const student = record.student || {}
                         const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || 'Student'
                         const status = record.status || 'pending'
                         const statusStyles = {
                            present: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60',
                            pending: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
                            absent: 'bg-rose-50/80 text-rose-800 border-rose-200/60',
                         }
                         return (
                            <div key={record.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[1rem] p-3.5 border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all gap-3 sm:gap-0 group">
                               <div className="flex items-center gap-3.5">
                                   <div className="w-9 h-9 rounded-full bg-[#f4f2ee] shadow-inner flex items-center justify-center text-[13px] font-black text-slate-500 border border-slate-200/80 group-hover:border-[#5c7c6d] group-hover:text-[#5c7c6d] transition-colors shrink-0">
                                      {getInitials(name)}
                                   </div>
                                   <div>
                                      <div className="text-[13px] font-bold text-[#1c1c1c]">{name}</div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                         <MousePointerClick className="w-3 h-3" /> {record.method || 'manual'}
                                      </div>
                                   </div>
                               </div>
                               <span className={"text-[10px] sm:self-center self-start font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm " + (statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>
                                  {status}
                               </span>
                            </div>
                         )
                      })
                   )}
                </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fbfaf8] rounded-[1.5rem] border border-slate-200/50 border-dashed text-center relative z-10 m-2 mt-0">
                <div className="w-16 h-16 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.03)] rounded-full flex items-center justify-center mb-5 border border-slate-100">
                   <MousePointerClick className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-[16px] font-black tracking-tight text-[#1c1c1c]">No Session Selected</h4>
                <p className="text-[13px] text-slate-500 font-medium max-w-[280px] mt-2.5 leading-relaxed">Click on a past session from the history panel to view its check-in records or to download a spreadsheet.</p>
             </div>
          )}
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

.Replace(, <Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-slate-200/60 min-h-[350px] max-h-[500px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7]/50 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10 w-full border-b border-slate-100 pb-4">
               <div>
                  <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                     <FolderDot className="w-[18px] h-[18px] text-[#5c7c6d]" /> Historical Data Archive
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
               </div>
               <Button
                  icon={DownloadCloud}
                  label="Export CSV"
                  onClick={exportAttendanceCsv}
                  disabled={!selectedSession || attendance.length === 0}
                  className="h-10 px-4 text-[12px] bg-[#1c1c1c] text-white rounded-xl shrink-0 font-black shadow-md hover:bg-black hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 space-x-2"
               />
            </div>
  
            {selectedSession ? (
               <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-slate-100 bg-[#fbfaf8] rounded-xl p-3 shrink-0 mb-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><ClipboardList className="w-3 h-3 text-[#5c7c6d]" /> Name</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight truncate">{getSessionName(selectedSession)}</div>
                     </div>
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-amber-500" /> Date</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight">{formatDate(getSessionStart(selectedSession))}</div>
                     </div>
                     <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3 text-blue-500" /> Time</div>
                        <div className="font-black text-[13px] text-[#1c1c1c] tracking-tight">{formatTime(getSessionStart(selectedSession))}</div>
                     </div>
                     <div className="bg-[#f4f7f6] border border-[#5c7c6d]/20 rounded-lg p-2.5 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="text-[9px] uppercase tracking-widest text-[#5c7c6d]/70 font-black mb-0.5">Records</div>
                        <div className="font-black text-[18px] text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{attendance.length} <span className="text-[10px] text-[#5c7c6d]/60 font-bold ml-0.5">students</span></div>
                     </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2 rounded-xl bg-white min-h-[0]">
                     {attendance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                           <div className="w-12 h-12 rounded-full bg-[#fcfcfa] border border-slate-200 border-dashed flex items-center justify-center mb-3">
                              <Ban className="w-5 h-5 text-slate-300" />
                           </div>
                           <div className="text-[13px] text-slate-400 font-bold">No attendance records found</div>
                        </div>
                     ) : (
                        attendance.map((record, index) => {
                           const student = record.student || {}
                           const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || "Student"
                           const status = record.status || "pending"
                           const statusStyles = {
                              present: "bg-emerald-50 border border-emerald-100/80 text-emerald-700",
                              pending: "bg-slate-50 border border-slate-200/80 text-slate-700",
                              absent: "bg-rose-50 border border-rose-100/80 text-rose-700",
                           }
                           const dotColor = {
                              present: "bg-emerald-500",
                              pending: "bg-slate-400",
                              absent: "bg-rose-500",
                           }
                           return (
                              <div key={record.id || index} className="flex items-center justify-between p-3 rounded-xl border border-slate-100/50 hover:bg-[#fbfaf8] hover:border-slate-200 transition-colors group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                       {getInitials(name)}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-bold text-[13px] text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">{name}</span>
                                       <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className={"px-2 py-0.5 text-[9px] uppercase tracking-widest font-black rounded-full flex items-center gap-1 shrink-0 " + (statusStyles[status])}>
                                             <span className={"w-[5px] h-[5px] rounded-full " + (dotColor[status])}></span>
                                             {status}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                                       {formatTime(record.checkedInAt || record.created_at)}
                                    </span>
                                 </div>
                              </div>
                           )
                        })
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
                  <div className="w-16 h-16 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                     <FolderDot className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="text-[15px] font-black text-slate-400">Select a past session</div>
                  <p className="text-[12px] text-slate-400/80 mt-1.5 font-medium max-w-[220px]">Click any session from the history list to analyze its records.</p>
               </div>
            )})
Set-Content -Path 'C:\xampp\htdocs\Smart Attendance Monitoring\frontend\src\pages\instructor\InstructorDashboard.jsx' -Value import { useMemo, useState, useEffect } from 'react'
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
            'rounded-3xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] ' +
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
  
  // Data State
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
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
      () => closedSessions.find((session) => session.id === selectedSessionId) || null,
      [closedSessions, selectedSessionId]
   )
   const presentCount = attendance.filter((record) => record.status === 'present').length
   const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0
   const activePresentCount = activeAttendance.filter((record) => record.status === 'present').length
   const activePendingCount = activeAttendance.filter((record) => record.status === 'pending').length
   const activeAbsentCount = activeAttendance.filter((record) => record.status === 'absent').length
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

  const loadSessions = () => {
    if (!selectedClassId) return
    return withFeedback(async () => {
         const data = await apiRequest("/instructor/classes/" + selectedClassId + "/sessions")
      setSessions(data.sessions)
      setAttendance([])
      setSelectedSessionId(null)
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
         loadSessions()
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
    setSelectedSessionId(sessionId)
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
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     Total Classes
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.totalClasses}
                     <Activity className="w-6 h-6 text-[#5c7c6d]" />
                  </div>
               </Card>
               
               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <Users className="w-3.5 h-3.5" /> Total Students
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {classes.reduce((acc) => acc + 10, 0)}
                     <svg className="w-16 h-8 text-blue-100" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                  </div>
               </Card>

               <Card className="rounded-[1.25rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <BadgeDollarSign className="w-3.5 h-3.5" /> Attendance
                  </div>
                  <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between">
                     {analytics.attendanceRate}%
                  </div>
               </Card>
            </div>

            {/* Right tall green card */}
            <Card className="col-span-1 lg:row-span-2 xl:col-start-4 xl:row-start-1 bg-[#5c7c6d] border-[#4a6357] text-white p-6 shadow-sm rounded-[1.25rem] flex flex-col justify-between min-h-[300px]">
               <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Live Sessions</div>
               <div className="text-6xl font-black mt-auto flex justify-between items-end pb-4">
                  {activeSession ? 1 : 0}
                  <svg className="w-16 h-8 text-emerald-300 opacity-50" viewBox="0 0 100 30"><path d="M0,15 C20,30 40,0 60,15 C80,30 100,10 100,10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
               </div>
            </Card>

            {/* Active Classes Area */}
            <Card className="col-span-1 lg:col-span-2 p-7 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative overflow-hidden h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <h3 className="text-base font-bold text-[#1c1c1c]">Active Classes</h3>
                     <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> On Track</span>
                  </div>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="bg-[#1c1c1c] text-white h-9 px-5 shadow-sm text-xs rounded-full" />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {classes.length === 0 ? (
                     <div className="flex items-center justify-center p-4 bg-[#f8f7f5]/40 rounded-xl">
                        <p className="text-sm text-slate-500 font-semibold">No classes yet. Create one above.</p>
                     </div>
                  ) : (
                     classes.map(cls => (
                        <div key={cls.id} onClick={() => setSelectedClassId(cls.id)} className="cursor-pointer border border-slate-100 bg-[#f8f7f5] rounded-[1rem] p-4 hover:shadow-md hover:border-slate-200 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-bold text-[#1c1c1c] text-[15px] group-hover:text-[#5c7c6d] transition-colors">{cls.name}</h4>
                              <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5 flex shrink-0 bg-white shadow-sm p-1 rounded-full items-center justify-center text-slate-400" /></button>
                           </div>
                           <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-6">
                              <div>
                                 <div className="mb-1">Class ID</div>
                                 <div className="text-xs text-[#1c1c1c]">{cls.id}</div>
                              </div>
                              <div className="text-right">
                                 <div className="mb-1 text-slate-400">Join Code</div>
                                 <div className="text-xs text-rose-500">{cls.joinCode}</div>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </Card>

            {/* Profile Info Area */}
            <Card className="col-span-1 p-6 rounded-[1.25rem] shadow-sm border border-slate-200/60 bg-white relative flex flex-col items-center justify-center text-center h-[300px]">
               <div className="w-16 h-16 rounded-full bg-[#f4f2ee] shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group">
                  <Users className="w-7 h-7 text-slate-400" />
               </div>
               <div className="font-bold text-[#1c1c1c] text-[15px]">{user?.fullName || 'Sample Instructor'}</div>
               <div className="text-[10px] font-extrabold tracking-widest text-slate-400 mt-1 mb-6 uppercase">{user?.email || 'INSTRUCTOR@DEMO.LOCAL'}</div>
               
               <div className="flex w-full justify-between items-center gap-2 p-3 bg-[#ebeae7] rounded-[1rem] shadow-inner border border-slate-200/50">
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Classes</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalClasses}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2 border-r border-[#1c1c1c]/10">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Students</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{classes.reduce((acc) => acc + 10, 0)}</div>
                  </div>
                  <div className="flex-1 flex flex-col px-2">
                     <div className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Sessions</div>
                     <div className="text-lg font-black text-[#1c1c1c]">{analytics.totalSessions}</div>
                  </div>
               </div>
            </Card>
         </div>

         {/* Dashboard Bottom Row */}
         <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <Card className="flex-[0_1_auto] w-full lg:w-[600px] p-6 flex items-center justify-between gap-4 bg-white overflow-hidden relative shadow-sm border border-slate-200/60 rounded-[1.25rem] hover:shadow-md transition-shadow h-[180px]">
               <div className="flex flex-col h-full max-w-[320px] z-10 justify-center">
                  <h3 className="text-base font-bold text-[#1c1c1c]">Available Class Options</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">Create new modules and securely invite students into your class portal.</p>
                  <Button label="Add Class" onClick={() => setIsCreateClassModalOpen(true)} className="mt-5 bg-[#5c7c6d] hover:bg-[#4a6357] text-white w-fit min-h-0 h-9 px-6 font-bold text-[11px] rounded-full" />
               </div>
               <div className="absolute right-0 top-0 w-64 h-full bg-[#f4f4f5]/50 -skew-x-12 translate-x-8 z-0"></div>
               <div className="relative w-28 h-32 transform scale-110 z-10 translate-x-2 hidden md:block">
                  <div className="absolute w-full h-full bg-[#5C7C6D]/10 rounded-xl rotate-6 translate-x-1.5 translate-y-1.5"></div>
                  <div className="absolute w-full h-full bg-[#5C7C6D] rounded-lg flex items-center justify-center shadow-lg shadow-[#5C7C6D]/20">
                     <Book className="w-10 h-10 text-white/90" />
                  </div>
               </div>
            </Card>
            <Card className="w-full lg:w-[320px] p-6 flex flex-col justify-center border border-slate-200/60 shadow-sm rounded-[1.25rem] bg-white hover:shadow-md transition-shadow h-[180px]">
               <h3 className="text-sm font-bold text-[#1c1c1c] mb-4">Recent Sessions</h3>
               <div className="space-y-4">
                  {classes.flatMap(c => c.sessions || []).slice(0, 3).map((session, i) => (
                     <div key={session.id || i} className="flex justify-between items-center px-1">
                        <div className="relative pl-3 border-l-2 border-[#5C7C6D]">
                           <div className="text-[12px] font-bold text-[#1c1c1c] tracking-tight">{new Date(session.startTime).toLocaleDateString()}</div>
                           <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-[11px] font-bold text-[#5C7C6D] bg-[#E8EFEA] px-2.5 py-0.5 rounded-full shadow-sm ring-1 ring-white">
                           +{session.attendances?.length || 0}
                        </div>
                     </div>
                  ))}
                  {classes.length === 0 && (
                     <div className="flex flex-col items-center justify-center p-3">
                        <div className="w-10 h-10 rounded-full bg-[#f4f4f5] flex items-center justify-center mb-2"><Clock className="w-4 h-4 text-slate-300" /></div>
                        <div className="text-[11px] font-bold text-slate-400">No sessions</div>
                     </div>
                  )}
               </div>
            </Card>
            <Card className="flex-1 w-full lg:max-w-[230px] p-6 flex flex-col items-center text-center justify-center bg-white shadow-sm rounded-[1.25rem] border border-slate-200/60 hover:shadow-md transition-shadow h-[180px]">
               <div className="w-12 h-12 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100 mb-3 relative group cursor-pointer hover:border-[#5c7c6d] transition-colors">
                  <Fingerprint className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
               </div>
               <h3 className="text-[13px] font-bold text-[#1c1c1c]">Security Check</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-relaxed">Update devices</p>
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
    <div className="min-h-[100vh] bg-transparent w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 transition-colors">
      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row items-start lg:items-center justify-between mb-10 gap-4 pt-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedClassId(null)}
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

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <Users className="w-3.5 h-3.5" /> Enrolled Students
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {students.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <ClipboardList className="w-3.5 h-3.5" /> Total Sessions
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {sessions.length}
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Book className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-6 border border-white/60 bg-gradient-to-b from-[#ffffff] to-[#faf9f7] shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#5c7c6d] transition-colors">
            <BarChart3 className="w-3.5 h-3.5" /> Avg Attendance
          </div>
          <div className="text-[40px] font-black text-[#1c1c1c] tracking-tight flex items-end justify-between leading-none">
            {attendanceRate}%
            <div className="w-11 h-11 bg-white group-hover:bg-[#f1f5f3] transition-colors rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-400 group-hover:text-[#5c7c6d] transition-colors" />
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Section: Live Tracking & QR */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
        
        {/* Live Attendance Panel - Elegant Theme */}
        <Card className={"col-span-1 p-8 rounded-[1.5rem] border relative flex flex-col overflow-hidden transition-all duration-500 " + (activeSession ? "bg-white border-[#5c7c6d]/20 shadow-[0_15px_60px_rgba(92,124,109,0.08)] min-h-[440px]" : "bg-[#fcfcfa] border-slate-200/50 shadow-sm min-h-[350px]")}>
          {activeSession && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-[#5c7c6d] to-emerald-400 opacity-50"></div>}
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className={"text-[20px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Live Tracking</h3>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Real-time Class Roster</p>
            </div>
            <button onClick={loadSessions} className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors shadow-sm focus:outline-none">
              <Activity className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-[#ffffff] rounded-[1.25rem] border border-slate-200/60 p-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.03)] mb-8 relative z-10 w-full overflow-hidden">
            <div className="flex-1 text-center py-3 relative group hover:bg-[#f4f7f6]/60 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-[#5c7c6d] font-black mb-1.5 opacity-90"><CheckCircle className="w-3.5 h-3.5" /> Present</div>
               <div className="text-[34px] md:text-[40px] font-black text-[#5c7c6d] leading-none tracking-tighter drop-shadow-sm">{activePresentCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 relative group hover:bg-amber-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-amber-600 font-black mb-1.5 opacity-90"><Clock className="w-3.5 h-3.5" /> Pending</div>
               <div className="text-[34px] md:text-[40px] font-black text-amber-500 leading-none tracking-tighter drop-shadow-sm">{activePendingCount}</div>
               <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-200/70"></div>
            </div>
            <div className="flex-1 text-center py-3 group hover:bg-rose-50/40 transition-colors rounded-xl cursor-default">
               <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest text-rose-600 font-black mb-1.5 opacity-90"><Ban className="w-3.5 h-3.5" /> Absent</div>
               <div className="text-[34px] md:text-[40px] font-black text-rose-500 leading-none tracking-tighter drop-shadow-sm">{activeAbsentCount}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-3.5 relative z-10 w-full pl-1 pb-2">
            {liveAttendance.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 h-full text-center bg-[#fdfcfb] rounded-[1.5rem] border border-dashed border-slate-200 mx-1">
                  <div className={"w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border " + (activeSession ? "bg-[#f4f7f6] border-[#5c7c6d]/10 animate-pulse" : "bg-[#f8f7f5] border-slate-100")}>
                    <Users className={"w-10 h-10 " + (activeSession ? "text-[#5c7c6d]/40" : "text-slate-300")} />
                  </div>
                  <div className={"text-[17px] font-black tracking-tight " + (activeSession ? "text-[#1c1c1c]" : "text-slate-400")}>Monitoring Active Room...</div>
                  <div className="text-[13px] text-slate-400 mt-2 font-medium max-w-[250px] leading-relaxed">Students will appear right here as soon as they scan the session code.</div>
               </div>
            ) : (
               liveAttendance.map((record, index) => {
                  const status = record.status || "pending"
                  const statusStyles = {
                     present: "bg-white border-emerald-100/60 shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:shadow-[0_12px_30px_rgba(16,185,129,0.12)]",
                     pending: "bg-white border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]",
                     absent: "bg-white border-rose-100/60 shadow-[0_8px_20px_rgba(244,63,94,0.06)] hover:shadow-[0_12px_30px_rgba(244,63,94,0.12)]",
                  }
                  const statusDot = { present: "bg-emerald-500", pending: "bg-amber-400", absent: "bg-rose-500" }
                  const statusBadge = { present: "text-emerald-700 bg-emerald-50 border border-emerald-100", pending: "text-amber-700 bg-amber-50 border border-amber-100", absent: "text-rose-700 bg-rose-50 border border-rose-100" }
                  
                  return (
                     <div key={record.id || index} className={"flex items-center justify-between rounded-[1.25rem] p-4 border transition-all duration-300 transform hover:-translate-y-1 group " + (statusStyles[status] || "bg-white border-slate-100")} style={{animationDelay: (index * 50) + "ms"}}>
                        <div className="flex justify-start items-center gap-4">
                           <div className="relative">
                              <div className="w-[50px] h-[50px] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center text-[16px] font-black text-slate-600 shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-300 group-hover:border-[#5c7c6d]/30 group-hover:text-[#5c7c6d]">
                                 {getInitials(record.studentName || record.studentEmail || "Student")}
                              </div>
                              <span className={"absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20 " + statusDot[status]}></span>
                           </div>
                           <div className="flex flex-col justify-center">
                              <div className="text-[15px] font-black text-[#1c1c1c] tracking-tight group-hover:text-[#5c7c6d] transition-colors">
                                 {record.studentName || record.studentEmail || "Student"}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mt-1.5 flex items-center gap-2 w-full">
                                 <span className={"px-2 py-0.5 rounded-full shadow-sm " + (statusBadge[status])}>{status}</span>
                                 <span className="opacity-50 font-black">•</span>
                                 <span className="flex items-center gap-1 opacity-75 font-semibold tracking-wide"><MousePointerClick className="w-3 h-3" /> {record.method || "manual"}</span>
                              </div>
                           </div>
                        </div>
                        {record.checkedInAt && (
                           <div className="text-right flex flex-col justify-center items-end mr-2">
                              <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/40 font-black mb-1 truncate">Rec. Time</div>
                              <div className="text-[13px] font-black text-[#1c1c1c] bg-[#f4f7f6] px-3 py-1 rounded-lg border border-[#5c7c6d]/10 shadow-inner group-hover:bg-[#5c7c6d] group-hover:text-white transition-colors">{formatTime(record.checkedInAt)}</div>
                           </div>
                        )}
                     </div>
                  )
               })
            )}
          </div>
</Card>

        {/* QR Code / Session Status Card - More compact and perfectly themed */}
        <Card className={"col-span-1 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[1.5rem] flex flex-col transition-all relative overflow-hidden ring-1 ring-white/10 group " + (activeSession ? "bg-gradient-to-tr from-[#2d3a33] to-[#5c7c6d] text-white" : "bg-gradient-to-tr from-gray-900 to-[#1c1c1c] text-white")} noPadding>
          {activeSession && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)] pointer-events-none"></div>}
          <div className="p-7 h-full flex flex-col justify-center relative z-10">
             {activeSession ? (
                <>
                   <div className="absolute top-4 left-0 w-full flex justify-center">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">Transmitting Live</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-center justify-center w-full mt-10 mb-4">
                      {getSessionCode(activeSession) ? (
                         <div className="bg-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform hover:scale-[1.03] transition-all duration-300 cursor-pointer relative group" onClick={() => handleCopyCode(getSessionCode(activeSession))}>
                            <QRCodeSVG value={getSessionCode(activeSession)} size={160} bgColor="transparent" fgColor="#1c1c1c" />
                         </div>
                      ) : (
                         <div className="w-[160px] h-[160px] flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10"><Smartphone className="w-12 h-12 text-white/50" /></div>
                      )}
                   </div>
                   <div className="text-center mt-auto">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60 mb-2">Class Join Code</div>
                      <div className="text-[38px] font-black tracking-widest text-white drop-shadow-md leading-none">{getSessionCode(activeSession) || '--'}</div>
                   </div>
                </>
             ) : (
                <div className="flex flex-col h-full justify-center">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400/80 mb-6 w-full">
                      <span>Quick Actions</span>
                      <Radio className="w-4 h-4 opacity-50" />
                   </div>
                   <div className="flex flex-col items-center justify-center flex-1 my-4">
                      <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] border border-white/10 flex items-center justify-center mb-6 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-500">
                         <Radio className="w-8 h-8 text-white/80" />
                      </div>
                      <h3 className="text-[18px] font-black text-white text-center leading-tight">Start Tracking</h3>
                      <p className="text-[12px] text-slate-400 text-center font-medium mt-3 max-w-[200px] leading-relaxed">Launch a session to reveal the QR code for student check-ins.</p>
                   </div>
                   <Button
                      icon={Radio}
                      label="Launch Attendance"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="w-full h-12 bg-white text-[#1c1c1c] hover:bg-slate-200 mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-[13px] font-black rounded-[1rem]"
                   />
                </div>
             )}
          </div>
        </Card>
      </div>

      {/* Lower area - Session History and Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[360px_1fr] gap-6">
        
        {/* Past Sessions List */}
        <Card className="col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 bg-white min-h-[350px] max-h-[500px] flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
              <h3 className="text-[17px] font-black tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
                <LucideHistory className="w-[18px] h-[18px] text-slate-400" /> Past Sessions
              </h3>
              <span className="text-[10px] uppercase font-black text-[#5c7c6d] bg-[#f4f7f6] border border-[#5c7c6d]/20 px-2.5 py-1 rounded-lg tracking-widest">{closedSessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2.5 -mr-1 space-y-2.5">
               {closedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                     <div className="w-14 h-14 rounded-full bg-[#f8f7f5] border border-slate-200 flex items-center justify-center mb-4 inner-shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        <Clock className="w-6 h-6 text-slate-300" />
                     </div>
                     <div className="text-[14px] font-black text-slate-400">No session history yet</div>
                     <p className="text-[11px] text-slate-400/80 mt-1.5 font-medium max-w-[200px]">Sessions you end will appear here.</p>
                  </div>
               ) : (
                  closedSessions.map((session) => {
                     const isActive = selectedSessionId === session.id
                     return (
                        <button
                           key={session.id}
                           type="button"
                           onClick={() => loadAttendance(session.id)}
                           className={
                              "w-full text-left rounded-xl p-3 border transition-all duration-300 group flex items-center justify-between " +
                              (isActive ? "border-[#5c7c6d]/40 bg-[#f4f7f6] shadow-[0_4px_15px_rgba(92,124,109,0.1)] -translate-y-0.5" : "border-slate-100/80 hover:bg-[#fbfaf8] hover:border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]")
                           }
                        >
                           <div className="flex flex-col gap-1 w-full overflow-hidden">
                              <div className={"font-bold text-[13px] truncate pr-2 tracking-tight " + (isActive ? "text-[#5c7c6d]" : "text-[#1c1c1c] group-hover:text-slate-700 transition-colors")}>{getSessionName(session)}</div>
                              <div className="text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-60">
                                 <Clock className="w-[10px] h-[10px] text-slate-400" /> {formatDate(getSessionStart(session))}
                              </div>
                           </div>
                           <div className="flex flex-col items-center justify-center shrink-0 pl-3">
                              <div className={"text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-colors " + (isActive ? "bg-[#5c7c6d] text-white border-[#5c7c6d]" : "bg-white border-slate-200 text-slate-500 group-hover:border-slate-300")}>
                                 {session.attendanceCount || session.attendances?.length || 0}
                              </div>
                           </div>
                        </button>
                     )
                  })
               )}
            </div>
          </Card>

        {/* Selected Session Details Data Table */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-1 p-7 rounded-[1.5rem] shadow-sm border border-slate-200/60 min-h-[350px] flex flex-col bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#faf9f7] to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10 w-full border-b border-slate-100 pb-5">
             <div>
                <h3 className="text-lg font-black tracking-tight text-[#1c1c1c] flex items-center gap-2">
                   <FolderDot className="w-4 h-4 text-slate-400" /> Historical Data Archive
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Review & Export Class Record</p>
             </div>
             <Button
                icon={LucideHistory}
                label="Export CSV Data"
                onClick={exportAttendanceCsv}
                disabled={!selectedSession || attendance.length === 0}
                className="h-11 px-5 text-[13px] bg-[#1c1c1c] text-white rounded-[1rem] shrink-0 font-black shadow-[0_5px_20px_rgba(0,0,0,0.15)] hover:bg-black transition-colors"
             />
          </div>

          {selectedSession ? (
             <div className="flex-1 flex flex-col relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#fbfaf8] rounded-2xl p-5 border border-slate-100 shadow-inner">
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><ClipboardList className="w-3 h-3" /> Name</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c] truncate">{getSessionName(selectedSession)}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Clock className="w-3 h-3" /> Date</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatDate(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Activity className="w-3 h-3" /> Time</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]">{formatTime(getSessionStart(selectedSession))}</div>
                   </div>
                   <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#1c1c1c]/50 font-black mb-1.5 gap-1.5 flex items-center"><Users className="w-3 h-3" /> Records</div>
                      <div className="font-bold text-[13px] text-[#1c1c1c]"><span className="text-[#5c7c6d]">{attendance.length}</span> students</div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2.5 max-h-[300px] border border-slate-100 rounded-[1rem] p-2 bg-[#fcfcfa]">
                   {attendance.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center py-10 opacity-70">
                         <div className="text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                            <Ban className="w-6 h-6 mb-1" />
                            No attendance records found for this session.
                         </div>
                      </div>
                   ) : (
                      attendance.map((record, index) => {
                         const student = record.student || {}
                         const name = record.studentName || record.fullName || record.full_name || record.student_name || student.fullName || student.full_name || student.name || student.email || 'Student'
                         const status = record.status || 'pending'
                         const statusStyles = {
                            present: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60',
                            pending: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
                            absent: 'bg-rose-50/80 text-rose-800 border-rose-200/60',
                         }
                         return (
                            <div key={record.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[1rem] p-3.5 border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all gap-3 sm:gap-0 group">
                               <div className="flex items-center gap-3.5">
                                   <div className="w-9 h-9 rounded-full bg-[#f4f2ee] shadow-inner flex items-center justify-center text-[13px] font-black text-slate-500 border border-slate-200/80 group-hover:border-[#5c7c6d] group-hover:text-[#5c7c6d] transition-colors shrink-0">
                                      {getInitials(name)}
                                   </div>
                                   <div>
                                      <div className="text-[13px] font-bold text-[#1c1c1c]">{name}</div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                         <MousePointerClick className="w-3 h-3" /> {record.method || 'manual'}
                                      </div>
                                   </div>
                               </div>
                               <span className={"text-[10px] sm:self-center self-start font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm " + (statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>
                                  {status}
                               </span>
                            </div>
                         )
                      })
                   )}
                </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fbfaf8] rounded-[1.5rem] border border-slate-200/50 border-dashed text-center relative z-10 m-2 mt-0">
                <div className="w-16 h-16 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.03)] rounded-full flex items-center justify-center mb-5 border border-slate-100">
                   <MousePointerClick className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-[16px] font-black tracking-tight text-[#1c1c1c]">No Session Selected</h4>
                <p className="text-[13px] text-slate-500 font-medium max-w-[280px] mt-2.5 leading-relaxed">Click on a past session from the history panel to view its check-in records or to download a spreadsheet.</p>
             </div>
          )}
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


