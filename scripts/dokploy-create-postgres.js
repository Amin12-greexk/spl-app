const {
  getOptionalEnv,
  getRequiredEnv,
  loadDefaultEnv,
} = require("./lib/migration-utils");

function printHelp() {
  console.log(`Usage:
  node scripts/dokploy-create-postgres.js

Environment:
  DOKPLOY_URL                    Required, e.g. https://dokploy.example.com
  DOKPLOY_API_KEY                Required
  DOKPLOY_ENVIRONMENT_ID         Required
  DOKPLOY_SERVER_ID              Optional
  DOKPLOY_POSTGRES_NAME          Required service name shown in Dokploy
  DOKPLOY_POSTGRES_DB            Required database name
  DOKPLOY_POSTGRES_USER          Required database user
  DOKPLOY_POSTGRES_PASSWORD      Required database password
  DOKPLOY_POSTGRES_IMAGE         Optional. Default: postgres:16
  DOKPLOY_POSTGRES_EXTERNAL_PORT Optional. If set, publish DB externally
  MIGRATION_ENV_FILE             Optional extra env file to load
`);
}

async function dokployRequest(baseUrl, apiKey, endpoint, payload) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `Dokploy request failed (${response.status}) at ${endpoint}: ${JSON.stringify(body)}`
    );
  }

  return body;
}

function extractPostgresId(responseBody) {
  if (!responseBody || typeof responseBody !== "object") return null;

  const candidates = [
    responseBody.postgresId,
    responseBody.id,
    responseBody.data && responseBody.data.postgresId,
    responseBody.data && responseBody.data.id,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

async function main() {
  loadDefaultEnv();

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const baseUrl = getRequiredEnv("DOKPLOY_URL").replace(/\/+$/, "");
  const apiKey = getRequiredEnv("DOKPLOY_API_KEY");
  const environmentId = getRequiredEnv("DOKPLOY_ENVIRONMENT_ID");
  const serverId = getOptionalEnv("DOKPLOY_SERVER_ID") || null;
  const name = getRequiredEnv("DOKPLOY_POSTGRES_NAME");
  const databaseName = getRequiredEnv("DOKPLOY_POSTGRES_DB");
  const databaseUser = getRequiredEnv("DOKPLOY_POSTGRES_USER");
  const databasePassword = getRequiredEnv("DOKPLOY_POSTGRES_PASSWORD");
  const dockerImage = getOptionalEnv("DOKPLOY_POSTGRES_IMAGE", "postgres:16");
  const externalPort = getOptionalEnv("DOKPLOY_POSTGRES_EXTERNAL_PORT");

  const createResponse = await dokployRequest(baseUrl, apiKey, "/api/postgres.create", {
    name,
    databaseName,
    databaseUser,
    databasePassword,
    dockerImage,
    environmentId,
    serverId,
  });

  const postgresId = extractPostgresId(createResponse);
  if (!postgresId) {
    console.log(JSON.stringify(createResponse, null, 2));
    throw new Error("PostgreSQL service created but postgresId was not returned.");
  }

  if (externalPort) {
    const parsedPort = Number.parseInt(externalPort, 10);
    if (!Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw new Error("DOKPLOY_POSTGRES_EXTERNAL_PORT must be a valid TCP port");
    }

    await dokployRequest(baseUrl, apiKey, "/api/postgres.saveExternalPort", {
      postgresId,
      externalPort: parsedPort,
    });
  }

  await dokployRequest(baseUrl, apiKey, "/api/postgres.deploy", {
    postgresId,
  });

  console.log("Dokploy PostgreSQL service created and deployment triggered.");
  console.log(
    JSON.stringify(
      {
        postgresId,
        name,
        databaseName,
        databaseUser,
        dockerImage,
        externalPort: externalPort || null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
