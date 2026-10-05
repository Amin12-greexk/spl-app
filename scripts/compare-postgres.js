const { PrismaClient } = require("@prisma/client");

const {
  getOptionalEnv,
  getRequiredEnv,
  loadDefaultEnv,
  maskDatabaseUrl,
  printKeyValue,
} = require("./lib/migration-utils");

async function getSnapshot(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    const counts = await prisma.$queryRawUnsafe(`
      SELECT 'users' AS table_name, COUNT(*)::bigint AS row_count FROM users
      UNION ALL SELECT 'departments', COUNT(*)::bigint FROM departments
      UNION ALL SELECT 'spls', COUNT(*)::bigint FROM spls
      UNION ALL SELECT 'settings', COUNT(*)::bigint FROM settings
      UNION ALL SELECT 'user_notifications', COUNT(*)::bigint FROM user_notifications
      UNION ALL SELECT 'security_shift_assignments', COUNT(*)::bigint FROM security_shift_assignments
      UNION ALL SELECT '_prisma_migrations', COUNT(*)::bigint FROM _prisma_migrations
      ORDER BY table_name ASC
    `);

    const statuses = await prisma.$queryRawUnsafe(`
      SELECT status, COUNT(*)::bigint AS row_count
      FROM spls
      GROUP BY status
      ORDER BY status ASC
    `);

    const sources = await prisma.$queryRawUnsafe(`
      SELECT source, COUNT(*)::bigint AS row_count
      FROM spls
      GROUP BY source
      ORDER BY source ASC
    `);

    return {
      counts: normalizeRows(counts),
      statuses: normalizeRows(statuses),
      sources: normalizeRows(sources),
    };
  } finally {
    await prisma.$disconnect();
  }
}

function normalizeRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : value,
      ])
    )
  );
}

function toLookup(rows, keyName) {
  return new Map(rows.map((row) => [row[keyName], row.row_count]));
}

function compareRows(section, sourceRows, targetRows, keyName) {
  const sourceLookup = toLookup(sourceRows, keyName);
  const targetLookup = toLookup(targetRows, keyName);
  const keys = Array.from(new Set([...sourceLookup.keys(), ...targetLookup.keys()])).sort();
  const mismatches = [];

  for (const key of keys) {
    const sourceValue = sourceLookup.get(key) || 0;
    const targetValue = targetLookup.get(key) || 0;
    if (sourceValue !== targetValue) {
      mismatches.push({
        section,
        key,
        source: sourceValue,
        target: targetValue,
      });
    }
  }

  return mismatches;
}

async function main() {
  loadDefaultEnv();

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  node scripts/compare-postgres.js

Environment:
  SOURCE_DATABASE_URL   Optional. Falls back to DATABASE_URL from .env
  TARGET_DATABASE_URL   Required
  MIGRATION_ENV_FILE    Optional extra env file to load
`);
    return;
  }

  const sourceUrl =
    getOptionalEnv("SOURCE_DATABASE_URL") || getOptionalEnv("DATABASE_URL");
  const targetUrl = getRequiredEnv("TARGET_DATABASE_URL");

  if (!sourceUrl) {
    throw new Error("SOURCE_DATABASE_URL or DATABASE_URL is required");
  }

  printKeyValue("Source", maskDatabaseUrl(sourceUrl));
  printKeyValue("Target", maskDatabaseUrl(targetUrl));

  const [sourceSnapshot, targetSnapshot] = await Promise.all([
    getSnapshot(sourceUrl),
    getSnapshot(targetUrl),
  ]);

  const mismatches = [
    ...compareRows("counts", sourceSnapshot.counts, targetSnapshot.counts, "table_name"),
    ...compareRows("statuses", sourceSnapshot.statuses, targetSnapshot.statuses, "status"),
    ...compareRows("sources", sourceSnapshot.sources, targetSnapshot.sources, "source"),
  ];

  if (mismatches.length > 0) {
    console.error("Database comparison failed.");
    console.error(JSON.stringify(mismatches, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Database comparison matched.");
  console.log(JSON.stringify(sourceSnapshot, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
