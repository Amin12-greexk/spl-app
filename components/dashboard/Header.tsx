"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/Button"
import { Role } from "@/types"

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      STAFF: "bg-blue-100 text-blue-800",
      HR: "bg-green-100 text-green-800",
      MANAGER: "bg-purple-100 text-purple-800",
    }

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          colors[role] || "bg-gray-100 text-gray-800"
        }`}
      >
        {role}
      </span>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Aplikasi SPL
            </h1>
            <p className="text-sm text-gray-600">
              Sistem Pengajuan Surat Perintah Lembur
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name}
              </p>
              <div className="flex items-center gap-2 justify-end mt-1">
                {session?.user?.role && getRoleBadge(session.user.role)}
                {session?.user?.department && (
                  <span className="text-xs text-gray-500">
                    {session.user.department}
                  </span>
                )}
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}