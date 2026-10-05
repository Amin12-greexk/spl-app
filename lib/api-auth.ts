import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { verifyMobileToken } from "./mobile-auth"
import { prisma } from "./prisma"
import { Role } from "@/types"

export interface AuthenticatedUser {
  id: string
  role: Role
  name: string
  email: string
  departmentName: string | null
  departmentId: string | null
  supervisorId: string | null
  pin: string | null
}

/**
 * Resolves the acting user from either a NextAuth web session (cookie) — the
 * existing behavior, unchanged — or a verifikasi_mobile Bearer token minted
 * by POST /api/mobile/auth/login. Returns null if neither is present/valid.
 *
 * Existing routes that called `getServerSession(authOptions)` directly can
 * switch to `getAuthenticatedUser(req)` and keep using `.id` / `.role` /
 * `.name` exactly as before; only the fallback path is new.
 */
export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    return {
      id: session.user.id,
      role: session.user.role as Role,
      name: session.user.name || "",
      email: session.user.email || "",
      departmentName: session.user.department ?? null,
      departmentId: session.user.departmentId ?? null,
      supervisorId: session.user.supervisorId ?? null,
      pin: session.user.pin ?? null,
    }
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice("Bearer ".length).trim()
  const decoded = await verifyMobileToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({ where: { id: decoded.id } })
  if (!user) return null

  return {
    id: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    departmentName: user.departmentName,
    departmentId: user.departmentId,
    supervisorId: user.supervisorId,
    pin: user.pin,
  }
}
