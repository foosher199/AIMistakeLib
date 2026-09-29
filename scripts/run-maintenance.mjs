const appUrl = process.env.APP_URL
const secret = process.env.CRON_SECRET

if (!appUrl || !secret) {
  console.error('APP_URL and CRON_SECRET are required')
  process.exit(1)
}

const response = await fetch(new URL('/api/internal/maintenance', appUrl), {
  method: 'POST',
  headers: { Authorization: `Bearer ${secret}` },
})
const body = await response.text()
if (!response.ok) {
  console.error(`Maintenance failed (${response.status}): ${body}`)
  process.exit(1)
}
console.log(body)
