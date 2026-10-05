import { createClient } from "@sanity/client"

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || "production"
const apiVersion = "2024-03-19"
const token = process.env.SANITY_API_TOKEN

if (!projectId && process.env.NODE_ENV === "production") {
  console.warn("⚠️ SANITY_PROJECT_ID is missing in production environment")
}

export const sanityClient = createClient({
  projectId: projectId || "e2bkxwbs", // Gunakan ID Anda sebagai fallback agar build tidak crash
  dataset: dataset,
  useCdn: false,
  apiVersion: apiVersion,
  token: token,
})
