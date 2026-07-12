/**
 * CA.RO ZAP — Backend da Plataforma (multi-tenant / SaaS)
 * ------------------------------------------------------------------
 * Serve o painel React e expoe uma API ligada ao Supabase (schema `caro`),
 * as MESMAS tabelas que o motor no n8n preenche a partir do WhatsApp.
 * Cada usuario (assinante) tem login proprio e ve apenas o seu tenant.
 *
 * Variaveis de ambiente:
 *   DATABASE_URL  -> string de conexao Postgres do Supabase (Session Pooler)
 *   JWT_SECRET    -> segredo para assinar os tokens de login
 *   PORT          -> porta (Railway injeta automaticamente)
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evolution-api-production-bbc0.up.railway.app';
const EVOLUTION_APIKEY = process.env.EVOLUTION_APIKEY || '';
async function sendWhatsapp(instance: any, phone: any, text: any) {
  if (!EVOLUTION_APIKEY || !instance || !phone || !text) return;
  try {
    await fetch(EVOLUTION_URL + '/message/sendText/' + instance, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_APIKEY },
      body: JSON.stringify({ number: phone, text }),
    });
  } catch (e) { console.error('Evolution send failed:', e); }
}

// -------------------------------------------------------------------
// Conexao com o Supabase (schema caro)
// -------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 8,
});

async function q(text: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Garante a tabela de usuarios da plataforma (login por assinante)
async function ensureSchema() {
  await q(`create schema if not exists caro;`);
  await q(`
    create table if not exists caro.users (
      id            uuid primary key default gen_random_uuid(),
      email         text unique not null,
      password_hash text not null,
      name          text default '',
      tenant_id     uuid references caro.tenants(id) on delete cascade,
      role          text default 'admin',
      created_at    timestamptz default now()
    );
  `);
}

// ------------------------------------------------------------------
// Mapeadores: colunas snake_case do banco -> tipos camelCase do app
// -------------------------------------------------------------------
function mapTenant(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    niche: r.niche,
    plan: r.plan,
    status: r.status,
    createdAt: r.created_at,
    whatsappConnected: r.whatsapp_connected,
    whatsappNumber: r.whatsapp_number,
    webhookUrl: r.webhook_url,
    sectors: r.sectors || [],
    knowledgeBase: {
      text: r.kb_text || '',
      faqs: r.kb_faqs || [],
      catalogue: r.kb_catalogue || '',
    },
    chatbotConfig: [],
    evolutionInstance: r.evolution_instance,
  };
}

function mapContact(r: any) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email || '',
    tags: r.tags || [],
    pipelineStage: r.pipeline_stage || 'novo',
    assignedTo: r.assigned_to || null,
    customFields: r.custom_fields || {},
    notes: [],
    lastMessageAt: r.last_message_at,
    avatarUrl: r.avatar_url || undefined,
    leadScore: r.lead_score || null,
    leadReason: r.lead_reason || null,
    aiAutoReply: r.ai_auto_reply,
  };
}

function mapMessage(r: any) {
  return {
    id: r.id,
    contactId: r.contact_id,
    sender: r.sender,
    body: r.body,
    type: r.type,
    mediaUrl: r.media_url || undefined,
    createdAt: r.created_at,
    isInternalNote: r.is_internal_note,
    authorName: r.author_name || undefined,
  };
}

// -------------------------------------------------------------------
// Autenticacao
// -------------------------------------------------------------------
function auth(req: any, res: any, next: any) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Nao autenticado' });
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    req.userId = payload.uid;
    req.tenantId = payload.tid;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

// Cadastro: cria um tenant novo + o usuario dono dele (1 assinante = 1 perfil de IA)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName, niche, instance } = req.body;
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'Informe email, senha e nome do negocio.' });
    }
    const exists = await q('select id from caro.users where email = $1', [email.toLowerCase()]);
    if (exists.rowCount) return res.status(409).json({ error: 'Email ja cadastrado.' });

    const evoInstance = (instance || businessName)
      .toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const t = await q(
      `insert into caro.tenants (name, niche, plan, status, evolution_instance)
       values ($1,$2,'free','active',$3) returning *`,
      [businessName, niche || '', evoInstance]
    );
    const tenant = t.rows[0];
    const hash = await bcrypt.hash(password, 10);
    const u = await q(
      `insert into caro.users (email, password_hash, name, tenant_id, role)
       values ($1,$2,$3,$4,'admin') returning id`,
      [email.toLowerCase(), hash, name || '', tenant.id]
    );
    const token = jwt.sign({ uid: u.rows[0].id, tid: tenant.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, tenant: mapTenant(tenant) });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await q('select * from caro.users where email = $1', [(email || '').toLowerCase()]);
    if (!r.rowCount) return res.status(401).json({ error: 'Credenciais invalidas.' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais invalidas.' });
    const token = jwt.sign({ uid: user.id, tid: user.tenant_id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/me', auth, async (req: any, res) => {
  const u = await q('select id, email, name, role, tenant_id from caro.users where id = $1', [req.userId]);
  res.json(u.rows[0] || null);
});

// -------------------------------------------------------------------
// Dados do painel (sempre restritos ao tenant do usuario logado)
// ------------------------------------------------------------------
app.get('/api/tenants', auth, async (req: any, res) => {
  const r = await q('select * from caro.tenants where id = $1', [req.tenantId]);
  res.json(r.rows.map(mapTenant));
});

app.get('/api/tenants/:id', auth, async (req: any, res) => {
  const r = await q('select * from caro.tenants where id = $1', [req.tenantId]);
  res.json(mapTenant(r.rows[0]));
});

// Atualiza o tenant — inclui a persona/treinamento da IA (kb_text, kb_faqs, kb_catalogue)
app.post('/api/tenants/:id', auth, async (req: any, res) => {
  try {
    const b = req.body || {};
    const kb = b.knowledgeBase || {};
    await q(
      `update caro.tenants set
         name = coalesce($2, name),
         niche = coalesce($3, niche),
         kb_text = coalesce($4, kb_text),
         kb_catalogue = coalesce($5, kb_catalogue),
         kb_faqs = coalesce($6, kb_faqs),
         webhook_url = coalesce($7, webhook_url),
         whatsapp_number = coalesce($8, whatsapp_number)
       where id = $1`,
      [
        req.tenantId,
        b.name ?? null,
        b.niche ?? null,
        kb.text ?? null,
        kb.catalogue ?? null,
        kb.faqs ? JSON.stringify(kb.faqs) : null,
        b.webhookUrl ?? null,
        b.whatsappNumber ?? null,
      ]
    );
    const r = await q('select * from caro.tenants where id = $1', [req.tenantId]);
    res.json(mapTenant(r.rows[0]));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/contacts/:tenantId', auth, async (req: any, res) => {
  const r = await q(
    'select * from caro.contacts where tenant_id = $1 order by last_message_at desc limit 500',
    [req.tenantId]
  );
  res.json(r.rows.map(mapContact));
});

app.post('/api/contacts/:tenantId', auth, async (req: any, res) => {
  try {
    const c = req.body || {};
    if (c.id) {
      await q(
        `update caro.contacts set
           name = coalesce($2,name), email = coalesce($3,email),
           tags = coalesce($4,tags), pipeline_stage = coalesce($5,pipeline_stage),
           assigned_to = coalesce($6,assigned_to), lead_score = coalesce($7,lead_score)
         where id = $1 and tenant_id = $8`,
        [c.id, c.name ?? null, c.email ?? null,
         c.tags ? JSON.stringify(c.tags) : null, c.pipelineStage ?? null,
         c.assignedTo ?? null, c.leadScore ?? null, req.tenantId]
      );
      const r = await q('select * from caro.contacts where id = $1', [c.id]);
      return res.json(mapContact(r.rows[0]));
    }
    const r = await q(
      `insert into caro.contacts (tenant_id, name, phone, email, pipeline_stage)
       values ($1,$2,$3,$4,coalesce($5,'novo')) returning *`,
      [req.tenantId, c.name || '', c.phone || '', c.email || '', c.pipelineStage || null]
    );
    res.json(mapContact(r.rows[0]));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages/:contactId', auth, async (req: any, res) => {
  const own = await q('select c.id, c.phone, t.evolution_instance as instance from caro.contacts c join caro.tenants t on t.id = c.tenant_id where c.id = $1 and c.tenant_id = $2', [req.params.contactId, req.tenantId]);
  if (!own.rowCount) return res.status(403).json({ error: 'Sem acesso a este contato.' });
  const r = await q('select * from caro.messages where contact_id = $1 order by created_at asc', [req.params.contactId]);
  res.json(r.rows.map(mapMessage));
});

app.post('/api/messages/:contactId', auth, async (req: any, res) => {
  try {
    const own = await q('select c.id, c.phone, t.evolution_instance as instance from caro.contacts c join caro.tenants t on t.id = c.tenant_id where c.id = $1 and c.tenant_id = $2', [req.params.contactId, req.tenantId]);
    if (!own.rowCount) return res.status(403).json({ error: 'Sem acesso.' });
    const b = req.body || {};
    const r = await q(
      `insert into caro.messages (tenant_id, contact_id, sender, body, type, is_internal_note, author_name)
       values ($1,$2,$3,$4,coalesce($5,'text'),coalesce($6,false),$7) returning *`,
      [req.tenantId, req.params.contactId, b.sender || 'agent', b.body || '', b.type || null, b.isInternalNote || false, b.authorName || null]
    );
    await q('update caro.contacts set last_message_at = now() where id = $1', [req.params.contactId]);
    if (!b.isInternalNote) {
      await sendWhatsapp(own.rows[0].instance, own.rows[0].phone, b.body || '');
      await q('update caro.contacts set ai_auto_reply = false where id = $1', [req.params.contactId]);
    }
    res.json(mapMessage(r.rows[0]));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/audit-logs/:tenantId', auth, async (req: any, res) => {
  const r = await q('select * from caro.audit_logs where tenant_id = $1 order by created_at desc limit 100', [req.tenantId]);
  res.json(r.rows.map((x: any) => ({ id: x.id, tenantId: x.tenant_id, user: x.user, action: x.action, details: x.details, timestamp: x.created_at })));
});

app.get('/api/webhook-logs/:tenantId', auth, async (req: any, res) => {
  const r = await q('select * from caro.webhook_logs where tenant_id = $1 order by created_at desc limit 100', [req.tenantId]);
  res.json(r.rows.map((x: any) => ({ id: x.id, timestamp: x.created_at, event: x.event, payload: JSON.stringify(x.payload), status: x.status })));
});

app.get('/api/health', async (_req, res) => {
  try { await q('select 1'); res.json({ ok: true }); }
  catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
});

// -------------------------------------------------------------------
// Servir o painel React (build do Vite em /dist)
// ------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`CA.RO ZAP plataforma na porta ${PORT}`)))
  .catch((e) => { console.error('Falha ao preparar schema:', e); app.listen(PORT); });
