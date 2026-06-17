import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { Role } from "@/types"

// Validasi environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not set')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user || !user.password) return null

          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as Role,
            department: user.departmentName,
            departmentId: user.departmentId,
            pin: user.pin,
            position: user.position,
            supervisorId: user.supervisorId,
            regularStartTime: user.regularStartTime,
            regularEndTime: user.regularEndTime,
            image: user.image,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.department = user.department
        token.departmentId = user.departmentId
        token.pin = user.pin
        token.position = user.position
        token.supervisorId = user.supervisorId
        token.regularStartTime = user.regularStartTime
        token.regularEndTime = user.regularEndTime
        token.image = user.image
      }
      
      // Handle session update trigger (used after profile photo upload)
      if (trigger === "update" && session?.image !== undefined) {
        token.image = session.image
      }

      // Refresh image from DB if token doesn't have it yet
      // (handles users who logged in before the image feature was added)
      if (!token.image && token.id) {
        try {
          const dbUser = await prisma.$queryRawUnsafe(
            `SELECT image FROM "users" WHERE id = $1 LIMIT 1`,
            token.id
          ) as Array<{ image: string | null }>
          if (dbUser.length > 0 && dbUser[0].image) {
            token.image = dbUser[0].image
          }
        } catch {
          // silently ignore — image just won't show until next login
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.department = token.department as string | null
        session.user.departmentId = token.departmentId as string | null
        session.user.pin = token.pin as string
        session.user.position = token.position as string | null
        session.user.supervisorId = token.supervisorId as string | null
        session.user.regularStartTime = token.regularStartTime as string | null
        session.user.regularEndTime = token.regularEndTime as string | null
        session.user.image = token.image as string | null
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
}
