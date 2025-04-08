import { XataApiClient } from '@xata.io/client';

export interface Conversation {
  id: string;
  sessionId: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderState {
  id: string;
  sessionId: string;
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
  createdAt: string;
  updatedAt: string;
}
