const path = require("path");

const {
  getCommandPath,
  getDockerMountPath,
  getOptionalEnv,
  getRequiredEnv,
  loadDefaultEnv,
  maskDatabaseUrl,
  printKeyValue,
  runCommand,
  sanitizeDatabaseUrlForPgTools,
} = require("./lib/migration-utils");

function printHelp() {
  console.log(`Usage:
  node scripts/restore-postgres.js

Environment:
  TARGET_DATABASE_URL   Required target database URL
  PG_RESTORE_INPUT      Required dump file path
  PG_RESTORE_JOBS       Optional parallel jobs. Default: 1
  PG_CLIENT_IMAGE       Optional Docker image fallback. Default: postgres:17
  MIGRATION_ENV_FILE    Optional extra env file to load

Notes:
  - Target database must already exist.
  - The restore uses --clean and --if-exists to replace existing objects.
`);
}

async function main() {
  loadDefaultEnv();

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const targetUrl = getRequiredEnv("TARGET_DATABASE_URL");
  const targetPgUrl = sanitizeDatabaseUrlForPgTools(targetUrl);
  const inputPath = path.resolve(process.cwd(), getRequiredEnv("PG_RESTORE_INPUT"));
  const jobsRaw = getOptionalEnv("PG_RESTORE_JOBS", "1");
  const jobs = Number.parseInt(jobsRaw, 10);
  const pgRestorePath = getCommandPath("pg_restore");
  const dockerPath = getCommandPath("docker");
  const dockerImage = getOptionalEnv("PG_CLIENT_IMAGE", "postgres:17");

  if (!Number.isFinite(jobs) || jobs < 1) {
    throw new Error("PG_RESTORE_JOBS must be a positive integer");
  }

  printKeyValue("Target", maskDatabaseUrl(targetUrl));
  printKeyValue("Input", inputPath);
  printKeyValue("Jobs", String(jobs));

  const restoreArgs = [
    `--dbname=${targetPgUrl}`,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
  ];

  if (jobs > 1) {
    restoreArgs.push(`--jobs=${jobs}`);
  }

  if (pgRestorePath) {
    await runCommand(pgRestorePath, [...restoreArgs, inputPath]);
  } else if (dockerPath) {
    const workDir = process.cwd();
    const relativeInput = path.relative(workDir, inputPath).replace(/\\/g, "/");
    const containerInput = path.posix.join("/work", relativeInput);

    await runCommand(dockerPath, [
      "run",
      "--rm",
      "-v",
      `${getDockerMountPath(workDir)}:/work`,
      dockerImage,
      "pg_restore",
      ...restoreArgs,
      containerInput,
    ]);
  } else {
    throw new Error(
      "pg_restore and docker are both unavailable. Install PostgreSQL client tools or Docker."
    );
  }

  console.log("Database restore completed successfully.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
