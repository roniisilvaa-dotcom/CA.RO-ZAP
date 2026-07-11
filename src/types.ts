export type PlanType = 'free' | 'start' | 'business' | 'enterprise';
export type TenantStatus = 'active' | 'locked';
export type UserRole = 'admin' | 'manager' | 'agent';
export type MessageSender = 'customer' | 'agent' | 'ai';
export type MessageType = 'text' | 'image' | 'audio' | 'document';

export interface FAQ {
  q: string;
  a: string;
}

export interface KnowledgeBase {
  text: string;
  faqs: FAQ[];
  catalogue: string;
}

export interface ChatbotOption {
  label: string;
  nextStepId: string;
}

export interface ChatbotStep {
  id: string;
  type: 'message' | 'menu' | 'input' | 'condition' | 'transfer';
  label: string;
  content: string;
  options?: ChatbotOption[];
  nextStepId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  niche: string;
  plan: PlanType;
  status: TenantStatus;
  createdAt: string;
  whatsappConnected: boolean;
  whatsappNumber: string;
  knowledgeBase: KnowledgeBase;
  chatbotConfig: ChatbotStep[];
  sectors: string[];
  webhookUrl: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  active: boolean;
}

export interface Note {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string[];
  pipelineStage: string; // e.g. 'novo' | 'contato' | 'proposta' | 'negociacao' | 'fechado'
  assignedTo: string | null; // User ID
  customFields: Record<string, string>;
  notes: Note[];
  lastMessageAt: string;
  avatarUrl?: string;
  leadScore?: 'hot' | 'warm' | 'cold' | null;
  leadReason?: string | null;
  aiAutoReply: boolean;
}

export interface Message {
  id: string;
  contactId: string;
  sender: MessageSender;
  body: string;
  type: MessageType;
  mediaUrl?: string;
  createdAt: string;
  isInternalNote?: boolean;
  authorName?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  event: string;
  payload: string;
  status: 'success' | 'failed';
}
