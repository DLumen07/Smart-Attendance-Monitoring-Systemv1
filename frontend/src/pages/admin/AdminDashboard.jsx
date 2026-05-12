import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client'
import { ShieldCheck, Users, CheckCircle2, BarChart3, DatabaseBackup, RotateCcw, FileClock, RefreshCcw, BadgeDollarSign, Activity, Calendar, Check, Book } from 'lucide-react'

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [error, setError] = useState('')
  const [restorePayload, setRestorePayload] = useState('')
  const [notice, setNotice] = useState('')

  const loadAdminData = async () => {
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const [pendingData, logData, analyticsData] = await Promise.all([
        apiRequest('/admin/pending-instructors'),
        apiRequest('/admin/activity-logs?limit=120'),
        apiRequest('/admin/analytics'),
      ])
      setPendingUsers(pendingData.users || [])
      setLogs(logData.logs || [])
      setAnalytics(analyticsData.analytics || null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const updateApproval = async (userId, status) => {
    setError('')
    setNotice('')
    setActionLoadingId(userId)
    try {
      await apiRequest(`/admin/instructors/${userId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      setPendingUsers((prev) => prev.filter((u) => Number(u.id) !== Number(userId)))
      setNotice(`Instructor account ${status} successfully.`)
      await loadAdminData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const exportBackup = async () => {
    setError('')
    setNotice('')
    try {
      const response = await apiRequest('/admin/backup')
      const backup = response.backup || {}
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const fileName = `sam-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
      setNotice('Backup exported successfully.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const restoreBackup = async () => {
    setError('')
    setNotice('')
    if (!restorePayload.trim()) {
      setError('Paste a backup JSON payload before restore.')
      return
    }

    let parsed
    try {
      parsed = JSON.parse(restorePayload)
    } catch {
      setError('Restore payload is not valid JSON.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/admin/restore', {
        method: 'POST',
        body: JSON.stringify({ backup: parsed }),
      })
      setNotice(response.message || 'Restore completed successfully.')
      await loadAdminData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent w-full mx-auto p-4 md:p-5 font-sans text-[#111]">
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-[#0a0a0a]">Admin Control Center</h1>
            <p className="text-[#666] text-[13px] md:text-[14px] mt-1">Manage instructor approvals, activity logs, analytics, backup, and restore.</p>
          </div>
          <button
            type="button"
            onClick={loadAdminData}
            className="border border-[#e2e4e7] bg-white hover:bg-slate-50 transition-colors text-[#111] px-4 py-2 rounded-full text-[13px] font-medium shadow-sm inline-flex items-center gap-2"
          >
            <RefreshCcw className={(loading ? 'animate-spin ' : '') + 'w-4 h-4'} /> Refresh
          </button>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_280px] gap-6 mb-6">
          <div className="col-span-1 lg:col-span-3 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              icon={Users}
              label="Users"
              value={analytics?.users?.total ?? 0}
              caption="All registered accounts"
            />
            <MetricCard
              icon={ShieldCheck}
              label="Admins"
              value={analytics?.users?.admins ?? 0}
              caption="Privileged workspace access"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Pending Approvals"
              value={analytics?.pendingInstructorApprovals ?? 0}
              caption="Instructor requests waiting"
            />
            <MetricCard
              icon={BarChart3}
              label="Classes"
              value={analytics?.totalClasses ?? 0}
              caption="Active class records"
            />
            <MetricCard
              icon={FileClock}
              label="Sessions"
              value={analytics?.totalSessions ?? 0}
              caption="Tracked attendance sessions"
            />
            <MetricCard
              icon={BadgeDollarSign}
              label="Attendance Rate"
              value={`${analytics?.attendanceRate ?? 0}%`}
              caption="Overall completion rate"
            />
          </div>

          <section className="col-span-1 lg:row-span-2 xl:col-start-4 xl:row-start-1 rounded-[1.25rem] p-0 shadow-[0_16px_36px_rgba(26,40,34,0.4)] border border-[#486657] bg-gradient-to-br from-[#344d41] to-[#1a2822] text-white flex flex-col min-h-[280px] relative overflow-hidden group/card">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5c7c6d] rounded-full blur-[80px] opacity-35 group-hover/card:opacity-55 transition-opacity duration-700 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full flex-1">
              <div className="p-5 pb-4 flex items-start justify-between gap-4 border-b border-white/5 relative bg-gradient-to-b from-white/[0.04] to-transparent">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#a8d3bf]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8d3bf]">Agenda</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white leading-none">Admin</h3>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-3xl font-black text-white leading-none tracking-tighter">{pendingUsers.length}</div>
                  <div className="text-[9px] font-bold text-[#a8d3bf] uppercase tracking-widest mt-1">Pending</div>
                </div>
              </div>
              <div className="flex-1 p-4 pt-5 overflow-y-auto custom-scrollbar">
                {pendingUsers.length > 0 ? (
                  <div className="relative border-l border-white/10 ml-2.5 space-y-4 pb-2">
                    {pendingUsers.slice(0, 5).map((user, index) => {
                      const isFirst = index === 0

                      return (
                        <div key={user.id} className="relative pl-5 group/item">
                          <div className={`absolute -left-[4.5px] top-1.5 w-[8px] h-[8px] rounded-full ring-[3px] ring-[#1a2822] transition-colors duration-300 ${isFirst ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-[#5c7c6d] group-hover/item:bg-[#a8d3bf]'}`} />
                          <div className="flex flex-col gap-1 -mt-0.5">
                            <div className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isFirst ? 'text-white' : 'text-[#a8d3bf] group-hover/item:text-white'}`}>{user.role || 'Instructor'}</div>
                            <div className={`rounded-[12px] border backdrop-blur-md p-2.5 transition-all duration-300 ${isFirst ? 'bg-white/10 border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.1)] translate-x-1' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                              <h4 className="text-[13px] font-bold text-white tracking-tight leading-snug truncate mb-0.5">{user.fullName}</h4>
                              <p className="text-[11px] font-medium text-white/50 truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#a8d3bf] animate-pulse mt-0.5" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-80 py-4">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 mb-3 shadow-inner">
                      <Check className="w-4 h-4 text-[#a8d3bf]" />
                    </div>
                    <h4 className="text-[13px] font-bold text-white tracking-tight mb-1">Nothing pending</h4>
                    <p className="text-[11px] font-medium text-[#a8d3bf] px-4 leading-relaxed">All instructor registrations have been reviewed.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200 bg-white relative overflow-hidden">
            <h2 className="text-[15px] font-bold text-[#111] mb-3">Approve Instructor Registrations</h2>
            {pendingUsers.length === 0 ? (
              <p className="text-[13px] text-slate-500">No pending instructor registrations.</p>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-[#111]">{user.fullName}</p>
                      <p className="text-[12px] text-slate-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoadingId === user.id}
                        onClick={() => updateApproval(user.id, 'approved')}
                        className="px-3 py-2 rounded-lg bg-[#18563e] text-white text-[12px] font-semibold hover:bg-[#11402e] disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === user.id}
                        onClick={() => updateApproval(user.id, 'rejected')}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-[12px] font-semibold hover:bg-slate-200 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border-0 bg-white relative overflow-hidden">
            <h2 className="text-[15px] font-bold text-[#111] mb-3">Backup and Restore</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <button
                type="button"
                onClick={exportBackup}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1c1c1c] text-white text-[13px] font-semibold hover:bg-black"
              >
                <DatabaseBackup className="w-4 h-4" /> Export Backup
              </button>
              <button
                type="button"
                onClick={restoreBackup}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-800 text-[13px] font-semibold hover:bg-slate-200"
              >
                <RotateCcw className="w-4 h-4" /> Restore Backup
              </button>
            </div>
            <textarea
              value={restorePayload}
              onChange={(event) => setRestorePayload(event.target.value)}
              placeholder="Paste backup JSON here, then click Restore Backup"
              className="w-full h-52 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#18563e]/20"
            />
          </section>
        </div>

        <section className="rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border-0 bg-white relative overflow-hidden">
          <h2 className="text-[15px] font-bold text-[#111] mb-3">Activity Logs</h2>
          {logs.length === 0 ? (
            <p className="text-[13px] text-slate-500">No activity logs yet.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-100 bg-white">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-200 sticky top-0 bg-white">
                    <th className="py-2.5 pr-3 font-semibold">Time</th>
                    <th className="py-2.5 pr-3 font-semibold">Actor</th>
                    <th className="py-2.5 pr-3 font-semibold">Action</th>
                    <th className="py-2.5 pr-3 font-semibold">Target</th>
                    <th className="py-2.5 pr-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 align-top odd:bg-white even:bg-slate-50/60">
                      <td className="py-2 pr-3 text-[12px] text-slate-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-[12px] text-slate-700">{log.actorName || log.actorEmail || 'System'}</td>
                      <td className="py-2 pr-3 text-[12px] font-medium text-[#111]">{log.action}</td>
                      <td className="py-2 pr-3 text-[12px] text-slate-700">{[log.targetType, log.targetId].filter(Boolean).join(': ') || '-'}</td>
                      <td className="py-2 pr-3 text-[11px] text-slate-500 max-w-[360px] break-all">{JSON.stringify(log.details || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, caption }) {
  return (
    <div className="rounded-[1.25rem] p-4 border border-white/55 bg-[linear-gradient(160deg,#ffffff_0%,#fcfbf9_62%,#f6f8f7_100%)] shadow-[0_4px_14px_rgba(20,24,22,0.03)] flex flex-col justify-between h-28 hover:shadow-[0_10px_22px_rgba(92,124,109,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Icon className="w-3.5 h-3.5 text-[#5c7c6d]" /> {label}
      </div>
      <div className="text-3xl font-black text-[#1c1c1c] flex items-end justify-between leading-none">
        {value}
        <div className="w-10 h-10 rounded-full bg-white border border-[#5c7c6d]/20 flex items-center justify-center shadow-[0_4px_12px_rgba(92,124,109,0.16)]">
          <Activity className="w-4 h-4 text-[#5c7c6d]" />
        </div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-[#5c7c6d]/70">{caption}</div>
    </div>
  )
}
