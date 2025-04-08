import OpenAI from 'openai';
import { getSheetData, updateOrder, getCustomer, updateCustomer } from './sheets';
import { sendWhatsAppMessage } from './whatsapp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Memory store for conversation context
const memoryStore = new Map<string, any[]>();

// Order flow state tracking
const orderStateStore = new Map<string, {
  stage: string;
  service?: string;
  customNotes?: string;
  price?: number;
  customerData?: {
    name: string;
    email: string;
    phone: string;
    isNew: boolean;
  };
  paymentMethod?: string;
}>();

export async function processChatMessage(message: string, sessionId: string, phoneNumber: string) {
  try {
    // Get conversation context
    const context = memoryStore.get(sessionId) || [];
    
    // Get current order state if exists
    const orderState = orderStateStore.get(sessionId) || { stage: '' };

    // Get all relevant data from Google Sheets
    const [profile, services, portfolio, testimonials, skills, socialMedia, faq, orders, customers] = await Promise.all([
      getSheetData('Profile'),
      getSheetData('LAYANAN'),
      getSheetData('PORTOFOLIO'),
      getSheetData('TESTIMONI'),
      getSheetData('SKILLS'),
      getSheetData('SOSIAL MEDIA'),
      getSheetData('FAQ'),
      getSheetData('ORDER'),
      getSheetData('Customers')
    ]);

    // System message with all instructions
    const systemMessage = buildSystemMessage({
      profile,
      services,
      portfolio,
      testimonials,
      skills,
      socialMedia,
      faq,
      orders,
      customers,
      orderState
    });

    // Process with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        ...context,
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "Maaf, saya tidak bisa memproses permintaan Anda saat ini.";

    // Check if this is part of an order flow
    const newOrderState = detectOrderFlow(message, response, orderState);
    if (newOrderState.stage !== orderState.stage) {
      await handleOrderFlow(message, response, sessionId, phoneNumber, newOrderState);
      orderStateStore.set(sessionId, newOrderState);
    }

    // Update context
    memoryStore.set(sessionId, [
      ...context,
      { role: "user", content: message },
      { role: "assistant", content: response }
    ]);

    return response;
  } catch (error) {
    console.error('Error processing chat message:', error);
    return "Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi nanti.";
  }
}

function buildSystemMessage(data: {
  profile: any[];
  services: any[];
  portfolio: any[];
  testimonials: any[];
  skills: any[];
  socialMedia: any[];
  faq: any[];
  orders: any[];
  customers: any[];
  orderState: any;
}) {
  return `
  1. IDENTITAS & PERAN
  Role:
  Kamu adalah Asisten Digital dari seorang bernama Yeheskiel Yunus Tame. Data tentangnya:
  ${JSON.stringify(data.profile)}
  
  Tugas kamu:
  - Menjadi frontliner yang ramah, gaul, dan profesional
  - Menjawab pertanyaan user terkait Yeheskiel
  - Memandu user melalui proses order jasa (website, chatbot, AI)
  - Menggunakan data dari Google Sheets (portofolio, layanan, testimoni)
  - Menggunakan bahasa user (Indonesia gaul/English) dan style obrolan santai tapi meyakinkan
  
  Tone & Personality:
  😎 Cool tapi informatif, selalu ada icon keren tiap respon
  🚀 Hype tapi jujur (no overpromise)
  🧠 Smart (gunakan data nyata dari portofolio Yeheskiel)
  
  ${data.orderState.stage ? `STATUS ORDER SAAT INI: ${data.orderState.stage.toUpperCase()}` : ''}

  DATA YANG TERSEDIA:
  - Layanan: ${JSON.stringify(data.services)}
  - Portofolio: ${JSON.stringify(data.portfolio)}
  - Testimoni: ${JSON.stringify(data.testimonials)}
  - Skills: ${JSON.stringify(data.skills)}
  - Social Media: ${JSON.stringify(data.socialMedia)}
  - FAQ: ${JSON.stringify(data.faq)}
  - Orders: ${JSON.stringify(data.orders)}
  - Customers: ${JSON.stringify(data.customers)}

  ${buildOrderFlowGuide(data.orderState.stage)}
  `;
}

