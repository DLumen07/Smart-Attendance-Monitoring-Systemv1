import { useState } from "react"
import { Briefcase, Plus, Users, ArrowUpRight, Copy, Settings, X, PlusCircle, Trash2 } from "lucide-react"
import { apiRequest } from "../../api/client"
import toast from "react-hot-toast"

export default function InstructorClasses({ classes, handleSelectClass, setIsCreateClassModalOpen, loadClasses }) {
   const [editingClass, setEditingClass] = useState(null)
   const [editName, setEditName] = useState("")
   const [editSchedules, setEditSchedules] = useState([])
   const [isSaving, setIsSaving] = useState(false)

   const openEditModal = (cls, e) => {
      e.stopPropagation()
      setEditingClass(cls)
      setEditName(cls.name)
      setEditSchedules(cls.schedules?.length > 0 
         ? JSON.parse(JSON.stringify(cls.schedules)) 
         : [{ dayOfWeek: "Monday", startTime: "09:00", endTime: "10:30" }])
   }

   const handleAddEditSchedule = () => {
      setEditSchedules([...editSchedules, { dayOfWeek: "Monday", startTime: "09:00", endTime: "10:30" }])
   }

   const handleRemoveEditSchedule = (index) => {
      setEditSchedules(editSchedules.filter((_, i) => i !== index))
   }

   const handleEditScheduleChange = (index, field, value) => {
      const newSchedules = [...editSchedules]
      newSchedules[index][field] = value
      setEditSchedules(newSchedules)
   }

   const saveClassSettings = async () => {
      if (!editName.trim()) {
         toast.error("Class name is required")
         return
      }

      setIsSaving(true)
      try {
         await apiRequest(`/instructor/classes/${editingClass.id}`, {
            method: "PUT",
            body: JSON.stringify({
               name: editName.trim(),
               schedules: editSchedules
            })
         })
         toast.success("Class updated successfully")
         setEditingClass(null)
         if (loadClasses) loadClasses()
      } catch (err) {
         toast.error(err.message || "Failed to update class")
      } finally {
         setIsSaving(false)
      }
   }

   return (
      <div className="min-h-[100vh] bg-transparent w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 transition-colors animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row items-center justify-between mb-10 pt-2 pb-4">
            <div className="flex items-center gap-4">
               <Briefcase className="w-10 h-10 text-[#5c7c6d] shrink-0" />
               <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">Class Directory</h1>
                  <p className="text-sm text-slate-500 font-medium mt-1">Manage and access all your active class modules</p>
               </div>
            </div>
            <button onClick={() => setIsCreateClassModalOpen(true)} className="mt-6 md:mt-0 h-12 px-6 rounded-full bg-[#1c1c1c] text-white flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-colors font-bold text-[13px] tracking-wide active:scale-95">
               <Plus className="w-4 h-4" />
               <span>New Class</span>
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {classes.map((cls) => {
               const primarySchedule = cls.schedules && cls.schedules.length > 0 ? cls.schedules[0] : null
               const scheduleLabel = primarySchedule ? `${primarySchedule.dayOfWeek.slice(0, 3)} ${primarySchedule.startTime}` : "Unscheduled"
               
               return (
                  <div 
                     key={cls.id} 
                     onClick={() => handleSelectClass(cls.id)}
                     className="group cursor-pointer rounded-[24px] p-6 bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                  >
                     <div className="flex items-start justify-between mb-4">
                        <span className="px-3 py-1.5 bg-[#5c7c6d] text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                           {scheduleLabel}
                        </span>
                        <div className="flex items-center gap-2">
                           <div 
                              onClick={(e) => openEditModal(cls, e)}
                              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#1c1c1c] hover:text-white transition-colors shadow-sm"
                              title="Class Settings"
                           >
                              <Settings className="w-3.5 h-3.5" />
                           </div>
                           <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#5c7c6d]/10 group-hover:text-[#5c7c6d] transition-colors">
                              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 mt-2">
                        <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-1">Module</p>
                        <h3 className="text-xl font-bold tracking-tight text-[#1c1c1c] leading-tight line-clamp-2">{cls.name}</h3>
                     </div>

                     <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-1.5">
                           <Users className="w-4 h-4 text-slate-400" />
                           <span className="text-sm font-semibold text-slate-500">{cls.studentCount || 0}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(cls.joinCode); toast.success("Code copied!") }}>
                           <span className="text-[12px] font-bold text-slate-400 font-mono tracking-wider">{cls.joinCode}</span>
                           <Copy className="w-3.5 h-3.5 text-slate-300 hover:text-slate-600 transition-colors" />
                        </div>
                     </div>
                  </div>
               )
            })}

            {classes.length === 0 && (
               <div className="col-span-full h-64 border-2 border-dashed border-slate-200 rounded-[24px] flex flex-col items-center justify-center text-slate-400">
                  <Briefcase className="w-8 h-8 mb-3 opacity-50" />
                  <p className="font-semibold text-sm">No classes found.</p>
                  <p className="text-xs mt-1 opacity-70">Create a new class to get started.</p>
               </div>
            )}
         </div>

                  {/* Edit Class Modal */}
         {editingClass && (
            <div className="fixed inset-0 z-50 bg-[#1c1c1c]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-[20px] w-full max-w-[480px] shadow-[0_24px_60px_rgba(0,0,0,0.1)] overflow-hidden scale-in zoom-in-95 duration-300">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
                     <h2 className="text-[16px] font-bold text-[#1c1c1c]">Class Settings</h2>
                     <button onClick={() => setEditingClass(null)} className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <X className="w-4 h-4" />
                     </button>
                  </div>
                  
                  <div className="p-6 space-y-5">
                     <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Class Name</label>
                        <input 
                           type="text" 
                           value={editName}
                           onChange={(e) => setEditName(e.target.value)}
                           className="w-full h-10 bg-slate-50/50 border border-slate-200 rounded-xl px-3 text-[14px] font-semibold text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#5c7c6d]/20 focus:border-[#5c7c6d] transition-all"
                           placeholder="e.g., Computer Science 101"
                        />
                     </div>

                     <div>
                        <div className="flex items-center justify-between mb-2">
                           <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">Class Schedules</label>
                           <button onClick={handleAddEditSchedule} className="text-[#5c7c6d] hover:text-[#4a6357] text-[12px] font-bold flex items-center gap-1 transition-colors bg-[#5c7c6d]/10 px-2.5 py-1 rounded-full">
                              <PlusCircle className="w-3.5 h-3.5" /> Add Slot
                           </button>
                        </div>
                        
                        <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                           {editSchedules.map((sched, idx) => (
                              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative group">
                                 <select 
                                    value={sched.dayOfWeek}
                                    onChange={(e) => handleEditScheduleChange(idx, "dayOfWeek", e.target.value)}
                                    className="flex-1 min-w-[100px] bg-slate-50/50 border-none rounded-lg h-9 px-2.5 text-[13px] font-semibold text-[#1c1c1c] focus:outline-none focus:ring-1 focus:ring-[#5c7c6d]/30 hover:bg-slate-100 transition-all cursor-pointer"
                                 >
                                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                                       <option key={day} value={day}>{day}</option>
                                    ))}
                                 </select>
                                 <div className="flex items-center gap-1.5 shrink-0 bg-slate-50/50 rounded-lg px-2 h-9 border border-transparent hover:border-slate-200 transition-all focus-within:border-slate-200 focus-within:ring-1 focus-within:ring-[#5c7c6d]/30">
                                    <input 
                                       type="time"
                                       value={sched.startTime}
                                       onChange={(e) => handleEditScheduleChange(idx, "startTime", e.target.value)}
                                       className="w-[72px] bg-transparent border-none text-[13px] font-semibold tracking-tight text-[#1c1c1c] focus:outline-none cursor-pointer"
                                    />
                                    <span className="text-slate-300 font-bold">-</span>
                                    <input 
                                       type="time"
                                       value={sched.endTime}
                                       onChange={(e) => handleEditScheduleChange(idx, "endTime", e.target.value)}
                                       className="w-[72px] bg-transparent border-none text-[13px] font-semibold tracking-tight text-[#1c1c1c] focus:outline-none cursor-pointer"
                                    />
                                 </div>
                                 <button 
                                    onClick={() => handleRemoveEditSchedule(idx)}
                                    className="w-8 h-8 shrink-0 bg-white border border-slate-100 hover:border-rose-200 hover:bg-rose-50 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                                    title="Remove Slot"
                                 >
                                    <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                           ))}
                           {editSchedules.length === 0 && (
                              <div className="py-5 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-[13px] font-medium bg-slate-50/50">
                                 No schedules found.
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="px-6 py-4 flex items-center justify-end gap-2 bg-slate-50/80 border-t border-slate-100">
                     <button 
                        onClick={() => setEditingClass(null)}
                        className="h-9 px-4 rounded-full text-slate-500 font-bold text-[12px] hover:bg-white hover:shadow-sm hover:text-slate-700 transition-all"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={saveClassSettings}
                        disabled={isSaving}
                        className="h-9 px-5 rounded-full bg-[#1c1c1c] text-white font-bold text-[12px] tracking-wide hover:bg-slate-800 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 flex items-center justify-center min-w-[100px]"
                     >
                        {isSaving ? (
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : "Save"}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}
