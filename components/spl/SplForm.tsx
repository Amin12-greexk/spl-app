"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"

export default function SplForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
    projectName: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/spl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengajukan SPL")
      }

      toast.success("SPL berhasil diajukan!")
      router.push("/dashboard/staff")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Form Pengajuan SPL
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Isi formulir di bawah ini untuk mengajukan Surat Perintah Lembur
        </p>
      </div>

      <Input
        label="Tanggal Lembur"
        type="date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Waktu Mulai"
          type="time"
          value={formData.startTime}
          onChange={(e) =>
            setFormData({ ...formData, startTime: e.target.value })
          }
          required
        />

        <Input
          label="Waktu Selesai"
          type="time"
          value={formData.endTime}
          onChange={(e) =>
            setFormData({ ...formData, endTime: e.target.value })
          }
          required
        />
      </div>

      <Input
        label="Nama Proyek (Opsional)"
        type="text"
        placeholder="Nama proyek yang dikerjakan"
        value={formData.projectName}
        onChange={(e) =>
          setFormData({ ...formData, projectName: e.target.value })
        }
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Alasan Lembur <span className="text-red-500">*</span>
        </label>
        <textarea
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
          placeholder="Jelaskan alasan lembur secara detail..."
          value={formData.reason}
          onChange={(e) =>
            setFormData({ ...formData, reason: e.target.value })
          }
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Mengirim..." : "Ajukan SPL"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}