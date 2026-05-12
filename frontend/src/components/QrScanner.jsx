import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff } from 'lucide-react'

export default function QrScanner({ onCode }) {
  const [isScanning, setIsScanning] = useState(false)
  const [isDecodingFile, setIsDecodingFile] = useState(false)
  const [error, setError] = useState('')
  const elementId = useId().replace(/:/g, '')
  const fileInputRef = useRef(null)

  const normalizeCode = (decodedText) => {
    const normalized = decodedText.trim()
    const match = normalized.match(/session=([A-Z0-9]+)/i)
    return (match ? match[1] : normalized).toUpperCase()
  }

  useEffect(() => {
    let scanner
    if (isScanning) {
      scanner = new Html5Qrcode(elementId)
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            onCode(normalizeCode(decodedText))
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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const mimeType = file.type.toLowerCase()
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
      setError('Please upload a PNG or JPG file.')
      event.target.value = ''
      return
    }

    setError('')
    setIsDecodingFile(true)
    if (isScanning) {
      setIsScanning(false)
    }

    const scanner = new Html5Qrcode(elementId)
    try {
      const decodedText = await scanner.scanFile(file, true)
      onCode(normalizeCode(decodedText))
    } catch {
      setError('Could not read a QR code from that image.')
    } finally {
      setIsDecodingFile(false)
      event.target.value = ''
      if (scanner.clear) {
        scanner.clear().catch(() => {})
      }
    }
  }

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
      <div className="mt-4 flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDecodingFile}
          className="flex items-center gap-2 rounded-[14px] bg-white border border-[#e2ede7] px-5 py-2.5 text-[12px] font-semibold text-[#18563e] shadow-[0_3px_12px_rgba(24,86,62,0.08)] transition-all hover:bg-[#f0f5f2] active:translate-y-[1px] disabled:opacity-60"
        >
          {isDecodingFile ? 'Reading image...' : 'Upload QR Image'}
        </button>
        <p className="text-[11px] text-slate-500">PNG or JPG only</p>
      </div>
      <div className={isScanning ? 'mt-6 flex w-full justify-center' : 'hidden'}>
        <div id={elementId} className="w-full max-w-[240px] overflow-hidden rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[4px] border-white bg-slate-50" />
      </div>
    </div>
  )
}
