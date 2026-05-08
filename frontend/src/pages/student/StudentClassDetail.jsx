import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import QrScanner from '../../components/QrScanner'
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Hash, RefreshCcw, ScanLine, TrendingUp, Target, XCircle } from 'lucide-react'

const formatDate = (value) => (
  value
    ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown'
)

const formatTime = (value) => (
  value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''
)

export default function StudentClassDetail() {
  const navigate = useNavigate()
  const { classId } = useParams()

  const [classInfo, setClassInfo] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionCode, setSessionCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [classData, sessionData] = await Promise.all([
        apiRequest(`/student/classes/${classId}`),
        apiRequest(`/student/classes/${classId}/sessions`),
      ])
      setClassInfo(classData.class)
      setSessions(sessionData.sessions || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [classId])

  const loadSessions = useCallback(async () => {
    try {
      const sessionData = await apiRequest(`/student/classes/${classId}/sessions`)
      setSessions(sessionData.sessions || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [classId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadSessions()
    }, 15000)

    return () => clearInterval(intervalId)
  }, [loadSessions])

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === 'open') || null,
    [sessions]
  )

  const performance = useMemo(() => {
    const counts = { present: 0, late: 0, absent: 0 }
    sessions.forEach((session) => {
      const rawStatus = session.attendanceStatus
      const status = rawStatus === 'pending' ? 'present' : rawStatus
      if (status === 'present') counts.present += 1
      if (status === 'late') counts.late += 1
      if (status === 'absent') counts.absent += 1
    })
    const total = counts.present + counts.late + counts.absent
    const rate = total ? Math.round(((counts.present + counts.late) / total) * 100) : 0
    return { ...counts, total, rate }
  }, [sessions])

  const recentPerformance = useMemo(() => {
    const recentSessions = sessions.slice(0, 6)
    const counts = { present: 0, late: 0, absent: 0 }
    recentSessions.forEach((session) => {
      const rawStatus = session.attendanceStatus
      const status = rawStatus === 'pending' ? 'present' : rawStatus
      if (status === 'present') counts.present += 1
      if (status === 'late') counts.late += 1
      if (status === 'absent') counts.absent += 1
    })
    const total = counts.present + counts.late + counts.absent
    const rate = total ? Math.round(((counts.present + counts.late) / total) * 100) : 0
    return { ...counts, total, rate }
  }, [sessions])

  const submitCheckIn = async (method, overrideCode) => {
    const normalizedCode = (overrideCode || sessionCode || '').trim().toUpperCase()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const payload = method === 'manual'
        ? { method, classId: Number(classId) }
        : { method, sessionCode: normalizedCode }

      const response = await apiRequest('/student/checkins', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setMessage(response?.message || 'Check-in recorded.')
      setSessionCode('')
      await loadSessions()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleQrCode = (code) => {
    setSessionCode(code)
    submitCheckIn('qr', code)
  }

  return (
    <div className="min-h-screen bg-transparent w-full mx-auto p-4 md:p-5 lg:p-6 font-sans text-[#111]">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 lg:mb-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/classes')}
              className="h-10 w-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center text-[#111] hover:bg-slate-50"
              title="Back to classes"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-[#0a0a0a]">
                {classInfo?.name || 'Class Details'}
              </h1>
              <p className="text-[#666] text-[14px] mt-1">
                Instructor: {classInfo?.instructorName || 'Instructor'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="border border-[#e2e4e7] bg-white hover:bg-slate-50 transition-colors text-[#111] px-5 py-2.5 rounded-full text-[14px] font-medium shadow-sm flex items-center gap-2"
          >
            <RefreshCcw className={"w-4 h-4 " + (loading ? 'animate-spin' : '')} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {(message || error) && (
          <div className={"p-4 rounded-2xl mb-6 flex items-start gap-3 " + (message ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800')}>
            {message ? <CheckCircle className="h-5 w-5 mt-0.5" /> : <AlertCircle className="h-5 w-5 mt-0.5" />}
            <div className="text-[14px] font-medium">{message || error}</div>
          </div>
        )}

        {activeSession ? (
          <div className="mb-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 bg-[#18563e] rounded-[22px] p-5 lg:p-6 shadow-[0_8px_24px_rgba(24,86,62,0.2)] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <ScanLine className="w-32 h-32 transform rotate-12" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#276e51] text-white text-[11px] font-semibold border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active session is live
                    </div>
                    <div className="text-[12px] text-white/70">Auto-refreshing every 15 seconds</div>
                  </div>
                  <div className="relative z-10 mt-4">
                    <h2 className="text-[22px] font-semibold text-white tracking-tight">{activeSession.sessionName || 'Active Session'}</h2>
                    <p className="text-[13px] text-emerald-100/80 mt-1 font-medium">
                      Started {formatDate(activeSession.startsAt)} {formatTime(activeSession.startsAt)}
                    </p>
                  </div>
                  <div className="relative z-10 mt-4 flex items-start gap-3 text-[13px] text-white bg-black/15 border border-white/10 rounded-[14px] px-4 py-3 max-w-max backdrop-blur-sm">
                    <Hash className="w-4 h-4 text-emerald-300 mt-0.5" />
                    <div>
                      <div className="font-medium text-emerald-100">Session code</div>
                      <div className="text-[12px] text-white/70">Hidden for students. Ask your instructor.</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[20px] p-4 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <h3 className="text-[14px] font-semibold text-[#111]">Check-in with code</h3>
                  <p className="text-[12px] text-[#666] mt-1">Enter the session code from your instructor.</p>
                  {activeSession.attendanceMode !== 'manual_only' ? (
                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        value={sessionCode}
                        onChange={(event) => setSessionCode(event.target.value)}
                        placeholder="Enter session code"
                        className="w-full bg-[#f3f4f6] border-none rounded-[12px] px-4 py-3 text-[14px] text-center font-mono tracking-widest outline-none focus:ring-2 focus:ring-[#18563e]/20"
                      />
                      <button
                        type="button"
                        onClick={() => submitCheckIn('code')}
                        disabled={submitting || !sessionCode}
                        className="w-full bg-[#18563e] text-white rounded-[12px] py-3 text-[13px] font-medium hover:bg-[#11402e] transition-colors disabled:opacity-50"
                      >
                        Submit with Code
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => submitCheckIn('manual')}
                      disabled={submitting}
                      className="mt-4 w-full bg-[#18563e] text-white rounded-[12px] py-3 text-[13px] font-medium hover:bg-[#11402e] transition-colors disabled:opacity-50"
                    >
                      Submit Manual Attendance
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-[20px] p-4 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#111]">Your status</h3>
                    {(() => {
                      const rawStatus = activeSession.attendanceStatus
                      const status = rawStatus === 'pending' ? 'present' : rawStatus
                      const statusStyles = {
                        present: 'bg-[#eaf4ef] text-[#18563e]',
                        late: 'bg-amber-50 text-amber-700',
                        absent: 'bg-rose-50 text-rose-700',
                      }
                      const label = status ? status : 'not checked'
                      return (
                        <span className={"px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide " + (statusStyles[status] || 'bg-slate-100 text-slate-600')}>
                          {label}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="mt-4">
                    <p className="text-[12px] text-[#666]">Checked in at</p>
                    <p className="text-[15px] font-semibold text-[#111]">
                      {activeSession.checkedInAt ? formatTime(activeSession.checkedInAt) : 'Not yet'}
                    </p>
                    <p className="text-[11px] text-[#888] mt-2">Updates automatically while session is live.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[22px] p-5 lg:p-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#111]">Scan QR</h3>
                    <p className="text-[12px] text-[#666] mt-1">Scan the code displayed by your instructor.</p>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-black/5">
                    <ScanLine className="w-4 h-4 text-[#888]" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                  <QrScanner onCode={handleQrCode} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[22px] p-5 lg:p-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-5">
            <h2 className="text-[18px] font-semibold text-[#111]">No active session</h2>
            <p className="text-[14px] text-[#666] mt-2">
              When your instructor starts a session, it will appear here and you can scan the QR code or enter the PIN.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-5">
          <div className="bg-white rounded-[22px] p-5 lg:p-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h3 className="text-[16px] font-semibold text-[#111] mb-4">Recent Sessions</h3>
            <div className="space-y-4">
              {sessions.length > 0 ? sessions.slice(0, 6).map((session) => {
                const rawStatus = session.attendanceStatus
                const status = rawStatus === 'pending' ? 'present' : rawStatus
                return (
                  <div key={session.id} className="flex items-center justify-between border-b border-black/5 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[15px] font-semibold text-[#111]">{session.sessionName || 'Session'}</p>
                      <div className="flex flex-wrap gap-3 text-[12px] text-[#666] mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(session.startsAt)} {formatTime(session.startsAt)}
                        </span>
                        <span className="uppercase tracking-wide">{session.status}</span>
                      </div>
                    </div>
                    <div className={"px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-wide " + (
                      status === 'present'
                        ? 'bg-[#eaf4ef] text-[#18563e]'
                        : status === 'late'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-rose-50 text-rose-600'
                    )}
                    >
                      {status || 'Not recorded'}
                    </div>
                  </div>
                )
              }) : (
                <p className="text-[14px] text-slate-400 text-center py-10">No sessions yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[22px] p-5 lg:p-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="text-[16px] font-semibold text-[#111] flex items-center gap-2">
                  Attendance Analytics
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f0f5f2] text-[#18563e]">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </h3>
                <p className="text-[12px] text-[#666] mt-1">Overall and recent performance tracking</p>
              </div>
              <div className="bg-slate-50 px-3 py-1 rounded-[10px] border border-black/5 text-[11px] font-semibold text-[#888]">
                {sessions.length} TOTAL SESSIONS
              </div>
            </div>

            <div className="flex-1 mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[20px] bg-gradient-to-br from-[#f0f5f2] to-[#f8faf9] border border-[#e2ede7] p-5 flex flex-col items-center justify-center relative overflow-hidden">
                {/* SVG Circular Progress */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="rgba(0,0,0,0.04)" strokeWidth="12" />
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="#18563e" strokeWidth="12" strokeDasharray="351.8" strokeDashoffset={351.8 - (351.8 * performance.rate) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[32px] font-bold text-[#111] tracking-tight">{performance.rate}<span className="text-[18px] text-[#666]">%</span></span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-[#18563e]">
                  <Target className="w-4 h-4 opacity-80" />
                  Overall Attendance Rate
                </div>
              </div>

              <div className="rounded-[20px] border border-black/5 p-4 bg-white flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[12px] font-semibold text-[#888] uppercase tracking-wide">Last {recentPerformance.total} Sessions</p>
                  <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-black/5 text-[11px] font-medium">{recentPerformance.rate}% Trend</span>
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  {[
                    { label: 'Present', value: recentPerformance.present, total: recentPerformance.total, color: 'bg-[#18563e]', icon: CheckCircle },
                    { label: 'Late', value: recentPerformance.late, total: recentPerformance.total, color: 'bg-amber-400', icon: Clock },
                    { label: 'Absent', value: recentPerformance.absent, total: recentPerformance.total, color: 'bg-rose-400', icon: XCircle },
                  ].map((row) => {
                    const percent = row.total ? Math.round((row.value / row.total) * 100) : 0
                    const Icon = row.icon
                    return (
                      <div key={row.label} className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#111]">
                            <Icon className="w-3.5 h-3.5 text-[#888]" />
                            {row.label}
                          </div>
                          <span className="text-[12px] font-semibold text-[#888]">{row.value}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={"h-full rounded-full transition-all duration-500 " + row.color} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-[16px] border border-[#e2ede7] bg-[#f8fbfa] p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[20px] font-bold text-[#18563e]">{performance.present}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#18563e]/70 mt-0.5">Present</p>
              </div>
              <div className="rounded-[16px] border border-amber-100 bg-amber-50/50 p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[20px] font-bold text-amber-600">{performance.late}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600/70 mt-0.5">Late</p>
              </div>
              <div className="rounded-[16px] border border-rose-100 bg-rose-50/50 p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[20px] font-bold text-rose-600">{performance.absent}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600/70 mt-0.5">Absent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
