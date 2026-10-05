const path = require("path");

const {
  ensureDirectory,
  getCommandPath,
  getDockerMountPath,
  getOptionalEnv,
  loadDefaultEnv,
  maskDatabaseUrl,
  printKeyValue,
  runCommand,
  sanitizeDatabaseUrlForPgTools,
  timestampForFile,
} = require("./lib/migration-utils");

function printHelp() {
  console.log(`Usage:
  node scripts/export-postgres.js

Environment:
  SOURCE_DATABASE_URL   Optional. Falls back to DATABASE_URL from .env
  PG_DUMP_OUTPUT        Optional. Default: backups/pgdump-<timestamp>.dump
  PG_CLIENT_IMAGE       Optional Docker image fallback. Default: postgres:17
  MIGRATION_ENV_FILE    Optional extra env file to load
`);
}

async function main() {
  loadDefaultEnv();

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const sourceUrl =
    getOptionalEnv("SOURCE_DATABASE_URL") || getOptionalEnv("DATABASE_URL");

  if (!sourceUrl) {
    throw new Error("SOURCE_DATABASE_URL or DATABASE_URL is required");
  }
  const sourcePgUrl = sanitizeDatabaseUrlForPgTools(sourceUrl);

  const defaultOutput = path.join(
    process.cwd(),
    "backups",
    `pgdump-${timestampForFile()}.dump`
  );
  const outputPath = path.resolve(
    process.cwd(),
    getOptionalEnv("PG_DUMP_OUTPUT", defaultOutput)
  );
  ensureDirectory(outputPath);

  const pgDumpPath = getCommandPath("pg_dump");
  const dockerPath = getCommandPath("docker");
  const dockerImage = getOptionalEnv("PG_CLIENT_IMAGE", "postgres:17");

  printKeyValue("Source", maskDatabaseUrl(sourceUrl));
  printKeyValue("Output", outputPath);

  if (pgDumpPath) {
    await runCommand(pgDumpPath, [
      `--dbname=${sourcePgUrl}`,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      `--file=${outputPath}`,
    ]);
  } else if (dockerPath) {
    const workDir = process.cwd();
    const relativeOutput = path.relative(workDir, outputPath).replace(/\\/g, "/");
    const containerOutput = path.posix.join("/work", relativeOutput);

    await runCommand(dockerPath, [
      "run",
      "--rm",
      "-v",
      `${getDockerMountPath(workDir)}:/work`,
      dockerImage,
      "pg_dump",
      `--dbname=${sourcePgUrl}`,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      `--file=${containerOutput}`,
    ]);
  } else {
    throw new Error(
      "pg_dump and docker are both unavailable. Install PostgreSQL client tools or Docker."
    );
  }

  console.log("Database dump created successfully.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
