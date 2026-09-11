import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    framework: 'Next.js 15+ (App Router)',
    version: '2.0.0',
    gemini_key_configured: !!process.env.GEMINI_API_KEY,
    prompt_version: 'v1.0.5-pure-spoken-list'
  });
}
