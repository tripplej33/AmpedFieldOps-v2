import React, { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { useGeolocation } from '@/hooks/useGeolocation'

interface PhotoMarkupCanvasModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  projectName?: string
  onSaveMarkedPhoto: (dataUrl: string, caption: string) => Promise<void>
}

type ToolMode = 'pen' | 'arrow' | 'circle' | 'text' | 'stamp'

export default function PhotoMarkupCanvasModal({
  isOpen,
  onClose,
  imageSrc,
  projectName = 'Project Site',
  onSaveMarkedPhoto,
}: PhotoMarkupCanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [tool, setTool] = useState<ToolMode>('pen')
  const [color, setColor] = useState('#ef4444') // Red default
  const [lineWidth, setLineWidth] = useState(3)
  const [caption, setCaption] = useState('')
  const [selectedStamp, setSelectedStamp] = useState('⚠️ HAZARD')
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [snapshot, setSnapshot] = useState<ImageData | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const { coordinates, getCurrentLocation } = useGeolocation()

  useEffect(() => {
    if (isOpen) {
      getCurrentLocation({ timeout: 5000, enableHighAccuracy: true }).catch(() => {})
    }
  }, [isOpen, getCurrentLocation])

  useEffect(() => {
    if (!isOpen || !imageSrc) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Scale to fit container while preserving aspect ratio (max 1000px width)
      const maxW = 900
      const scale = Math.min(1, maxW / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setImageLoaded(true)
    }
    img.src = imageSrc
  }, [isOpen, imageSrc])

  if (!isOpen) return null

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      }
    }
    const me = e as React.MouseEvent
    return {
      x: (me.clientX - rect.left) * (canvas.width / rect.width),
      y: (me.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCanvasCoords(e)
    setIsDrawing(true)
    setStartPos(coords)
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height))

    if (tool === 'pen') {
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    } else if (tool === 'stamp') {
      // Draw badge stamp
      ctx.fillStyle = color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.font = 'bold 16px sans-serif'
      const textWidth = ctx.measureText(selectedStamp).width
      ctx.fillRect(coords.x - 6, coords.y - 20, textWidth + 12, 28)
      ctx.strokeRect(coords.x - 6, coords.y - 20, textWidth + 12, 28)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(selectedStamp, coords.x, coords.y)
      setIsDrawing(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPos) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCanvasCoords(e)

    if (tool === 'pen') {
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    } else if (tool === 'circle' && snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      ctx.beginPath()
      const radius = Math.sqrt(Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2))
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.stroke()
    } else if (tool === 'arrow' && snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      // Draw arrow line
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.stroke()

      // Arrow head
      const headlen = 16
      const angle = Math.atan2(coords.y - startPos.y, coords.x - startPos.x)
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      ctx.lineTo(coords.x - headlen * Math.cos(angle - Math.PI / 6), coords.y - headlen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(coords.x - headlen * Math.cos(angle + Math.PI / 6), coords.y - headlen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setStartPos(null)
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Burn Watermark (GPS, Project & Timestamp) at the bottom
    const dateStr = new Date().toLocaleString()
    const gpsStr = coordinates ? `GPS: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : ''
    const watermarkText = `${projectName} • ${dateStr} ${gpsStr ? `• ${gpsStr}` : ''}`

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30)

    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 12px monospace'
    ctx.fillText(watermarkText, 12, canvas.height - 10)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

    try {
      setSaving(true)
      await onSaveMarkedPhoto(dataUrl, caption)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-5 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header & Tools Bar */}
        <div className="flex items-center justify-between border-b border-border-dark pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">draw</span>
            <h3 className="text-sm font-bold text-white font-display">Photo Markup & Defect Annotator</h3>
          </div>

          {/* Tools Selector */}
          <div className="flex items-center gap-1 bg-surface-dark border border-border-dark rounded-xl p-1">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                tool === 'pen' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
              title="Freehand Pen"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Pen
            </button>
            <button
              type="button"
              onClick={() => setTool('arrow')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                tool === 'arrow' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
              title="Arrow Pointer"
            >
              <span className="material-symbols-outlined text-base">trending_flat</span>
              Arrow
            </button>
            <button
              type="button"
              onClick={() => setTool('circle')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                tool === 'circle' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
              title="Circle Defect"
            >
              <span className="material-symbols-outlined text-base">radio_button_unchecked</span>
              Circle
            </button>
            <button
              type="button"
              onClick={() => setTool('stamp')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                tool === 'stamp' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
              title="Stamp Badge"
            >
              <span className="material-symbols-outlined text-base">flag</span>
              Stickers
            </button>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center gap-1.5 bg-surface-dark border border-border-dark rounded-xl p-1">
            {['#ef4444', '#f59e0b', '#06b6d4', '#10b981', '#ffffff'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-lg transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 bg-surface-dark border border-border-dark rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setLineWidth(2)}
              className={`px-2 py-0.5 rounded font-mono text-[10px] ${lineWidth === 2 ? 'bg-primary text-black font-bold' : 'text-text-muted hover:text-white'}`}
            >
              2px
            </button>
            <button
              type="button"
              onClick={() => setLineWidth(4)}
              className={`px-2 py-0.5 rounded font-mono text-[10px] ${lineWidth === 4 ? 'bg-primary text-black font-bold' : 'text-text-muted hover:text-white'}`}
            >
              4px
            </button>
            <button
              type="button"
              onClick={() => setLineWidth(8)}
              className={`px-2 py-0.5 rounded font-mono text-[10px] ${lineWidth === 8 ? 'bg-primary text-black font-bold' : 'text-text-muted hover:text-white'}`}
            >
              8px
            </button>
          </div>

          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Sticker selector dropdown if in stamp mode */}
        {tool === 'stamp' && (
          <div className="flex items-center gap-2 bg-background-dark p-2 rounded-xl border border-border-dark text-xs flex-wrap">
            <span className="text-text-muted text-[11px] font-bold">Select Badge:</span>
            {['⚠️ HAZARD', '⚡ HIGH VOLTAGE', '🔧 REPAIR', '✅ PASSED', '🔍 INSPECT'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStamp(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                  selectedStamp === st
                    ? 'bg-primary text-black border-primary'
                    : 'bg-surface-dark text-white border-border-dark hover:border-text-muted'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/40 rounded-xl p-2 min-h-[300px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="rounded-lg shadow-2xl cursor-crosshair touch-none max-w-full block"
          />
        </div>

        {/* Caption & Footer */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-dark flex-wrap">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="flex-1 min-w-[200px] h-9 px-3 bg-surface-dark border border-border-dark rounded-xl text-white text-xs"
            placeholder="Add a caption or notes for this marked-up photo..."
          />

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !imageLoaded}
              className="text-xs font-bold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {saving ? 'Saving...' : 'Save Marked Photo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
