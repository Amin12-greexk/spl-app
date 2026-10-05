import { prisma } from "./prisma"

/**
 * Persetujuan level supervisor ditentukan oleh penugasan atasan (data),
 * bukan oleh role. Siapa pun yang ditunjuk sebagai `supervisorId` pemohon
 * (atau tercatat di `Spl.supervisorId`) boleh memproses SPL bawahannya.
 * SUPER_ADMIN bertindak sebagai mirror untuk semua pemohon.
 */

/** Role yang selalu memiliki akses halaman persetujuan tim. */
export const TEAM_APPROVAL_BASE_ROLES = ["GA", "DEPARTMENT_HEAD", "SUPER_ADMIN"]

/**
 * True jika user punya bawahan langsung atau masih memegang SPL
 * PENDING_SUPERVISOR yang di-assign kepadanya (mis. atasan sudah dipindah).
 */
export async function userIsSupervisor(userId: string): Promise<boolean> {
  const subordinate = await prisma.user.findFirst({
    where: { supervisorId: userId, id: { not: userId } },
    select: { id: true },
  })
  if (subordinate) return true

  const assigned = await prisma.spl.findFirst({
    where: {
      supervisorId: userId,
      status: "PENDING_SUPERVISOR",
      requesterId: { not: userId },
    },
    select: { id: true },
  })
  return Boolean(assigned)
}

export async function canAccessTeamApprovals(user: {
  id: string
  role: string
}): Promise<boolean> {
  if (TEAM_APPROVAL_BASE_ROLES.includes(user.role)) return true
  return userIsSupervisor(user.id)
}
