import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline"
  size?: "sm" | "md" | "lg"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-xl font-medium motion-safe:transition-all motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95"

    const variants = {
      primary: "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl focus-visible:ring-green-600 motion-safe:transform motion-safe:hover:scale-[1.02]",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 border border-gray-200 motion-safe:hover:shadow-md",
      danger: "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl focus-visible:ring-red-600 motion-safe:transform motion-safe:hover:scale-[1.02]",
      ghost: "hover:bg-green-50 hover:text-green-700 focus-visible:ring-green-500",
      outline: "border-2 border-green-600 text-green-600 hover:bg-green-50 focus-visible:ring-green-500 motion-safe:hover:border-green-700",
    }
    
    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6 py-3",
      lg: "h-12 px-8 text-lg",
    }

    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export default Button