import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { ArrowUpRight, BookOpen, Plus, RefreshCcw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

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
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white text-ink">
              <h3 className="font-semibold tracking-tight">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-white">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function StudentClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  const loadClasses = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/student/classes')
      setClasses(data.classes || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  const handleJoin = async (event) => {
    event.preventDefault()
    if (!joinCode.trim()) {
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    try {
      await apiRequest('/student/classes/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode }),
      })
      setJoinCode('')
      setMessage('Class joined successfully.')
      setIsJoinModalOpen(false)
      await loadClasses()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent w-full mx-auto p-4 md:p-5 lg:p-6 font-sans text-[#111]">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 lg:mb-7">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-[#0a0a0a]">Classes</h1>
            <p className="text-[#666] text-[14px] md:text-[15px] mt-1">Browse your classes, join new ones, and open details.</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              type="button"
              onClick={loadClasses}
              className="border border-[#e2e4e7] bg-white hover:bg-slate-50 transition-colors text-[#111] px-5 py-2.5 rounded-full text-[14px] font-medium shadow-sm flex items-center gap-2"
            >
              <RefreshCcw className={"w-4 h-4 " + (loading ? 'animate-spin' : '')} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-[#18563e] text-white hover:bg-[#11402e] transition-colors px-5 py-2.5 rounded-full text-[14px] font-medium shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Join Class
            </button>
          </div>
        </div>

        {(message || error) && (
          <div className={"p-4 rounded-2xl mb-6 flex items-start gap-3 " + (message ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800')}>
            <div className="text-[14px] font-medium">{message || error}</div>
          </div>
        )}

        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => navigate(`/student/classes/${cls.id}`)}
                className="text-left group rounded-[22px] p-5 bg-white border border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-[13px] bg-[#18563e]/10 text-[#18563e] flex items-center justify-center">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#f3f4f6] text-[#111] flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-[16px] font-semibold text-[#111] leading-tight line-clamp-2">{cls.name}</h4>
                <p className="text-[13px] text-[#666] mt-2">Instructor: {cls.instructorName || 'Instructor'}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#18563e]">
                  <Plus className="w-3.5 h-3.5" /> View details
                </div>
              </button>
            ))}
          </div>

          {classes.length === 0 && (
            <div className="mt-5 bg-white rounded-[22px] border border-black/5 p-8 text-center text-[#666]">
              <p className="text-[14px] font-medium">No classes yet.</p>
              <p className="text-[12px] mt-1">Join your first class using the code provided by your instructor.</p>
            </div>
          )}
        </div>

        <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join a Class">
          <p className="text-[13px] text-[#666]">Enter the instructor join code.</p>
          <form onSubmit={handleJoin} className="mt-4 space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Join code"
              className="w-full bg-[#f3f4f6] border-none rounded-[12px] px-4 py-3 text-[14px] font-mono tracking-widest outline-none focus:ring-2 focus:ring-[#18563e]/20"
            />
            <button
              type="submit"
              disabled={!joinCode || loading}
              className="w-full bg-[#18563e] text-white rounded-[12px] py-3 text-[14px] font-medium hover:bg-[#11402e] transition-colors disabled:opacity-50"
            >
              Join Class
            </button>
          </form>
        </Modal>
      </div>
    </div>
  )
}
