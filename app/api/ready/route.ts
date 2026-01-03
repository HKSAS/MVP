import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Simple readiness check - service is ready if it can respond
  return NextResponse.json(
    {
      status: 'ready',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}

