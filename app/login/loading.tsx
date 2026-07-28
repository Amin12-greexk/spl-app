export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 animate-pulse">
        {/* Logo placeholder */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-200/60 rounded-full"></div>
        </div>
        {/* Title placeholder */}
        <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded mx-auto mb-8"></div>
        {/* Email input placeholder */}
        <div className="space-y-4">
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-11 w-full bg-gray-100 rounded-lg"></div>
          </div>
          {/* Password input placeholder */}
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
            <div className="h-11 w-full bg-gray-100 rounded-lg"></div>
          </div>
          {/* Button placeholder */}
          <div className="h-11 w-full bg-green-200/60 rounded-lg mt-6"></div>
        </div>
      </div>
    </div>
  )
}
