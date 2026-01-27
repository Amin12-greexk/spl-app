import fs from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";
import * as splTimeModule from "../lib/spl-time";

const splTime = (splTimeModule as unknown as { default?: typeof splTimeModule })
  .default ?? splTimeModule;

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

async function main() {
  const envPath = path.join(process.cwd(), ".env");
  const envText = await fs.readFile(envPath, "utf8");
  const databaseUrl = extractEnvValue(envText, "DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in .env");
  }
  process.env.DATABASE_URL = databaseUrl;

  const prisma = new PrismaClient();

  try {
    const legacySpls = await prisma.spl.findMany({
      where: {
        source: "LEGACY",
        actualStartAt: null,
        actualEndAt: null,
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        plannedStartAt: true,
        plannedEndAt: true,
      },
    });

    let updated = 0;
    let skipped = 0;

    for (const spl of legacySpls) {
      let plannedStart = spl.plannedStartAt ? new Date(spl.plannedStartAt) : null;
      let plannedEnd = spl.plannedEndAt ? new Date(spl.plannedEndAt) : null;

      const plannedIsValid =
        plannedStart &&
        plannedEnd &&
        !Number.isNaN(plannedStart.getTime()) &&
        !Number.isNaN(plannedEnd.getTime());

      if (!plannedIsValid) {
        const baseDay = splTime.startOfDay(new Date(spl.date));
        const window = splTime.makeWindow(baseDay, spl.startTime, spl.endTime);
        if (!window) {
          skipped += 1;
          continue;
        }
        plannedStart = window.start;
        plannedEnd = window.end;
      }

      const totalMinutes = splTime.getMinutesDiff(plannedStart!, plannedEnd!);
      const totalHours = Number((totalMinutes / 60).toFixed(2));

      await prisma.spl.update({
        where: { id: spl.id },
        data: {
          actualStartAt: plannedStart!,
          actualEndAt: plannedEnd!,
          realizedMinutes: totalMinutes,
          actualTotalHours: totalHours,
          realizationCounted: totalMinutes > 0,
        },
      });

      updated += 1;
    }

    console.log(
      JSON.stringify(
        {
          legacyFound: legacySpls.length,
          updated,
          skipped,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
