# WhatsApp Chatbot by Yeheskiel Yunus Tame

A powerful WhatsApp chatbot built with Next.js that provides automated customer service, order processing, and business automation.

## 🚀 Features

- **AI-Powered Conversations**: Uses OpenAI GPT-4 for natural language processing
- **Order Management**: Handles complete order workflow from service selection to payment
- **Customer Data Collection**: Stores and retrieves customer information
- **Google Sheets Integration**: Syncs data with Google Sheets for order tracking
- **Xata Database**: Persistent storage for conversations and order states
- **WhatsApp Integration**: Connects with WhatsApp via API for messaging
- **Multi-language Support**: Responds in Bahasa Indonesia and English

## 💻 Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4
- **Database**: Xata (PostgreSQL)
- **Storage**: Google Sheets API
- **Messaging**: WhatsApp Business API
- **Deployment**: Vercel

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yeheskieltame/chatbot-wa.git
cd chatbot-wa
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure required environment variables:
```
OPENAI_API_KEY=your_openai_key
XATA_API_KEY=your_xata_key
GOOGLE_SHEETS_CREDENTIALS=your_google_credentials
WHATSAPP_API_KEY=your_whatsapp_key
```

5. Run the development server:
```bash
npm run dev
```

## ⚙️ Configuration

### Google Sheets Setup
1. Create a Google Sheet with these tabs:
   - Profile
   - LAYANAN (Services)
   - PORTOFOLIO
   - TESTIMONI (Testimonials)
   - SKILLS
   - SOSIAL MEDIA
   - FAQ
   - ORDER
   - Customers

2. Enable Google Sheets API and share the sheet with your service account

### Xata Database Setup
1. Create tables in Xata:
   - conversations (fields: sessionId, messages)
   - order_states (fields: sessionId, stage, service, customNotes, price, customerData, paymentMethod)

## 📱 Usage

1. Start the chatbot:
```bash
npm run dev
```

2. Connect to WhatsApp:
- Use a WhatsApp Business API provider
- Set the webhook URL to your deployed endpoint

3. Chatbot Commands:
- "Order" - Start a new service order
- "Help" - Get assistance
- "Status" - Check order status

## 📸 Screenshots

(Add screenshots of the chatbot in action here)

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📧 Contact

Yeheskiel Yunus Tame - [Email](yeheskielyunustame13@gmail.com)
