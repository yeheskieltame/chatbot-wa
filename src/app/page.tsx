'use client';
import { useState } from 'react';
import ChatInterface from './components/ChatInterface';

export default function Home() {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2));

  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Yeheskiel's WhatsApp Chatbot</h1>
      <ChatInterface sessionId={sessionId} />
    </main>
  );
}