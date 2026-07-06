/**
 * Local mock of the external ABSEN (fingerprint) API.
 * GET /scans?pin=XXXX -> [{ pin, scan_date }, ...] read fresh from scripts/_mock_scans.json
 * The test harness rewrites _mock_scans.json between scenarios to simulate scans.
 * _mock_scans.json shape: { "1001": ["2026-06-17 18:30:00", ...], ... }
 */
import http from "http"
import fs from "fs"
import path from "path"

const PORT = 5599
const FILE = path.join(__dirname, "_mock_scans.json")

const readScans = (pin: string): Array<{ pin: string; scan_date: string }> => {
  try {
    const raw = fs.readFileSync(FILE, "utf-8")
    const map = JSON.parse(raw) as Record<string, string[]>
    const list = map[pin] || []
    return list.map((scan_date) => ({ pin, scan_date }))
  } catch {
    return []
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`)
  const pin = url.searchParams.get("pin") || ""
  const body = JSON.stringify(readScans(pin))
  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(body)
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-absen] listening on http://127.0.0.1:${PORT}`)
})
