import { NextResponse } from 'next/server';
import { DEFAULT_AI_TOOL_METADATA } from '../../../lib/ai/toolMetadata';

export async function GET() {
  return NextResponse.json({
    tools: DEFAULT_AI_TOOL_METADATA,
  });
}
