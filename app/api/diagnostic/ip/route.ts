import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 通过多个服务获取公网 IP
    const services = [
      'https://api.ipify.org?format=json',
      'https://api.my-ip.io/v2/ip.json',
      'https://ipinfo.io/json',
    ]

    let ip = 'unknown'
    let source = ''

    for (const service of services) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(service, { signal: controller.signal })
        clearTimeout(timeout)

        if (res.ok) {
          const data = await res.json()
          ip = data.ip || data.data?.ip || ip
          source = service
          break
        }
      } catch {
        continue
      }
    }

    return NextResponse.json({
      ip,
      source,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to get IP' }, { status: 500 })
  }
}
