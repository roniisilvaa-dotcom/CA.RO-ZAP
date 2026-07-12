// src/lib/api.ts — CA.RO ZAP painel (multi-tenant, ligado ao Supabase via backend)
import { Tenant, Contact, Message, WebhookLog, AuditLog } from '../types';

const TOKEN_KEY = 'carozap_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function authHeaders(extra: Record<string, string> = {}) {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

async function handle(res: Response) {
  if (res.status === 401) { clearToken(); location.reload(); throw new Error('Sessao expirada'); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erro na requisicao');
  return res.json();
}

// ---- Autenticacao ----
export async function login(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await handle(res);
  if (data.token) setToken(data.token);
  return data;
}
export async function register(payload: { email: string; password: string; name?: string; businessName: string; niche?: string }): Promise<any> {
  const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await handle(res);
  if (data.token) setToken(data.token);
  return data;
}
export async function getMe(): Promise<any> {
  const res = await fetch('/api/me', { headers: authHeaders() });
  return handle(res);
}

// ---- Dados do painel (o backend restringe ao tenant do usuario logado) ----
export async function fetchTenants(): Promise<Tenant[]> {
  return handle(await fetch('/api/tenants', { headers: authHeaders() }));
}
export async function fetchTenantDetails(id: string): Promise<Tenant> {
  return handle(await fetch(`/api/tenants/${id}`, { headers: authHeaders() }));
}
export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  return handle(await fetch(`/api/tenants/${id}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }));
}
export async function fetchContacts(tenantId: string): Promise<Contact[]> {
  return handle(await fetch(`/api/contacts/${tenantId}`, { headers: authHeaders() }));
}
export async function saveContact(tenantId: string, contact: Partial<Contact>): Promise<Contact> {
  return handle(await fetch(`/api/contacts/${tenantId}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(contact) }));
}
export async function deleteContact(tenantId: string, id: string): Promise<{ success: boolean }> {
  return handle(await fetch(`/api/contacts/${tenantId}/delete`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ id }) }));
}
export async function fetchMessages(contactId: string): Promise<Message[]> {
  return handle(await fetch(`/api/messages/${contactId}`, { headers: authHeaders() }));
}
export async function sendMessage(contactId: string, data: any): Promise<Message> {
  return handle(await fetch(`/api/messages/${contactId}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }));
}
export async function fetchWebhookLogs(tenantId: string): Promise<WebhookLog[]> {
  return handle(await fetch(`/api/webhook-logs/${tenantId}`, { headers: authHeaders() }));
}
export async function fetchAuditLogs(tenantId: string): Promise<AuditLog[]> {
  return handle(await fetch(`/api/audit-logs/${tenantId}`, { headers: authHeaders() }));
}

// Co-piloto de IA (opcional; se nao houver endpoint, o painel ignora com try/catch)
export async function suggestReply(): Promise<{ suggestion: string }> { return { suggestion: '' }; }
export async function magicEnhance(text: string): Promise<{ output: string }> { return { output: text }; }
export async function aiAutoRespond(): Promise<any> { return {}; }
export async function adminCreateTenant(): Promise<any> { return {}; }
export async function adminUpdateTenantStatus(): Promise<any> { return {}; }
