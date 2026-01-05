import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function clearDatabase() {
  console.log("🗑️  Menghapus semua data dari database...")

  try {
    // Delete in order to respect foreign key constraints
    console.log("Menghapus UserNotifications...")
    await prisma.userNotification.deleteMany({})

    console.log("Menghapus SPLs...")
    await prisma.spl.deleteMany({})

    console.log("Menghapus Users...")
    await prisma.user.deleteMany({})

    console.log("Menghapus Settings...")
    await prisma.setting.deleteMany({})

    console.log("✅ Semua data berhasil dihapus!")
    console.log("📝 Database sekarang kosong dan siap diisi dengan data real")
    console.log("\n💡 Untuk membuat akun superadmin pertama, Anda bisa:")
    console.log("   1. Gunakan halaman register di /register")
    console.log("   2. Atau jalankan: npm run seed (untuk data sample)")
  } catch (error) {
    console.error("❌ Error menghapus data:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
