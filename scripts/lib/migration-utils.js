const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function loadEnvFile(filePath) {
  if (!filePath) return;
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) return;

  const content = fs.readFileSync(resolvedPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadDefaultEnv() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  if (process.env.MIGRATION_ENV_FILE) {
    loadEnvFile(process.env.MIGRATION_ENV_FILE);
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

function getOptionalEnv(name, fallback = "") {
  const value = process.env[name];
  if (value === undefined || value === null || !String(value).trim()) {
    return fallback;
  }
  return String(value).trim();
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function maskDatabaseUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
}

function sanitizeDatabaseUrlForPgTools(urlString) {
  const url = new URL(urlString);

  // Prisma-specific query params are not valid libpq connection params.
  url.searchParams.delete("schema");

  return url.toString();
}

function getCommandPath(command) {
  const pathDirs = (process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);

  const extensions =
    process.platform === "win32"
      ? ["", ".exe", ".cmd", ".bat"]
      : [""];

  for (const dir of pathDirs) {
    for (const extension of extensions) {
      const candidate = path.join(dir, `${command}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  if (process.platform === "win32") {
    const windowsFallbackDirs = [
      "C:\\Program Files\\PostgreSQL\\14\\bin",
      "C:\\Program Files\\PostgreSQL\\15\\bin",
      "C:\\Program Files\\PostgreSQL\\16\\bin",
      "C:\\Program Files\\PostgreSQL\\17\\bin",
      "C:\\Program Files\\PostgreSQL\\18\\bin",
      "C:\\Program Files\\PostgreSQL\\14\\pgAdmin 4\\runtime",
      "C:\\Program Files\\PostgreSQL\\15\\pgAdmin 4\\runtime",
      "C:\\Program Files\\PostgreSQL\\16\\pgAdmin 4\\runtime",
      "C:\\Program Files\\PostgreSQL\\17\\pgAdmin 4\\runtime",
      "C:\\Program Files\\PostgreSQL\\18\\pgAdmin 4\\runtime",
    ];

    for (const dir of windowsFallbackDirs) {
      for (const extension of extensions) {
        const candidate = path.join(dir, `${command}${extension}`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function getDockerMountPath(absolutePath) {
  return absolutePath.replace(/\\/g, "/");
}

function runCommand(command, args, options = {}) {
  const { env, cwd, stdio = "inherit" } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio,
      shell: false,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function printKeyValue(label, value) {
  console.log(`${label}: ${value}`);
}

module.exports = {
  ensureDirectory,
  getCommandPath,
  getDockerMountPath,
  getOptionalEnv,
  getRequiredEnv,
  loadDefaultEnv,
  maskDatabaseUrl,
  printKeyValue,
  runCommand,
  sanitizeDatabaseUrlForPgTools,
  timestampForFile,
};
