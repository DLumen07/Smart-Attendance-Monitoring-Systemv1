import { useEffect, useId, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

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
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsScanning((prev) => !prev)}
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {isScanning ? 'Stop scanner' : 'Scan QR with camera'}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div id={elementId} className={isScanning ? 'w-full max-w-xs' : 'hidden'} />
    </div>
  )
}