function buildOrderFlowGuide(currentStage?: string) {
  if (!currentStage) return '';

  const guides: Record<string, string> = {
    'identify_service': 'LANGKAH 1: Identifikasi layanan yang diminta user. Tanyakan jika belum jelas.',
    'customization': 'LANGKAH 2: Tanyakan kebutuhan kustomisasi jika layanan mendukung.',
    'price_calculation': 'LANGKAH 3: Hitung harga dan tampilkan ke user termasuk diskon jika ada.',
    'customer_data': 'LANGKAH 4: Kumpulkan data customer (nama, email). Jika sudah terdaftar, konfirmasi data.',
    'payment_method': 'LANGKAH 5: Tanyakan metode pembayaran yang dipilih.',
    'final_confirmation': 'LANGKAH 6: Tampilkan ringkasan order dan minta konfirmasi.',
    'data_saving': 'LANGKAH 7: Simpan data order dan kirim konfirmasi.',
    'follow_up': 'LANGKAH 8: Tanyakan apakah user butuh bantuan lainnya.'
  };

  return `PANDUAN ORDER SAAT INI:\n${guides[currentStage] || ''}`;
}

function detectOrderFlow(message: string, response: string, currentState: any) {
  const lowerMessage = message.toLowerCase();
  const lowerResponse = response.toLowerCase();

  const newState = { ...currentState };

  // Detect order initiation
  if ((lowerMessage.includes('order') || lowerMessage.includes('pesan')) && !currentState.stage) {
    newState.stage = 'identify_service';
    return newState;
  }

  // Detect service selection
  if (currentState.stage === 'identify_service' && !currentState.service) {
    const services = ['website', 'chatbot', 'ai'];
    const selectedService = services.find(service => lowerMessage.includes(service));
    if (selectedService) {
      newState.service = selectedService;
      newState.stage = 'customization';
      return newState;
    }
  }

  // Detect customization
  if (currentState.stage === 'customization' && lowerResponse.includes('custom')) {
    newState.stage = 'price_calculation';
    return newState;
  }

  // Detect price confirmation
  if (currentState.stage === 'price_calculation' && lowerResponse.includes('total')) {
    newState.stage = 'customer_data';
    return newState;
  }

  // Detect customer data collection
  if (currentState.stage === 'customer_data' && (lowerResponse.includes('nama') || lowerResponse.includes('email'))) {
    newState.stage = 'payment_method';
    return newState;
  }

  // Detect payment method selection
  if (currentState.stage === 'payment_method' && lowerResponse.includes('pembayaran')) {
    newState.stage = 'final_confirmation';
    return newState;
  }

  // Detect final confirmation
  if (currentState.stage === 'final_confirmation' && lowerMessage === 'ya') {
    newState.stage = 'data_saving';
    return newState;
  }

  // After order completion
  if (currentState.stage === 'data_saving' && lowerResponse.includes('berhasil')) {
    newState.stage = 'follow_up';
    return newState;
  }

  return newState;
}

async function handleOrderFlow(message: string, response: string, sessionId: string, phoneNumber: string, orderState: any) {
  switch (orderState.stage) {
    case 'identify_service':
      await sendServiceList(phoneNumber);
      break;
      
    case 'customization':
      await askForCustomization(phoneNumber, orderState.service!);
      break;
      
    case 'price_calculation':
      await calculateAndSendPrice(phoneNumber, orderState.service!);
      break;
      
    case 'customer_data':
      await handleCustomerData(phoneNumber, sessionId);
      break;
      
    case 'payment_method':
      await askForPaymentMethod(phoneNumber);
      break;
      
    case 'final_confirmation':
      await sendOrderConfirmation(phoneNumber, orderState);
      break;
      
    case 'data_saving':
      await saveOrderData(sessionId, phoneNumber, orderState);
      break;
      
    case 'follow_up':
      await sendFollowUp(phoneNumber);
      break;
  }
}

// Order flow helper functions
async function sendServiceList(phoneNumber: string) {
  const services = await getSheetData('LAYANAN');
  const serviceList = services.map((s: any) => `- ${s[0]}`).join('\n');
  
  const response = `🚀 Anda ingin memesan jasa? Kami menyediakan:\n${serviceList}\n\nSilakan sebutkan layanan yang Anda butuhkan.`;
  await sendWhatsAppMessage(phoneNumber, response);
}

