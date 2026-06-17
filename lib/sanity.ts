import { createClient } from "@sanity/client"

export const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  useCdn: false, // set to `true` to fetch from edge cache
  apiVersion: "2024-03-19", // use current date (YYYY-MM-DD) to target the latest API version
  token: process.env.SANITY_API_TOKEN,
})
