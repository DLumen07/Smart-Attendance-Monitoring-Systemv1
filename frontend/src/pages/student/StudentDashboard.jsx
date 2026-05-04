import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client'
import QrScanner from '../../components/QrScanner'
import { LogIn, RefreshCcw, Camera, Hand as HandHand, Hash, CheckCircle, AlertCircle, Clock, BookOpen } from 'lucide-react'

export default function StudentDashboard() {
  const [joinCode, setJoinCode] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [classes, setClasses] = useState([])
  const [attendance, setAttendance] = useState([])
  const [manualClassId, setManualClassId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const withFeedback = async (action) => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await action()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const loadData = () => withFeedback(async () => {
    const [classData, attendanceData] = await Promise.all([
      apiRequest('/student/classes'),
      apiRequest('/student/attendance'),
    ])
    setClasses(classData.classes)
    setAttendance(attendanceData.attendance)
    if (!manualClassId && classData.classes[0]) {
      setManualClassId(String(classData.classes[0].id))
    }
  })

  useEffect(() => {
    loadData()
  }, [])

  const joinClass = (event) => withFeedback(async () => {
    event.preventDefault()
    await apiRequest('/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    })
    setJoinCode('')
    setMessage('Successfully joined class!')
    await loadData()
  })

  const checkIn = (method) => withFeedback(async () => {
    const payload = method === 'manual'
      ? { method, classId: Number(manualClassId) }
      : { method, sessionCode: sessionCode.toUpperCase() }

    await apiRequest('/student/checkins', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setMessage('Check-in submitted for review.')
    setSessionCode('')
    await loadData()
  })

  return (
    <div className="min-h-[100vh] bg-transparent w-full max-w-[1200px] mx-auto px-2 lg:px-8 py-6 pb-20 transition-colors animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 pt-2 pb-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-[#1c1c1c]">Dashboard</h1>
           <p className="text-[13px] text-slate-500 font-medium mt-1">Track your attendance and join new classes.</p>
        </div>
        <button 
          type="button" 
          onClick={loadData} 
          disabled={loading}
          className="p-2.5 rounded-xl bg-white text-slate-500 hover:text-[#5C7C6D] hover:bg-[#E8EFEA] transition-all border border-slate-200/60 shadow-sm active:scale-95 shrink-0" 
          title="Refresh Data"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts */}
      {(message || error) && (
        <div className={`p-4 rounded-xl border mb-6 ${message ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'} flex items-start gap-3`}>
          {message ? <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
          <p className="text-sm font-medium">{message || error}</p>
        </div>
      )}

      {/* Top Section - Join & Stats */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] mb-8">
        
        {/* Join Class Card */}
        <form onSubmit={joinClass} className="bg-white rounded-[1.25rem] p-8 shadow-sm border border-slate-200/60 flex flex-col justify-center relative overflow-hidden group hover:border-[#5C7C6D]/40 transition-colors">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-[#5C7C6D]/[0.03] blur-2xl z-0 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-5 relative z-10">
             <div className="w-10 h-10 rounded-2xl bg-[#E8EFEA] shadow-sm flex items-center justify-center border border-emerald-100">
                <LogIn className="h-5 w-5 text-[#5C7C6D]" />
             </div>
             <h2 className="text-lg font-bold text-[#1c1c1c] tracking-tight">Join a New Class</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 relative z-10 mt-2">
            <input
              required
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              className="flex-1 h-11 rounded-xl border border-slate-200/80 bg-[#f8f7f5]/50 px-4 text-[13px] font-semibold focus:bg-white focus:border-[#5C7C6D] focus:outline-none focus:ring-2 focus:ring-[#5C7C6D]/20 transition-all font-mono placeholder:font-sans placeholder:text-slate-400 placeholder:font-normal uppercase"
            />
            <button disabled={loading} className="h-11 rounded-xl bg-[#1c1c1c] px-8 text-[13px] font-bold text-white transition-all hover:bg-[#2c2c2c] shadow-sm disabled:opacity-50 shrink-0">
              Join Class
            </button>
          </div>
        </form>

        {/* Stats Sidebar */}
        <div className="bg-[#5C7C6D] rounded-[1.25rem] p-6 shadow-md border border-[#5C7C6D] flex flex-col justify-center relative overflow-hidden h-full min-h-[160px]">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
           <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="bg-white/10 p-2 rounded-xl text-white backdrop-blur-sm border border-white/10">
                   <BookOpen className="h-4 w-4" />
                 </div>
                 <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Enrolled</span>
              </div>
              <p className="text-2xl font-bold text-white">{classes.length}</p>
           </div>
           <div className="w-full border-t border-white/20 border-dashed my-2"></div>
           <div className="relative z-10 flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                 <div className="bg-white/10 p-2 rounded-xl text-white backdrop-blur-sm border border-white/10">
                   <CheckCircle className="h-4 w-4" />
                 </div>
                 <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Check-ins</span>
              </div>
              <p className="text-2xl font-bold text-white">{attendance.length}</p>
           </div>
        </div>
      </div>

      {/* Check-ins Section */}
      <h2 className="text-lg font-bold text-[#1c1c1c] tracking-tight flex items-center gap-2 mt-10 mb-5">
        Check-In Methods
      </h2>
      <div className="grid gap-5 lg:grid-cols-2 mb-10">
        
        {/* QR or Code */}
        <div className="bg-white rounded-[1.25rem] p-8 shadow-sm border border-slate-200/60 h-full flex flex-col relative overflow-hidden group hover:border-[#5C7C6D]/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-[#f4f4f5] flex items-center justify-center"><Hash className="h-4 w-4 text-slate-500" /></div>
             <h3 className="font-bold text-[#1c1c1c] text-base">Enter PIN Code</h3>
          </div>
          <p className="text-[13px] text-slate-500 font-medium mb-6">Enter the session code provided by your instructor or scan the live QR code.</p>
          
          <div className="space-y-5 mt-auto">
            <div className="relative">
              <input
                value={sessionCode}
                onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
                placeholder="SESSION PIN"
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-[#f8f7f5]/50 px-4 text-[13px] font-bold focus:bg-white focus:border-[#5C7C6D] focus:outline-none focus:ring-2 focus:ring-[#5C7C6D]/20 transition-all font-mono tracking-widest placeholder:font-sans placeholder:font-normal placeholder:tracking-normal uppercase text-center"
              />
            </div>
            
            <button
              type="button"
              onClick={() => checkIn('code')}
              disabled={!sessionCode || loading}
              className="w-full rounded-xl bg-[#5C7C6D] h-11 text-[13px] font-bold text-white transition-all hover:bg-[#4a6557] shadow-sm disabled:opacity-50"
            >
              Submit Code
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">OR SCAN QR</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
               <QrScanner onCode={(code) => {
                 setSessionCode(code.replace('session=', ''))
               }} />
            </div>
          </div>
        </div>

        {/* Manual Check-in */}
        <div className="bg-white rounded-[1.25rem] p-8 shadow-sm border border-slate-200/60 h-auto flex flex-col relative overflow-hidden group hover:border-[#5C7C6D]/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-[#f4f4f5] flex items-center justify-center"><HandHand className="h-4 w-4 text-slate-500" /></div>
             <h3 className="font-bold text-[#1c1c1c] text-base">Manual Attest</h3>
          </div>
          <p className="text-[13px] text-slate-500 font-medium mb-6">Use this only if the instructor has opened a session for manual roll call.</p>
          
          <div className="space-y-4 mt-auto">
            <select
              value={manualClassId}
              onChange={(event) => setManualClassId(event.target.value)}
              className="w-full h-11 appearance-none rounded-xl border border-slate-200/80 bg-[#f8f7f5]/50 px-4 text-[13px] font-semibold text-[#1c1c1c] focus:bg-white focus:border-[#5C7C6D] focus:outline-none focus:ring-2 focus:ring-[#5C7C6D]/20 transition-all cursor-pointer"
            >
              <option value="" disabled>Select class to check-in</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            
            <button
              type="button"
              disabled={!manualClassId || loading}
              onClick={() => checkIn('manual')}
              className="w-full rounded-xl bg-[#1c1c1c] h-11 text-[13px] font-bold text-white transition-all hover:bg-[#2c2c2c] shadow-sm disabled:opacity-50"
            >
              Mark Myself Present
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-bold text-[#1c1c1c] tracking-tight flex items-center gap-2 mb-5">
        Attendance History
      </h2>
      <div className="bg-white rounded-[1.25rem] p-6 shadow-sm border border-slate-200/60">
        {attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="text-slate-400 uppercase tracking-widest font-extrabold text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-4 py-4 font-extrabold">Session Details</th>
                  <th className="px-4 py-4 font-extrabold">Method</th>
                  <th className="px-4 py-4 font-extrabold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {attendance.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f8f7f5]/30 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1c1c1c] mb-0.5">{row.sessionName || 'Manual Check-in'}</p>
                      <div className="flex items-center gap-2">
                         <span className="text-[11px] text-slate-500 font-medium">{row.className}</span>
                         {row.sessionCode && (
                            <>
                               <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                               <span className="font-mono text-[10px] font-bold tracking-widest text-[#5C7C6D] bg-[#E8EFEA] px-1.5 py-0.5 rounded shadow-sm">{row.sessionCode}</span>
                            </>
                         )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-[#f4f4f5] text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200/60">
                        {row.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                         row.status === 'present' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 
                         row.status === 'absent' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 
                         'bg-amber-50 border border-amber-100 text-amber-700'
                       }`}>
                         {row.status === 'present' && <CheckCircle className="h-3 w-3" />}
                         {row.status === 'absent' && <AlertCircle className="h-3 w-3" />}
                         {row.status === 'pending' && <Clock className="h-3 w-3" />}
                         {row.status}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
           <div className="text-center py-12 rounded-xl bg-[#f8f7f5]/50 border border-dashed border-slate-200">
             <Clock className="mx-auto h-8 w-8 text-slate-300 mb-3" />
             <p className="text-[13px] font-bold text-[#1c1c1c]">No check-ins yet</p>
             <p className="text-[12px] text-slate-500 font-medium mt-1">Join a class and submit a code to see your history.</p>
           </div>
        )}
      </div>
    </div>
  )
}
