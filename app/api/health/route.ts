import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; latency?: number }> = {}
  
  // Check Supabase connection
  const dbStart = Date.now()
  try {
    const { error } = await supabase.from('users').select('count').limit(1)
    const dbLatency = Date.now() - dbStart
    checks.database = {
      status: error ? 'error' : 'ok',
      message: error?.message,
      latency: dbLatency,
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check environment variables
  checks.environment = {
    status: NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ok' : 'error',
    message: !NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Missing env vars' : undefined,
  }

  const allHealthy = Object.values(checks).every(check => check.status === 'ok')
  const status = allHealthy ? 200 : 503

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  )
}

