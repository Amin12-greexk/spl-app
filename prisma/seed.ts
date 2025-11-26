import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

async function main() {
  // Hash password standar untuk semua seeder
  const hashedPassword = await bcrypt.hash("password123", 10);
  const hashedPasswordCommon = await bcrypt.hash("password123", 10);

  // Buat Akun HR
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@example.com" },
    update: {}, // Jika sudah ada, jangan lakukan apa-apa
    create: {
      email: "hr@example.com",
      name: "Akun HR",
      password: hashedPassword,
      pin: "1111",
      role: "HR", // Sesuai dengan tipe Role Anda
      department: "Human Resources",
    },
  });

  // Buat Akun Manager
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      name: "Akun Manager",
      password: hashedPassword,
      pin: "2222",
      role: "MANAGER", // Sesuai dengan tipe Role Anda
      department: "Management",
    },
  });
  
  // (Opsional) Buat Akun Staff untuk pengujian
  const staffUser = await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      email: "staff@example.com",
      name: "Akun Staff",
      password: hashedPassword,
      pin: "3333",
      role: "STAFF", // Sesuai dengan tipe Role Anda
      department: "IT",
    },
  });

  // Akun sesuai permintaan
  const managerTiyas = await prisma.user.upsert({
    where: { email: "tiyas@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "tiyas@tunasestaindonesia.com",
      name: "Tiyas Indah Setyowuri",
      password: hashedPasswordCommon,
      pin: "4444",
      role: "MANAGER",
      department: "Management",
    },
  });

  const hrSabrina = await prisma.user.upsert({
    where: { email: "sabrina@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "sabrina@tunasestaindonesia.com",
      name: "Hayyu Sabrina",
      password: hashedPasswordCommon,
      pin: "5555",
      role: "HR",
      department: "Human Resources",
    },
  });

  const staffAmin = await prisma.user.upsert({
    where: { email: "amin@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "amin@tunasestaindonesia.com",
      name: "Abdul Wahid Amin",
      password: hashedPasswordCommon,
      pin: "6666",
      role: "STAFF",
      department: "IT",
    },
  });

  // Default setting minimal jam lembur (16:30)
  const minOvertimeSetting = await prisma.setting.upsert({
    where: { key: "MIN_OVERTIME_START" },
    update: { value: "16:30" },
    create: { key: "MIN_OVERTIME_START", value: "16:30" },
  });

  console.log({ hrUser, managerUser, staffUser, managerTiyas, hrSabrina, staffAmin });
}

// Jalankan fungsi main dan tangani error
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Tutup koneksi Prisma
    await prisma.$disconnect();
  });
