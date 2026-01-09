"use client"

import { useEffect } from "react"
import Button from "./Button"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "small" | "medium" | "large" | "xlarge"
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "medium",
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    small: "sm:max-w-md",
    medium: "sm:max-w-lg",
    large: "sm:max-w-2xl",
    xlarge: "sm:max-w-4xl",
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 motion-safe:animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`relative bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full ${sizeClasses[size]} p-4 sm:p-6 z-10 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto motion-safe:animate-scale-in`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-3 border-b sm:border-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-micro p-2 -mr-2 rounded-lg hover:bg-gray-100"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="mb-4 sm:mb-6 text-sm sm:text-base">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end sticky bottom-0 bg-white pt-3 border-t sm:border-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}