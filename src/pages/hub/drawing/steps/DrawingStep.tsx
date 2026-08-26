import { useRef, useState } from 'react'
import { Button } from '../../../../components/Button'
import { SharedDrawingCanvas, type DrawingCanvasHandle } from '../../../../components/drawing/SharedDrawingCanvas'

interface DrawingStepProps {
  prompt: string | null
  onDone: (dataUrl: string) => void
}

export function DrawingStep({ prompt, onDone }: DrawingStepProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const [hasStrokes, setHasStrokes] = useState(false)

  function handleDone() {
    const dataUrl = canvasRef.current?.exportPng()
    if (!dataUrl) return
    onDone(dataUrl)
  }

  return (
    <div className="flex flex-col gap-3 px-5 pb-6">
      <p className="text-center text-sm font-medium text-ink-soft">
        {prompt ? `"${prompt}"` : '✏️ วาดอิสระ'}
      </p>

      <SharedDrawingCanvas ref={canvasRef} onStrokesChange={setHasStrokes} />

      <Button fullWidth disabled={!hasStrokes} onClick={handleDone} className="mt-1">
        วาดเสร็จแล้ว — ส่งต่อให้คนฟัง →
      </Button>
    </div>
  )
}
