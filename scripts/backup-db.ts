import fs from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";

function extractEnvValue(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
  if (!match) return null;
  let raw = match[1].trim();
  if (
    (raw.startsWith("\"") && raw.endsWith("\"")) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  return raw;
}

function toCsv<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(header => `"${header}"`).join(",");

  const rows = data.map(row => {
    return headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) {
        value = "";
      } else if (typeof value === "object" && value instanceof Date) {
        value = value.toISOString();
      } else if (typeof value === "object") {
        // For nested objects, stringify them to JSON
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }

      // Escape double quotes and wrap in double quotes if value contains comma, double quote, or newline
      if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",");
  });

  return [headerRow, ...rows].join("\n");
}

async function main() {
  // Load DATABASE_URL from .env without mutating the file.
  const envPath = path.join(process.cwd(), ".env");
  const envText = await fs.readFile(envPath, "utf8");
  const databaseUrl = extractEnvValue(envText, "DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in .env");
  }
  process.env.DATABASE_URL = databaseUrl;

  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const backupRoot = path.join(process.cwd(), "backups");
    const backupDir = path.join(backupRoot, `db-${stamp}`);
    await fs.mkdir(backupDir, { recursive: true });

    const [users, departments, spls, settings, userNotifications, shifts] =
      await Promise.all([
        prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.department.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.spl.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.setting.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.userNotification.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.securityShiftAssignment.findMany({ orderBy: { workDate: "asc" } }),
      ]);

    const payload = {
      meta: {
        createdAt: now.toISOString(),
        counts: {
          users: users.length,
          departments: departments.length,
          spls: spls.length,
          settings: settings.length,
          userNotifications: userNotifications.length,
          securityShiftAssignments: shifts.length,
        },
      },
      data: {
        users,
        departments,
        spls,
        settings,
        userNotifications,
        securityShiftAssignments: shifts,
      },
    };

    const outPath = path.join(backupDir, "backup.json");
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

    // Also write a small summary that is easy to diff/read quickly.
    const summaryPath = path.join(backupDir, "summary.json");
    await fs.writeFile(summaryPath, JSON.stringify(payload.meta, null, 2), "utf8");

    // Export SPLs to CSV
    const splsCsv = toCsv(spls);
    const splsCsvPath = path.join(backupDir, "spls.csv");
    await fs.writeFile(splsCsvPath, splsCsv, "utf8");

    console.log(JSON.stringify({ backupDir, outPath, summaryPath, splsCsvPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