async function askForCustomization(phoneNumber: string, service: string) {
  const services = await getSheetData('LAYANAN');
  const serviceData = services.find((s: any) => s[0].toLowerCase() === service.toLowerCase());
  
  if (serviceData && serviceData[3] === 'Yes') {
    const response = `🎨 Produk ini bisa disesuaikan. Silakan tambahkan catatan custom Anda.`;
    await sendWhatsAppMessage(phoneNumber, response);
  }
}

async function calculateAndSendPrice(phoneNumber: string, service: string) {
  const services = await getSheetData('LAYANAN');
  const serviceData = services.find((s: any) => s[0].toLowerCase() === service.toLowerCase());
  
  if (serviceData) {
    const basePrice = parseFloat(serviceData[1]);
    const discount = parseFloat(serviceData[2]) || 0;
    const totalPrice = basePrice * (1 - (discount / 100));
    
    let response = `💰 Harga dasar: Rp${basePrice.toLocaleString('id-ID')}`;
    if (discount > 0) {
      response += `\n🎁 Diskon ${discount}%: Rp${(basePrice * discount / 100).toLocaleString('id-ID')}`;
    }
    response += `\n\n💵 Total: Rp${totalPrice.toLocaleString('id-ID')}`;
    
    await sendWhatsAppMessage(phoneNumber, response);
  }
}

async function handleCustomerData(phoneNumber: string, sessionId: string) {
  const customer = await getCustomer(phoneNumber);
  
  if (customer) {
    const response = `👋 Konfirmasi data Anda:\nNama: ${customer.name}\nEmail: ${customer.email}\n\nApa data masih benar? (Ya/Tidak)`;
    await sendWhatsAppMessage(phoneNumber, response);
    
    // Update order state
    const orderState = orderStateStore.get(sessionId);
    if (orderState) {
      orderState.customerData = {
        name: customer.name,
        email: customer.email,
        phone: phoneNumber,
        isNew: false
      };
      orderStateStore.set(sessionId, orderState);
    }
  } else {
    const response = `📋 Kami membutuhkan beberapa data untuk melanjutkan:\n1. Nama lengkap\n2. Email\n\nSilakan kirim dalam format:\nNama: [nama Anda]\nEmail: [email Anda]`;
    await sendWhatsAppMessage(phoneNumber, response);
  }
}

async function askForPaymentMethod(phoneNumber: string) {
  const paymentMethods = ['Transfer Bank', 'COD', 'E-Wallet'];
  const response = `💳 Pilih metode pembayaran:\n${paymentMethods.map(m => `- ${m}`).join('\n')}`;
  await sendWhatsAppMessage(phoneNumber, response);
}

async function sendOrderConfirmation(phoneNumber: string, orderState: any) {
  const response = `📋 **Order Summary**\n` +
    `* Layanan: ${orderState.service}\n` +
    `* Kustomisasi: ${orderState.customNotes || '-'}\n` +
    `* Jumlah: 1\n` +
    `* Total: Rp${orderState.price?.toLocaleString('id-ID')}\n` +
    `* Email: ${orderState.customerData?.email || '-'}\n` +
    `\nApakah data sudah benar? Ketik 'YA' untuk proses atau 'UBAH' untuk revisi.`;
  
  await sendWhatsAppMessage(phoneNumber, response);
}

async function saveOrderData(sessionId: string, phoneNumber: string, orderState: any) {
  // Save customer data if new
  if (orderState.customerData?.isNew) {
    await updateCustomer({
      customerId: generateId(),
      name: orderState.customerData.name,
      phone: phoneNumber,
      email: orderState.customerData.email
    });
  }

  // Save order data
  await updateOrder({
    date: new Date().toISOString().split('T')[0],
    customerName: orderState.customerData?.name || '',
    email: orderState.customerData?.email || '',
    service: orderState.service || '',
    description: orderState.customNotes || '',
    status: 'Menunggu Pembayaran'
  });

  // Send confirmation
  const response = `✅ Order berhasil! ID Order: ${generateId()}\n\nSilakan bayar ke 087861330910 (DANA).`;
  await sendWhatsAppMessage(phoneNumber, response);
}

async function sendFollowUp(phoneNumber: string) {
  const response = `🤔 Apakah Anda masih membutuhkan bantuan lainnya?`;
  await sendWhatsAppMessage(phoneNumber, response);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}