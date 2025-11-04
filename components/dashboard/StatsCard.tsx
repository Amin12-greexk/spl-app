interface StatsCardProps {
  title: string
  value: string | number
  icon: string
  color?: "blue" | "green" | "yellow" | "red" | "purple"
  subtitle?: string
}

export default function StatsCard({
  title,
  value,
  icon,
  color = "blue",
  subtitle,
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100",
      border: "border-blue-200",
      iconBg: "bg-blue-600",
      iconText: "text-white",
      valueBg: "bg-blue-600",
      valueText: "text-white"
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-green-100",
      border: "border-green-200",
      iconBg: "bg-green-600",
      iconText: "text-white",
      valueBg: "bg-green-600",
      valueText: "text-white"
    },
    yellow: {
      bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
      border: "border-yellow-200",
      iconBg: "bg-yellow-600",
      iconText: "text-white",
      valueBg: "bg-yellow-600",
      valueText: "text-white"
    },
    red: {
      bg: "bg-gradient-to-br from-red-50 to-red-100",
      border: "border-red-200",
      iconBg: "bg-red-600",
      iconText: "text-white",
      valueBg: "bg-red-600",
      valueText: "text-white"
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100",
      border: "border-purple-200",
      iconBg: "bg-purple-600",
      iconText: "text-white",
      valueBg: "bg-purple-600",
      valueText: "text-white"
    },
  }

  const colorClass = colorClasses[color]

  return (
    <div className={`${colorClass.bg} ${colorClass.border} border-2 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 ${colorClass.iconBg} rounded-lg flex items-center justify-center text-2xl shadow-md`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className={`inline-flex items-center justify-center px-4 py-2 ${colorClass.valueBg} ${colorClass.valueText} rounded-lg font-bold text-2xl shadow-md min-w-[60px]`}>
          {value}
        </div>
        
        {/* Decorative element */}
        <div className="flex space-x-1">
          <div className={`w-2 h-2 ${colorClass.iconBg} rounded-full opacity-20`}></div>
          <div className={`w-2 h-2 ${colorClass.iconBg} rounded-full opacity-40`}></div>
          <div className={`w-2 h-2 ${colorClass.iconBg} rounded-full opacity-60`}></div>
        </div>
      </div>
    </div>
  )
}