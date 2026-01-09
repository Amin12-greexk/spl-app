"use client"

import { useEffect, useRef, type PointerEvent } from "react"

interface SignaturePadProps {
  value?: string
  onChange: (dataUrl: string) => void
}

interface Point {
  x: number
  y: number
}

export default function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<Point | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const width = canvas.clientWidth || 600
    const height = canvas.clientHeight || 200

    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

    // Increased line width for better visibility on mobile
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0f766e"

    ctx.clearRect(0, 0, width, height)

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
      }
      img.src = value
    }
  }, [value])

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const point = getPoint(event)
    lastPoint.current = point

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    isDrawing.current = true
    canvas.setPointerCapture(event.pointerId)
  }

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !lastPoint.current) return

    const currentPoint = getPoint(event)

    // Use quadratic curves for smoother lines
    const midPoint = {
      x: (lastPoint.current.x + currentPoint.x) / 2,
      y: (lastPoint.current.y + currentPoint.y) / 2
    }

    ctx.quadraticCurveTo(
      lastPoint.current.x,
      lastPoint.current.y,
      midPoint.x,
      midPoint.y
    )
    ctx.stroke()

    lastPoint.current = currentPoint
  }

  const endDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    isDrawing.current = false
    lastPoint.current = null
    ctx.closePath()
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    onChange(canvas.toDataURL("image/png"))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange("")
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Tanda Tangan</p>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold text-gray-600 hover:text-red-600 transition-colors"
        >
          Bersihkan
        </button>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <canvas
          ref={canvasRef}
          className="w-full h-48 rounded-xl bg-white touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
          onPointerCancel={endDrawing}
        />
      </div>
      <p className="text-xs text-gray-500">
        Gunakan mouse atau sentuhan untuk menandatangani. Tanda tangan disimpan bersama pengajuan.
      </p>
    </div>
  )
}
