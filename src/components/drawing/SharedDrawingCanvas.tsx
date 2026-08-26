import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export interface DrawingCanvasHandle {
  exportPng: () => string
  clear: () => void
}

interface Stroke {
  color: string
  size: number
  erase: boolean
  points: [number, number][]
}

const COLOR_PRESETS = ['#3a3245', '#8b5fe8', '#ff9fc0', '#2f8f65', '#f2a94a', '#e0523f', '#3b82c4']

const SIZE_PRESETS = [
  { id: 'sm', label: 'เล็ก', value: 3 },
  { id: 'md', label: 'กลาง', value: 7 },
  { id: 'lg', label: 'ใหญ่', value: 14 },
]

interface SharedDrawingCanvasProps {
  className?: string
  onStrokesChange?: (hasStrokes: boolean) => void
}

export const SharedDrawingCanvas = forwardRef<DrawingCanvasHandle, SharedDrawingCanvasProps>(
  function SharedDrawingCanvas({ className = '', onStrokesChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const strokesRef = useRef<Stroke[]>([])
    const redoRef = useRef<Stroke[]>([])
    const drawingRef = useRef<Stroke | null>(null)
    const [color, setColor] = useState(COLOR_PRESETS[0])
    const [size, setSize] = useState(SIZE_PRESETS[1].value)
    const [mode, setMode] = useState<'pen' | 'eraser'>('pen')
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const allStrokes = drawingRef.current ? [...strokesRef.current, drawingRef.current] : strokesRef.current
      for (const stroke of allStrokes) {
        if (stroke.points.length === 0) continue
        ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const [x0, y0] = stroke.points[0]
        ctx.moveTo(x0 * w, y0 * h)
        if (stroke.points.length === 1) {
          ctx.lineTo(x0 * w + 0.01, y0 * h + 0.01)
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            const [x, y] = stroke.points[i]
            ctx.lineTo(x * w, y * h)
          }
        }
        ctx.stroke()
      }
    }, [])

    useEffect(() => {
      redraw()
      const container = containerRef.current
      if (!container || typeof ResizeObserver === 'undefined') return
      const observer = new ResizeObserver(() => redraw())
      observer.observe(container)
      return () => observer.disconnect()
    }, [redraw])

    function getPoint(e: ReactPointerEvent<HTMLCanvasElement>): [number, number] {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = rect.width ? (e.clientX - rect.left) / rect.width : 0
      const y = rect.height ? (e.clientY - rect.top) / rect.height : 0
      return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]
    }

    function resetStrokes() {
      strokesRef.current = []
      redoRef.current = []
      drawingRef.current = null
      setCanUndo(false)
      setCanRedo(false)
      onStrokesChange?.(false)
      redraw()
    }

    function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
      e.currentTarget.setPointerCapture(e.pointerId)
      drawingRef.current = { color, size, erase: mode === 'eraser', points: [getPoint(e)] }
      redraw()
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) return
      drawingRef.current.points.push(getPoint(e))
      redraw()
    }

    function finishStroke() {
      if (!drawingRef.current) return
      if (drawingRef.current.points.length > 0) {
        strokesRef.current = [...strokesRef.current, drawingRef.current]
        redoRef.current = []
        setCanUndo(true)
        setCanRedo(false)
        onStrokesChange?.(true)
      }
      drawingRef.current = null
      redraw()
    }

    useImperativeHandle(ref, () => ({
      exportPng: () => canvasRef.current?.toDataURL('image/png') ?? '',
      clear: resetStrokes,
    }))

    function handleUndo() {
      if (strokesRef.current.length === 0) return
      const next = [...strokesRef.current]
      const popped = next.pop()!
      strokesRef.current = next
      redoRef.current = [...redoRef.current, popped]
      setCanUndo(next.length > 0)
      setCanRedo(true)
      onStrokesChange?.(next.length > 0)
      redraw()
    }

    function handleRedo() {
      if (redoRef.current.length === 0) return
      const next = [...redoRef.current]
      const popped = next.pop()!
      redoRef.current = next
      strokesRef.current = [...strokesRef.current, popped]
      setCanRedo(next.length > 0)
      setCanUndo(true)
      onStrokesChange?.(true)
      redraw()
    }

    return (
      <div className={className}>
        <div
          ref={containerRef}
          className="relative aspect-[4/5] w-full touch-none overflow-hidden rounded-3xl bg-white shadow-card"
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerLeave={finishStroke}
            onPointerCancel={finishStroke}
          />
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c)
                  setMode('pen')
                }}
                aria-label={`สี ${c}`}
                className={`h-8 w-8 shrink-0 rounded-full border-2 transition ${
                  mode === 'pen' && color === c ? 'scale-110 border-lavender-500' : 'border-white'
                }`}
                style={{ backgroundColor: c, boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
              />
            ))}
            <label className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-lavender-200">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value)
                  setMode('pen')
                }}
                className="absolute -left-1 -top-1 h-10 w-10 cursor-pointer"
                aria-label="เลือกสีเอง"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SIZE_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  size === s.value
                    ? 'border-lavender-400 bg-lavender-50 text-lavender-600'
                    : 'border-lavender-100 bg-white text-ink-soft'
                }`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: Math.min(s.value, 14), height: Math.min(s.value, 14) }}
                  aria-hidden
                />
                {s.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setMode('eraser')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                mode === 'eraser'
                  ? 'border-lavender-400 bg-lavender-50 text-lavender-600'
                  : 'border-lavender-100 bg-white text-ink-soft'
              }`}
            >
              🧼 ยางลบ
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="ย้อนกลับ"
                className="rounded-full border border-lavender-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft disabled:opacity-40"
              >
                ↩️
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="ทำซ้ำ"
                className="rounded-full border border-lavender-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft disabled:opacity-40"
              >
                ↪️
              </button>
              <button
                type="button"
                onClick={resetStrokes}
                className="rounded-full border border-pink-glow bg-white px-3 py-1.5 text-xs font-medium text-pink-text"
              >
                ล้าง
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  },
)
