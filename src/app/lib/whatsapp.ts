import axios from 'axios';
import { processChatMessage } from './ai-agent';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// Verify webhook for WhatsApp
export async function verifyWebhook(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return null;
}

// Handle incoming WhatsApp messages
export async function handleIncomingMessage(payload: any) {
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const senderNumber = message.from;
  const messageType = message.type;
  const messageId = message.id;

  if (messageType === 'text') {
    const text = message.text.body;
    await processMessage(text, senderNumber, messageId);
  }
  // Handle other message types (audio, image) if needed
}

// Process message through AI agent
async function processMessage(text: string, senderNumber: string, messageId: string) {
  const response = await processChatMessage(text, messageId, senderNumber);
  await sendWhatsAppMessage(senderNumber, response);
}

// Send WhatsApp message
export async function sendWhatsAppMessage(to: string, text: string) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}