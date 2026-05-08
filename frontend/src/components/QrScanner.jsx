import { useEffect, useId, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff } from 'lucide-react'

export default function QrScanner({ onCode }) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const elementId = useId().replace(/:/g, '')

  useEffect(() => {
    let scanner
    if (isScanning) {
      scanner = new Html5Qrcode(elementId)
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            const normalized = decodedText.trim()
            const match = normalized.match(/session=([A-Z0-9]+)/i)
            onCode(match ? match[1].toUpperCase() : normalized.toUpperCase())
            setIsScanning(false)
          },
          () => {},
        )
        .catch(() => {
          setError('Could not access camera. Use manual code entry instead.')
          setIsScanning(false)
        })
    }

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {})
        scanner.clear().catch(() => {})
      }
    }
  }, [isScanning, elementId, onCode])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center py-2">
      <div className="flex w-full flex-col items-center justify-center">
        {!isScanning && (
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[24px] bg-[#f0f5f2] border border-[#e2ede7]">
            <Camera className="h-8 w-8 text-[#18563e] opacity-80" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsScanning((prev) => !prev)}
          className="flex items-center gap-2 rounded-[14px] bg-[#18563e] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(24,86,62,0.2)] transition-all hover:bg-[#11402e] hover:shadow-[0_4px_12px_rgba(17,64,46,0.3)] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {isScanning ? (
             <>
               <CameraOff className="h-4 w-4" />
               Stop Scanner
             </>
          ) : (
             <>
               <Camera className="h-4 w-4" />
               Scan with Camera
             </>
          )}
        </button>
      </div>
      {error && <p className="mt-4 text-center text-[12px] font-medium text-rose-500 bg-rose-50 px-3 py-2 rounded-[8px]">{error}</p>}
      <div className={isScanning ? 'mt-6 flex w-full justify-center' : 'hidden'}>
        <div id={elementId} className="w-full max-w-[240px] overflow-hidden rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[4px] border-white bg-slate-50" />
      </div>
    </div>
  )
}
