"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  minuteStep?: number
  hourPlaceholder?: string
  minutePlaceholder?: string
  showWib?: boolean
  hint?: string
  containerClassName?: string
  selectClassName?: string
}

const pad2 = (value: number) => String(value).padStart(2, "0")

export default function TimePicker({
  label,
  value,
  onChange,
  disabled,
  required,
  minuteStep = 1,
  hourPlaceholder = "HH",
  minutePlaceholder = "MM",
  showWib = false,
  hint,
  containerClassName,
  selectClassName,
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const pickerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const safeStep = minuteStep > 0 && minuteStep < 60 ? minuteStep : 1

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, index) => pad2(index)),
    []
  )

  const minuteOptions = useMemo(() => {
    const count = Math.floor(60 / safeStep)
    return Array.from({ length: count }, (_, index) => pad2(index * safeStep))
  }, [safeStep])

  const isValidValue =
    typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
  const [hour, minute] = isValidValue ? value.split(":") : ["", ""]

  // Update input value when value prop changes
  useEffect(() => {
    if (isValidValue) {
      setInputValue(value)
    } else {
      setInputValue("")
    }
  }, [value, isValidValue])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showPicker])

  const handleHourClick = (nextHour: string) => {
    const nextMinute = minute || minuteOptions[0]
    onChange(`${nextHour}:${nextMinute}`)
  }

  const handleMinuteClick = (nextMinute: string) => {
    const nextHour = hour || hourOptions[0]
    onChange(`${nextHour}:${nextMinute}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setInputValue(input)

    // Auto-format and validate
    if (/^\d{2}:\d{2}$/.test(input)) {
      const [h, m] = input.split(":")
      const hourNum = parseInt(h, 10)
      const minuteNum = parseInt(m, 10)

      if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
        onChange(input)
      }
    }
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setShowPicker(true)
    }
  }

  const handleClear = () => {
    onChange("")
    setInputValue("")
    setShowPicker(false)
  }

  const formatDisplayValue = () => {
    if (isValidValue) {
      return value
    }
    return ""
  }

  return (
    <div className="w-full relative" ref={pickerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Field */}
      <div className={cn("relative", containerClassName)}>
        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={`${hourPlaceholder}:${minutePlaceholder}`}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
            required={required}
            maxLength={5}
            className={cn(
              "flex-1 h-12 w-full rounded-xl border-2 border-gray-200 bg-white pl-12 pr-10 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 motion-safe:transition-all motion-safe:duration-200 font-mono tracking-wider",
              selectClassName
            )}
          />

          {/* Clock Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Clear Button */}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-micro group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {showWib && (
            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 pointer-events-none">
              WIB
            </span>
          )}
        </div>

        {/* Dropdown Picker */}
        {showPicker && !disabled && (
          <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden motion-safe:animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs font-medium opacity-90">Pilih Waktu</p>
                <p className="text-lg font-bold font-mono tracking-wider">
                  {formatDisplayValue() || "--:--"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="p-2 rounded-lg hover:bg-white/20 transition-micro"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Time Selection */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Hours */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                    </svg>
                    Jam
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {hourOptions.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourClick(h)}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm font-mono transition-micro hover:bg-green-50 hover:text-green-700",
                          hour === h
                            ? "bg-green-600 text-white font-bold hover:bg-green-700 hover:text-white"
                            : "text-gray-700"
                        )}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Menit
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {minuteOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinuteClick(m)}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm font-mono transition-micro hover:bg-green-50 hover:text-green-700",
                          minute === m
                            ? "bg-green-600 text-white font-bold hover:bg-green-700 hover:text-white"
                            : "text-gray-700"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Selection */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Waktu Cepat</p>
                <div className="grid grid-cols-4 gap-2">
                  {["08:00", "12:00", "17:00", "20:00"].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        onChange(time)
                        setShowPicker(false)
                      }}
                      className="px-3 py-2 text-xs font-mono font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-green-600 hover:text-white transition-micro"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-micro"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-micro shadow-sm hover:shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hint && (
        <p className="mt-2 text-xs text-gray-500 flex items-start gap-1">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {hint}
        </p>
      )}
    </div>
  )
}
