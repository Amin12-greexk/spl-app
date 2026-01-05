import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // Hash password: Mendaftar1
  const hashedPassword = await bcrypt.hash("Mendaftar1", 10)

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@tunasestaindonesia.com" },
    update: {
      password: hashedPassword,
      pin: "000000",
    },
    create: {
      email: "admin@tunasestaindonesia.com",
      name: "Super Administrator",
      password: hashedPassword,
      pin: "000000",
      role: "SUPER_ADMIN",
      department: "System",
      position: "Super Admin",
    },
  })

  console.log("✅ Seed completed successfully!")
  console.log("\n📊 User Created:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("🔐 Super Admin Account")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`📧 Email    : ${superAdmin.email}`)
  console.log(`👤 Name     : ${superAdmin.name}`)
  console.log(`🔑 Password : Mendaftar1`)
  console.log(`📌 PIN      : ${superAdmin.pin}`)
  console.log(`🏷️  Role     : ${superAdmin.role}`)
  console.log(`🏢 Dept     : ${superAdmin.department}`)
  console.log(`💼 Position : ${superAdmin.position}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("\n🚀 You can now login with:")
  console.log(`   URL      : http://localhost:3000/login`)
  console.log(`   Email    : admin@tunasestaindonesia.com`)
  console.log(`   Password : Mendaftar1`)
  console.log("\n💡 Next Steps:")
  console.log("   1. Start dev server : npm run dev")
  console.log("   2. Login as admin")
  console.log("   3. Go to /dashboard/admin")
  console.log("   4. Start adding users and data")
  console.log("\n")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
