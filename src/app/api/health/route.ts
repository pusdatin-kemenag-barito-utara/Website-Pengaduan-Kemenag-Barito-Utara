import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const startTime = Date.now();

    // Test database connection by pinging supabase table/schema
    const { error } = await supabase
      .from('pengaduan')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          database: {
            connected: false,
            error: error.message,
          },
          latencyMs: latency,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SI-GESIT Pengaduan Kemenag Barito Utara',
        database: {
          connected: true,
          schema: process.env.NEXT_PUBLIC_PUSDATIN_SCHEMA || 'kemenag-pengaduan',
        },
        latencyMs: latency,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
