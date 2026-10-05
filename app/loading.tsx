import Image from "next/image"

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 relative">
          <Image
            src="/logo.png"
            alt="Loading..."
            fill
            sizes="64px"
            className="object-contain drop-shadow-md animate-pulse"
            priority
          />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600"></div>
        <p className="text-green-800 text-sm font-medium">Memuat aplikasi...</p>
      </div>
    </div>
  )
}
