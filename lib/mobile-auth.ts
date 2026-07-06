import { SignJWT, jwtVerify } from "jose"

// Dedicated secret for mobile bearer tokens (verifikasi_mobile app), kept
// separate from NEXTAUTH_SECRET so rotating one never invalidates the other.
// Falls back to NEXTAUTH_SECRET only if the dedicated var isn't set yet, so
// this doesn't hard-fail an existing deployment before the new env var is added.
function getSecretKey(): Uint8Array {
  const value = process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!value) {
    throw new Error("MOBILE_JWT_SECRET (or NEXTAUTH_SECRET) is not set")
  }
  return new TextEncoder().encode(value)
}

// 30 hari — sama seperti masa berlaku sesi web NextAuth (lib/auth.ts).
const MOBILE_TOKEN_MAX_AGE = "30d"

export interface MobileTokenClaims {
  sub: string
  role: string
  departmentName: string | null
}

export interface MobileTokenPayload {
  id: string
  role: string
  departmentName: string | null
}

/** Signs a bearer token for a verifikasi_mobile user session. */
export async function signMobileToken(claims: MobileTokenClaims): Promise<string> {
  return new SignJWT({
    role: claims.role,
    departmentName: claims.departmentName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(MOBILE_TOKEN_MAX_AGE)
    .sign(getSecretKey())
}

/** Verifies a bearer token from the `Authorization` header. Returns null on any failure. */
export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (!payload.sub) return null
    return {
      id: payload.sub,
      role: (payload.role as string) || "",
      departmentName: (payload.departmentName as string | null) ?? null,
    }
  } catch {
    return null
  }
}
