import { NextResponse } from 'next/server';
import { handleIncomingMessage } from '../../lib/whatsapp';
import { verifyWebhook } from '../../lib/whatsapp';

export async function POST(request: Request) {
  // Verify webhook for initial setup
  const verification = await verifyWebhook(request);
  if (verification) return verification;

  // Handle incoming message
  const payload = await request.json();
  await handleIncomingMessage(payload);

  return NextResponse.json({ status: 'ok' });
}