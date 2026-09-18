import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

type Time = { h: number; m: number; ampm: 'AM' | 'PM' }

type Props = {
  value: string // Format: "HH:MM AM" or "HH:MM PM"
  onChange: (val: string) => void
  label?: string
}

function parseTime(val: string): Time {
  const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match) {
    return {
      h: parseInt(match[1], 10),
      m: parseInt(match[2], 10),
      ampm: match[3].toUpperCase() as 'AM' | 'PM',
    }
  }
  return { h: 9, m: 0, ampm: 'AM' }
}

function formatTime(t: Time) {
  return `${t.h}:${t.m.toString().padStart(2, '0')} ${t.ampm}`
}

export function TimePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [tempTime, setTempTime] = useState<Time>(parseTime(value))
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync tempTime when opened
  useEffect(() => {
    if (open) setTempTime(parseTime(value))
  }, [open, value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const incH = () => setTempTime(t => ({ ...t, h: t.h === 12 ? 1 : t.h + 1 }))
  const decH = () => setTempTime(t => ({ ...t, h: t.h === 1 ? 12 : t.h - 1 }))
  
  // Step by 5 minutes for convenience, or 1 minute? Let's do 5.
  const incM = () => setTempTime(t => ({ ...t, m: t.m >= 55 ? 0 : t.m + 5 }))
  const decM = () => setTempTime(t => ({ ...t, m: t.m <= 0 ? 55 : t.m - 5 }))

  const handleOk = () => {
    onChange(formatTime(tempTime))
    setOpen(false)
  }

  const btnClass = "w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
  
  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="text-xs font-medium mb-1.5 block text-gray-500">{label}</label>}
      
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-left bg-white text-gray-900 hover:border-gray-300 transition-colors"
      >
        {value}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-[60] bg-white rounded-xl border border-gray-200 shadow-xl p-4 w-[240px]">
          <h3 className="text-center font-semibold text-sm mb-4 text-gray-800">Time</h3>
          <div className="border-b border-gray-100 mb-4 -mx-4" />

          {/* Spinners */}
          <div className="flex justify-center gap-4 mb-5">
            {/* Hour */}
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={incH} className={btnClass}><ChevronUp size={16} /></button>
              <div className="text-center">
                <span className="text-xl font-bold text-gray-900 block">{tempTime.h}</span>
                <span className="text-[10px] text-gray-400">hour</span>
              </div>
              <button type="button" onClick={decH} className={btnClass}><ChevronDown size={16} /></button>
            </div>

            {/* Minute */}
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={incM} className={btnClass}><ChevronUp size={16} /></button>
              <div className="text-center">
                <span className="text-xl font-bold text-gray-900 block">{tempTime.m.toString().padStart(2, '0')}</span>
                <span className="text-[10px] text-gray-400">min</span>
              </div>
              <button type="button" onClick={decM} className={btnClass}><ChevronDown size={16} /></button>
            </div>
          </div>

          {/* AM/PM Toggle */}
          <div className="flex justify-center mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setTempTime(t => ({ ...t, ampm: 'AM' }))}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tempTime.ampm === 'AM' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setTempTime(t => ({ ...t, ampm: 'PM' }))}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tempTime.ampm === 'PM' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Time display */}
          <div className="text-center text-xs font-medium text-gray-600 mb-4">
            {formatTime(tempTime)}
          </div>

          <div className="border-b border-gray-100 mb-4 -mx-4" />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleOk}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#2563eb' }} // blue matching the screenshot
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
