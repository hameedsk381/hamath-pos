import { NextResponse } from 'next/server';

export async function GET() {
  const logs = globalThis.__serverLogs || [];
  return NextResponse.json({
    total: logs.length,
    logs
  });
}
