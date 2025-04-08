import { NextResponse } from 'next/server';
import { processChatMessage } from '../../lib/ai-agent';

export async function POST(request: Request) {
  const { message, sessionId, phoneNumber } = await request.json();
  
  try {
    const response = await processChatMessage(message, sessionId, phoneNumber);
    return NextResponse.json({ response });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}