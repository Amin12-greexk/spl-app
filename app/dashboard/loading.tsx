export default function DashboardLoading() {
  return (
    <div className="w-full h-full animate-pulse space-y-6">
      {/* Welcome banner skeleton — this is the LCP element */}
      <div className="bg-gradient-to-r from-green-100 to-emerald-50 rounded-2xl p-6 shadow-sm">
        <div className="h-6 w-48 bg-green-200/60 rounded mb-3"></div>
        <div className="h-4 w-72 bg-green-200/40 rounded"></div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Content list skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="h-4 flex-1 bg-gray-100 rounded"></div>
              <div className="h-4 w-24 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
