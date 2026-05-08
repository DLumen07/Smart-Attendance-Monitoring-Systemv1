import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { ArrowUpRight, RefreshCcw, AlertCircle, BookOpen, BarChart2, Target, TrendingUp } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [attendance, setAttendance] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setError('')
    setLoading(true)
    try {
      const [classData, attendanceData] = await Promise.all([
        apiRequest('/student/classes'),
        apiRequest('/student/attendance'),
      ])
      setClasses(classData.classes || [])
      setAttendance(attendanceData.attendance || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const isAttendedStatus = (status) => (
    status === 'present' || status === 'late' || status === 'pending'
  )
  const attendedCount = attendance.filter((record) => isAttendedStatus(record.status)).length
  const absentCount = attendance.filter((record) => record.status === 'absent').length
  const totalSessions = attendance.length
  const attendanceRate = totalSessions ? Math.round((attendedCount / totalSessions) * 100) : 0
  const missedCount = Math.max(totalSessions - attendedCount, 0)

  // Dynamic Attendance Overview data for SMTWTFS
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0]
  const dailyAttended = [0, 0, 0, 0, 0, 0, 0]
  attendance.forEach((record) => {
    const rawDate = record.checkedInAt || record.startsAt
    const normalizedDate = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate
    const date = normalizedDate ? new Date(normalizedDate) : null
    const dayIndex = Number.isInteger(record.sessionDay)
      ? record.sessionDay
      : (date && !Number.isNaN(date.getTime()) ? date.getDay() : null)
    if (dayIndex === null || dayIndex < 0 || dayIndex > 6) {
      return
    }
    dailyTotals[dayIndex] += 1
    if (isAttendedStatus(record.status)) {
      dailyAttended[dayIndex] += 1
    }
  })
  const maxTotal = Math.max(...dailyTotals, 1)

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const chartData = dayLabels.map((day, index) => {
    const total = dailyTotals[index]
    const attended = dailyAttended[index]
    const missed = Math.max(total - attended, 0)
    return {
      name: day,
      attended,
      missed,
      total
    }
  })

  return (
    <div className="min-h-screen bg-transparent w-full mx-auto p-4 md:p-5 font-sans text-[#111]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 lg:mb-6 max-w-[1400px] mx-auto">
        <div className="mb-3 md:mb-0">
          <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#0a0a0a]">Dashboard</h1>
          <p className="text-[#666] text-[13px] md:text-[14px] mt-1">Track your attendance, view activity, and accomplish your tasks with ease.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/student/classes')}
            className="bg-[#18563e] hover:bg-[#11402e] transition-colors text-white px-4 py-2 rounded-full text-[13px] font-medium flex items-center gap-2 shadow-sm"
          >
            <BookOpen className="w-4 h-4" /> View Classes
          </button>
          <button
            type="button"
            onClick={loadData}
            className="border border-[#e2e4e7] bg-white hover:bg-slate-50 transition-colors text-[#111] px-4 py-2 rounded-full text-[13px] font-medium shadow-sm flex items-center gap-2"
          >
            <RefreshCcw className={"w-4 h-4 " + (loading ? 'animate-spin' : '')} />
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto">
        {error && (
          <div className="p-3 rounded-2xl mb-5 flex items-start gap-3 bg-rose-50 border border-rose-100 text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="text-[13px] font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Top 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 lg:mb-5">
          {/* Dark Green Card */}
          <div className="bg-[#18563e] text-white rounded-[20px] p-4 lg:p-5 relative flex flex-col justify-between shadow-sm min-h-[120px] lg:min-h-[130px]">
             <div className="flex justify-between items-start">
               <span className="text-[13px] lg:text-[14px] font-medium text-white/90">My Classes</span>
               <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#18563e]">
                 <ArrowUpRight className="w-3 h-3" />
               </div>
             </div>
             <div>
               <div className="text-[32px] lg:text-[38px] font-semibold leading-none tracking-tight mb-2">{classes.length}</div>
               <div className="inline-flex items-center gap-1 text-[10px] bg-[#276e51] px-2 py-0.5 rounded-md text-white font-medium tracking-wide">
                 <ArrowUpRight className="w-2.5 h-2.5" /> Active
               </div>
             </div>
          </div>

          {/* White Card 1 */}
          <div className="bg-white rounded-[20px] p-4 lg:p-5 relative flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[120px] lg:min-h-[130px] border border-black/5">
             <div className="flex justify-between items-start">
               <span className="text-[13px] lg:text-[14px] font-medium text-[#111]">Total Sessions</span>
               <div className="w-6 h-6 rounded-full border border-[#eee] flex items-center justify-center text-[#111]">
                 <ArrowUpRight className="w-3 h-3" />
               </div>
             </div>
             <div>
               <div className="text-[32px] lg:text-[38px] font-semibold tracking-tight text-[#111] leading-none mb-2">{attendance.length}</div>
               <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border border-[#eee] text-slate-500 font-medium tracking-wide">
                 This term
               </div>
             </div>
          </div>

          {/* White Card 2 */}
          <div className="bg-white rounded-[20px] p-4 lg:p-5 relative flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[120px] lg:min-h-[130px] border border-black/5">
             <div className="flex justify-between items-start">
               <span className="text-[13px] lg:text-[14px] font-medium text-[#111]">Present</span>
               <div className="w-6 h-6 rounded-full border border-[#eee] flex items-center justify-center text-[#111]">
                 <ArrowUpRight className="w-3 h-3" />
               </div>
             </div>
             <div>
                 <div className="text-[32px] lg:text-[38px] font-semibold tracking-tight text-[#111] leading-none mb-2">
                   {attendedCount}
                 </div>
               <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#eaf4ef] text-[#18563e] font-medium tracking-wide">
                 Looking good
               </div>
             </div>
          </div>

          {/* White Card 3 */}
          <div className="bg-white rounded-[20px] p-4 lg:p-5 relative flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[120px] lg:min-h-[130px] border border-black/5">
             <div className="flex justify-between items-start">
               <span className="text-[13px] lg:text-[14px] font-medium text-[#111]">Absent</span>
               <div className="w-6 h-6 rounded-full border border-[#eee] flex items-center justify-center text-[#111]">
                 <ArrowUpRight className="w-3 h-3" />
               </div>
             </div>
             <div>
                 <div className="text-[32px] lg:text-[38px] font-semibold tracking-tight text-[#111] leading-none mb-2">
                   {absentCount}
                 </div>
               <div className="text-[10px] text-slate-500 font-medium px-1 tracking-wide">
                 Needs attention
               </div>
             </div>
          </div>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4 mb-4 lg:mb-5">
          
          {/* Analytics (Chart) */}
          <div className="bg-white rounded-[22px] p-5 lg:p-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-[16px] font-semibold text-[#111] flex items-center gap-2">
                  Attendance Overview
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f0f5f2] text-[#18563e]">
                    <BarChart2 className="w-3.5 h-3.5" />
                  </span>
                </h3>
                <p className="text-[12px] text-[#666] mt-1">Weekly attendance patterns</p>
              </div>
              <div className="bg-slate-50 px-3 py-1 rounded-[10px] border border-black/5 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#666]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#18563e]"></span> Attended
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#666]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#e2ede7]"></span> Missed
                </div>
              </div>
            </div>

            <div className="flex-1 w-full h-[180px] -ml-4 pr-4 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#888' }} 
                    allowDecimals={false}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8faf9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#111] text-white p-3 rounded-[12px] shadow-xl text-[12px] font-medium min-w-[120px] border border-white/10">
                            <p className="text-white/60 mb-2 text-[11px] uppercase tracking-wider">{payload[0].payload.name}</p>
                            <div className="space-y-1.5">
                              <p className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#18563e]"></span>Attended</span> <span>{payload[0].payload.attended}</span></p>
                              <p className="flex justify-between items-center text-white/50"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#e2ede7]/30"></span>Missed</span> <span>{payload[0].payload.missed}</span></p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="attended" stackId="a" fill="#18563e" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="missed" stackId="a" fill="#e2ede7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overall Rate */}
          <div className="bg-white rounded-[22px] p-5 lg:p-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
             <div className="flex items-start justify-between gap-4 mb-2">
               <div>
                 <h3 className="text-[16px] font-semibold text-[#111]">Overall Rate</h3>
                 <p className="text-[12px] text-[#666] mt-1">Cumulative performance</p>
               </div>
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center py-4">
               {/* SVG Circular Progress */}
               <div className="relative w-32 h-32 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="64" cy="64" r="54" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="12" />
                   <circle 
                     cx="64" cy="64" r="54" fill="transparent" stroke="#18563e" strokeWidth="12" 
                     strokeDasharray="339.3" 
                     strokeDashoffset={339.3 - (339.3 * attendanceRate) / 100} 
                     strokeLinecap="round" className="transition-all duration-1000 ease-out" 
                   />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-[32px] font-bold text-[#111] tracking-tight leading-none">{attendanceRate}<span className="text-[16px] text-[#666]">%</span></span>
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mt-2">
               <div className="bg-[#f0f5f2] rounded-[14px] p-3 text-center border border-[#e2ede7]">
                 <span className="block text-[18px] font-bold text-[#18563e]">{attendedCount}</span>
                 <span className="block text-[11px] font-semibold text-[#18563e]/70 uppercase tracking-wide mt-0.5">Attended</span>
               </div>
               <div className="bg-rose-50/50 rounded-[14px] p-3 text-center border border-rose-100">
                 <span className="block text-[18px] font-bold text-rose-600">{missedCount}</span>
                 <span className="block text-[11px] font-semibold text-rose-600/70 uppercase tracking-wide mt-0.5">Missed</span>
               </div>
             </div>
          </div>

        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-[20px] p-4 lg:p-5 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[15px] font-semibold text-[#111]">Recent Activity</h3>
               <button onClick={loadData} className="flex items-center gap-1.5 border border-black/10 hover:bg-slate-50 transition-colors rounded-full px-2.5 py-1 text-[11px] font-medium text-[#111]">
                 <RefreshCcw className={"w-3 h-3 " + (loading ? 'animate-spin' : '')} /> Refresh
               </button>
             </div>
             
             <div className="space-y-3">
               {attendance.length > 0 ? attendance.slice(0, 6).map((record, i) => {
                  const rawStatus = record.status
                  const status = rawStatus === 'pending' ? 'present' : rawStatus
                  return (
                    <div key={record.id || i} className="flex items-center justify-between border-b border-black/5 pb-3 last:border-0 last:pb-0">
                       <div>
                         <h4 className="text-[14px] font-semibold text-[#111]">{record.sessionName || 'Session Check-in'}</h4>
                         <p className="text-[12px] text-[#666] mt-0.5">
                           {record.className || 'Class'} · {new Date(record.checkedInAt || Date.now()).toLocaleDateString()}
                         </p>
                       </div>
                       <div className={"px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide " + (
                         status === 'present'
                           ? 'bg-[#eaf4ef] text-[#18563e]'
                           : status === 'late'
                             ? 'bg-amber-50 text-amber-600'
                             : 'bg-rose-50 text-rose-600'
                       )}>
                         {status}
                       </div>
                    </div>
                  )
               }) : (
                  <p className="text-[13px] text-slate-400 text-center py-8">No attendance activity found.</p>
               )}
             </div>
          </div>
        </div>
      </div>

    </div>
  )
}
