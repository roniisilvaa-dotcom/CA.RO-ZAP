import { Tenant, Contact, Message, WebhookLog, AuditLog } from '../types';

export async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetch('/api/tenants');
  if (!res.ok) throw new Error('Error fetching tenants');
  return res.json();
}

export async function fetchTenantDetails(id: string): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${id}`);
  if (!res.ok) throw new Error('Error fetching tenant');
  return res.json();
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error updating tenant');
  return res.json();
}

export async function fetchContacts(tenantId: string): Promise<Contact[]> {
  const res = await fetch(`/api/contacts/${tenantId}`);
  if (!res.ok) throw new Error('Error fetching contacts');
  return res.json();
}

export async function saveContact(tenantId: string, contact: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`/api/contacts/${tenantId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error('Error saving contact');
  return res.json();
}

export async function deleteContact(tenantId: string, id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/contacts/${tenantId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Error deleting contact');
  return res.json();
}

export async function fetchMessages(contactId: string): Promise<Message[]> {
  const res = await fetch(`/api/messages/${contactId}`);
  if (!res.ok) throw new Error('Error fetching messages');
  return res.json();
}

export async function sendMessage(
  contactId: string,
  data: { sender: string; body: string; type: string; mediaUrl?: string; isInternalNote?: boolean; authorName?: string }
): Promise<Message> {
  const res = await fetch(`/api/messages/${contactId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error sending message');
  return res.json();
}

export async function fetchWebhookLogs(tenantId: string): Promise<WebhookLog[]> {
  const res = await fetch(`/api/webhook-logs/${tenantId}`);
  if (!res.ok) throw new Error('Error fetching webhook logs');
  return res.json();
}

export async function fetchAuditLogs(tenantId: string): Promise<AuditLog[]> {
  const res = await fetch(`/api/audit-logs/${tenantId}`);
  if (!res.ok) throw new Error('Error fetching audit logs');
  return res.json();
}

export async function suggestReply(
  conversationHistory: { sender: string; body: string }[],
  kbText: string,
  catalogue: string
): Promise<{ suggestion: string }> {
  const res = await fetch('/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationHistory, kbText, catalogue }),
  });
  if (!res.ok) throw new Error('Error suggesting reply');
  return res.json();
}

export async function magicEnhance(text: string, mode: string): Promise<{ output: string }> {
  const res = await fetch('/api/ai/magic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode }),
  });
  if (!res.ok) throw new Error('Error enhancing text');
  return res.json();
}

export async function aiAutoRespond(
  tenantId: string,
  contactId: string,
  customerMessage: string
): Promise<{ aiMessage: Message; contact: Contact; classifications: any }> {
  const res = await fetch('/api/ai/auto-respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, contactId, customerMessage }),
  });
  if (!res.ok) throw new Error('Error during auto response');
  return res.json();
}

export async function adminCreateTenant(data: { name: string; niche: string; plan: string }): Promise<Tenant> {
  const res = await fetch('/api/admin/tenants/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error creating tenant');
  return res.json();
}

export async function adminUpdateTenantStatus(id: string, status: string): Promise<Tenant> {
  const res = await fetch('/api/admin/tenants/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
  if (!res.ok) throw new Error('Error updating tenant status');
  return res.json();
}
