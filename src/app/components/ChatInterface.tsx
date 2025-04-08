'use client';
import { useState } from 'react';

export default function ChatInterface({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    const userMessage = { sender: 'user', text: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-4">
      <div className="h-64 overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 border rounded-l-lg p-2"
          placeholder="Ketik pesan Anda..."
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 rounded-r-lg disabled:bg-blue-300"
        >
          {isLoading ? '...' : 'Kirim'}
        </button>
      </div>
    </div>
  );
}