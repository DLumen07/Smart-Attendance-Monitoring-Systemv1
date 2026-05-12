import { motion } from 'framer-motion'

export default function AuthLayout({ children, title, subtitle, wide = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#ebeae7] relative overflow-hidden">
      
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1c1c1c]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1c1c1c]/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`w-full relative z-10 ${wide ? 'max-w-[1120px]' : 'max-w-[420px]'}`}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-[1.25rem] shadow-xl flex items-center justify-center ring-4 ring-white/50 overflow-hidden">
              <img src="/logo.png" alt="Smart Attendance" className="w-full h-full object-contain p-1" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#1c1c1c] mb-2 font-['Space_Grotesk'] tracking-tight">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm font-medium">{subtitle}</p>}
        </div>

        <div className={`rounded-[2rem] bg-white border border-slate-200/60 shadow-sm ${wide ? 'p-6 sm:p-8 lg:p-10' : 'p-8'}`}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
