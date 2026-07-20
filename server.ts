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

// -------------------------------------------------------------------
// Conexao com o Supabase (schema caro)
// -------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 8,
});

// -------------------------------------------------------------------
// E-mail (Resend) + limites por plano
// -------------------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || 'CA.RO ZAP <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'https://caro-zap-production.up.railway.app';

// Limite de mensagens de IA por plano
const LIMITES: Record<string, number> = {
  free: 200, essencial: 1000, profissional: 3000, premium: 10000,
};

// Envia e-mail via Resend. Se a chave nao existir, apenas registra e segue (nunca derruba o fluxo).
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn('[email] RESEND_API_KEY ausente — nao enviei para', to); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
    });
    if (!r.ok) { console.error('[email] Resend falhou', r.status, await r.text()); return false; }
    return true;
  } catch (e) { console.error('[email] erro', e); return false; }
}

function emailAcesso(email: string, senha: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#111">
    <h2 style="color:#16a34a">Bem-vindo(a) ao CA.RO ZAP 💚</h2>
    <p>Sua conta está pronta! Use os dados abaixo para entrar no painel:</p>
    <p style="background:#f4f7f5;padding:16px;border-radius:10px">
      <b>Painel:</b> <a href="${APP_URL}">${APP_URL}</a><br>
      <b>Login:</b> ${email}<br>
      <b>Senha:</b> ${senha}
    </p>
    <p style="color:#555;font-size:13px">Recomendamos trocar a senha após o primeiro acesso.</p>
  </div>`;
}

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
  // Auto-migracao: colunas de persona e de medicao de uso (seguro rodar varias vezes)
  await q(`alter table caro.tenants add column if not exists assistente_nome text default '';`);
  await q(`alter table caro.tenants add column if not exists persona        text default '';`);
  await q(`alter table caro.tenants add column if not exists tom_de_voz     text default '';`);
  await q(`alter table caro.tenants add column if not exists uso_mensagens  int  default 0;`);
  await q(`alter table caro.tenants add column if not exists uso_reset_em   date default current_date;`);
}

// -------------------------------------------------------------------
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
    const { email, password, name, businessName, niche, instance, plan } = req.body;
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'Informe email, senha e nome do negocio.' });
    }
    const exists = await q('select id from caro.users where email = $1', [email.toLowerCase()]);
    if (exists.rowCount) return res.status(409).json({ error: 'Email ja cadastrado.' });

    const evoInstance = (instance || businessName)
      .toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    // Plano vindo da Kiwify (essencial/profissional/premium); default free
    const planoOk = ['essencial', 'profissional', 'premium'].includes(String(plan || '').toLowerCase())
      ? String(plan).toLowerCase() : 'free';

    const t = await q(
      `insert into caro.tenants (name, niche, plan, status, evolution_instance)
       values ($1,$2,$3,'active',$4) returning *`,
      [businessName, niche || '', planoOk, evoInstance]
    );
    const tenant = t.rows[0];
    const hash = await bcrypt.hash(password, 10);
    const u = await q(
      `insert into caro.users (email, password_hash, name, tenant_id, role)
       values ($1,$2,$3,$4,'admin') returning id`,
      [email.toLowerCase(), hash, name || '', tenant.id]
    );
    // Boas-vindas por e-mail (nao bloqueia se o e-mail falhar)
    await sendEmail(email.toLowerCase(), 'Seu acesso ao CA.RO ZAP', emailAcesso(email.toLowerCase(), password));
    const token = jwt.sign({ uid: u.rows[0].id, tid: tenant.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, tenant: mapTenant(tenant), plano: planoOk });
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

// Esqueci minha senha: gera uma senha nova e envia por e-mail (fluxo simples, sem pagina extra)
app.post('/api/auth/forgot', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const r = await q('select id from caro.users where email = $1', [email]);
    // resposta neutra: nao revela se o email existe
    if (!r.rowCount) return res.json({ ok: true });
    const nova = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    const hash = await bcrypt.hash(nova, 10);
    await q('update caro.users set password_hash = $1 where id = $2', [hash, r.rows[0].id]);
    await sendEmail(email, 'Sua nova senha do CA.RO ZAP',
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
        <h2 style="color:#16a34a">Redefinição de senha</h2>
        <p>Geramos uma senha nova para sua conta:</p>
        <p style="background:#f4f7f5;padding:16px;border-radius:10px"><b>Nova senha:</b> ${nova}</p>
        <p>Entre em <a href="${APP_URL}">${APP_URL}</a> e troque por uma de sua preferência.</p>
      </div>`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Trocar a senha (usuario logado)
app.post('/api/auth/change-password', auth, async (req: any, res) => {
  try {
    const { atual, nova } = req.body;
    if (!nova || String(nova).length < 6) return res.status(400).json({ error: 'A nova senha precisa ter ao menos 6 caracteres.' });
    const r = await q('select password_hash from caro.users where id = $1', [req.userId]);
    if (!r.rowCount) return res.status(404).json({ error: 'Usuario nao encontrado.' });
    const ok = await bcrypt.compare(atual || '', r.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(nova, 10);
    await q('update caro.users set password_hash = $1 where id = $2', [hash, req.userId]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// -------------------------------------------------------------------
// API DO MOTOR (multi-cliente)
// O motor no n8n nao alcanca o Supabase direto; ele pergunta aqui.
// Protegido por chave compartilhada (header x-motor-key).
// -------------------------------------------------------------------
const MOTOR_KEY = process.env.MOTOR_KEY || '';

function motorAuth(req: any, res: any, next: any) {
  if (!MOTOR_KEY) return res.status(500).json({ error: 'MOTOR_KEY nao configurada no servidor.' });
  if (req.headers['x-motor-key'] !== MOTOR_KEY) return res.status(401).json({ error: 'Nao autorizado.' });
  next();
}

// Monta o texto de persona que a IA vai usar, a partir do que o cliente preencheu no painel
function montarPersona(t: any) {
  const assistente = (t.assistente_nome || '').trim() || 'Assistente';
  const empresa = t.name || 'a empresa';
  const partes = [
    `Voce e ${assistente}, assistente virtual de ${empresa}${t.niche ? ` (segmento: ${t.niche})` : ''}.`,
    `Sempre inicie suas mensagens com *${assistente}* em negrito do WhatsApp.`,
    `Voce fala em nome da empresa, na terceira pessoa, com simpatia e objetividade.`,
    t.tom_de_voz ? `Tom de voz: ${t.tom_de_voz}` : '',
    t.persona ? `Instrucoes do cliente: ${t.persona}` : '',
    t.kb_text ? `\n### Base de conhecimento\n${t.kb_text}` : '',
    t.kb_catalogue ? `\n### Produtos e precos\n${t.kb_catalogue}` : '',
    Array.isArray(t.kb_faqs) && t.kb_faqs.length
      ? `\n### Perguntas frequentes\n${t.kb_faqs.map((f: any) => `P: ${f.q || f.pergunta || ''}\nR: ${f.a || f.resposta || ''}`).join('\n')}`
      : '',
    `\nSe nao souber algo ou o cliente pedir um humano, ofereca transferir para a equipe.`,
  ];
  return partes.filter(Boolean).join('\n');
}

// Ajusta dados do cliente (administracao). Usado para configurar persona, plano e instancia.
app.patch('/api/motor/tenant/:id', motorAuth, async (req: any, res) => {
  try {
    const b = req.body || {};
    const r = await q(
      `update caro.tenants set
         assistente_nome    = coalesce($2, assistente_nome),
         persona            = coalesce($3, persona),
         tom_de_voz         = coalesce($4, tom_de_voz),
         plan               = coalesce($5, plan),
         evolution_instance = coalesce($6, evolution_instance),
         whatsapp_number    = coalesce($7, whatsapp_number),
         status             = coalesce($8, status)
       where id = $1
       returning id, name, assistente_nome, plan, status, evolution_instance, whatsapp_number`,
      [
        req.params.id,
        b.assistenteNome ?? null,
        b.persona ?? null,
        b.tomDeVoz ?? null,
        b.plano ?? null,
        b.instancia ?? null,
        b.numero ?? null,
        b.status ?? null,
      ]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Cliente nao encontrado' });
    res.json({ ok: true, cliente: r.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Lista os clientes (para diagnostico/administracao do motor)
app.get('/api/motor/tenants', motorAuth, async (_req: any, res) => {
  try {
    const r = await q(
      `select id, name, plan, status, evolution_instance, whatsapp_number,
              coalesce(uso_mensagens,0) as uso_mensagens
         from caro.tenants order by created_at asc limit 200`
    );
    res.json({ total: r.rowCount, clientes: r.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// O motor chama isto a cada mensagem para saber de quem e e como responder
app.get('/api/motor/tenant', motorAuth, async (req: any, res) => {
  try {
    const instance = String(req.query.instance || '').trim();
    const numero = String(req.query.numero || '').replace(/\D/g, '');
    if (!instance && !numero) return res.status(400).json({ error: 'Informe instance ou numero.' });

    // Comparacao tolerante: ignora maiusculas, espacos, acentos e simbolos
    const r = await q(
      `select * from caro.tenants
        where ($1 <> '' and lower(regexp_replace(coalesce(evolution_instance,''),'[^a-zA-Z0-9]+','','g'))
                          = lower(regexp_replace($1,'[^a-zA-Z0-9]+','','g')))
           or ($1 <> '' and lower(regexp_replace(coalesce(name,''),'[^a-zA-Z0-9]+','','g'))
                          = lower(regexp_replace($1,'[^a-zA-Z0-9]+','','g')))
           or ($2 <> '' and regexp_replace(coalesce(whatsapp_number,''),'\\D','','g') = $2)
        limit 1`,
      [instance, numero]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Cliente nao encontrado', ativo: false });

    const t = r.rows[0];
    const plano = String(t.plan || 'free').toLowerCase();
    const limite = plano === 'cortesia' ? 999999999 : (LIMITES[plano] ?? LIMITES.free);

    // Reinicia o contador quando vira o mes
    let uso = Number(t.uso_mensagens || 0);
    const reset = t.uso_reset_em ? new Date(t.uso_reset_em) : null;
    const agora = new Date();
    const virouMes = !reset || reset.getMonth() !== agora.getMonth() || reset.getFullYear() !== agora.getFullYear();
    if (virouMes) {
      await q('update caro.tenants set uso_mensagens = 0, uso_reset_em = current_date where id = $1', [t.id]);
      uso = 0;
    }

    const dentroDoLimite = uso < limite;
    const ativo = String(t.status || 'active') === 'active' && dentroDoLimite;

    res.json({
      ativo,
      motivo: !dentroDoLimite ? 'limite_atingido' : (String(t.status) !== 'active' ? 'assinatura_inativa' : null),
      tenantId: t.id,
      empresa: t.name,
      assistente: (t.assistente_nome || '').trim() || 'Assistente',
      instancia: t.evolution_instance,
      plano, limite, uso, restante: Math.max(0, limite - uso),
      persona: montarPersona(t),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// O motor chama isto depois de responder, para contar a mensagem
app.post('/api/motor/uso', motorAuth, async (req: any, res) => {
  try {
    const { tenantId, instance, quantidade } = req.body || {};
    const qtd = Math.max(1, Number(quantidade) || 1);
    const r = await q(
      `update caro.tenants
          set uso_mensagens = coalesce(uso_mensagens,0) + $1
        where ($2::uuid is not null and id = $2::uuid)
           or ($3 <> '' and evolution_instance = $3)
        returning id, plan, uso_mensagens, status`,
      [qtd, tenantId || null, String(instance || '')]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Cliente nao encontrado' });
    const t = r.rows[0];
    const plano = String(t.plan || 'free').toLowerCase();
    const limite = plano === 'cortesia' ? 999999999 : (LIMITES[plano] ?? LIMITES.free);
    res.json({ ok: true, uso: t.uso_mensagens, limite, restante: Math.max(0, limite - t.uso_mensagens), bloqueado: t.uso_mensagens >= limite });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', auth, async (req: any, res) => {
  const u = await q('select id, email, name, role, tenant_id from caro.users where id = $1', [req.userId]);
  res.json(u.rows[0] || null);
});

// -------------------------------------------------------------------
// Dados do painel (sempre restritos ao tenant do usuario logado)
// -------------------------------------------------------------------
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
  // confere que o contato pertence ao tenant do usuario
  const own = await q('select id from caro.contacts where id = $1 and tenant_id = $2', [req.params.contactId, req.tenantId]);
  if (!own.rowCount) return res.status(403).json({ error: 'Sem acesso a este contato.' });
  const r = await q('select * from caro.messages where contact_id = $1 order by created_at asc', [req.params.contactId]);
  res.json(r.rows.map(mapMessage));
});

app.post('/api/messages/:contactId', auth, async (req: any, res) => {
  try {
    const own = await q('select id from caro.contacts where id = $1 and tenant_id = $2', [req.params.contactId, req.tenantId]);
    if (!own.rowCount) return res.status(403).json({ error: 'Sem acesso.' });
    const b = req.body || {};
    const r = await q(
      `insert into caro.messages (tenant_id, contact_id, sender, body, type, is_internal_note, author_name)
       values ($1,$2,$3,$4,coalesce($5,'text'),coalesce($6,false),$7) returning *`,
      [req.tenantId, req.params.contactId, b.sender || 'agent', b.body || '', b.type || null, b.isInternalNote || false, b.authorName || null]
    );
    await q('update caro.contacts set last_message_at = now() where id = $1', [req.params.contactId]);
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
// -------------------------------------------------------------------
// -------------------------------------------------------------------
// Politica de Privacidade e Termos (exigidos pelo App Review do Meta)
// -------------------------------------------------------------------
const PAGINA_LEGAL = (titulo: string, corpo: string) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} — CA.RO ZAP</title>
<style>
 body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f6f8f7;color:#16211b;margin:0;padding:40px 20px;line-height:1.7}
 .box{max-width:780px;margin:auto;background:#fff;border-radius:16px;padding:44px 40px;box-shadow:0 6px 30px rgba(0,0,0,.06)}
 h1{font-size:30px;margin:0 0 6px} h2{font-size:19px;margin:32px 0 10px;color:#0e7d44}
 .marca{display:inline-flex;align-items:center;gap:10px;font-weight:800;color:#0e7d44;margin-bottom:18px}
 .marca span{width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#1dff78,#07954a);display:grid;place-items:center;color:#04170c}
 small{color:#69796f} ul{padding-left:20px} a{color:#0e7d44}
 footer{margin-top:36px;padding-top:18px;border-top:1px solid #e6ebe8;color:#69796f;font-size:14px}
</style></head><body><div class="box">
<div class="marca"><span>C</span> CA.RO ZAP</div>
<h1>${titulo}</h1><small>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</small>
${corpo}
<footer>CA.RO ZAP é um produto da <b>CA.RO TECH</b>. Dúvidas sobre privacidade e dados: <a href="mailto:contato@carostudio.com.br">contato@carostudio.com.br</a></footer>
</div></body></html>`;

app.get('/privacidade', (_req, res) => {
  res.type('html').send(PAGINA_LEGAL('Política de Privacidade', `
<h2>1. Quem somos</h2>
<p>O CA.RO ZAP é uma plataforma de atendimento e vendas por WhatsApp com inteligência artificial, operada pela CA.RO TECH. Esta política explica quais dados tratamos, por quê, e quais são os seus direitos.</p>

<h2>2. Dados que coletamos</h2>
<ul>
  <li><b>Do cliente assinante:</b> nome, e-mail, nome do negócio, segmento e dados de acesso ao painel.</li>
  <li><b>Das conversas de WhatsApp:</b> número de telefone, nome de exibição e o conteúdo das mensagens trocadas entre o assinante e os contatos dele.</li>
  <li><b>Configurações da IA:</b> textos, perguntas frequentes e catálogos que o assinante cadastra para treinar o atendimento.</li>
  <li><b>Dados técnicos:</b> registros de uso, data e hora das interações e métricas de volume de mensagens.</li>
</ul>

<h2>3. Como usamos os dados</h2>
<ul>
  <li>Para gerar respostas automáticas de atendimento em nome do assinante.</li>
  <li>Para exibir o histórico de conversas e o funil de vendas no painel do assinante.</li>
  <li>Para medir o consumo de mensagens conforme o plano contratado.</li>
  <li>Para suporte técnico, segurança e prevenção a abusos.</li>
</ul>
<p>Não vendemos dados pessoais e não usamos o conteúdo das conversas dos assinantes para publicidade.</p>

<h2>4. Compartilhamento com terceiros</h2>
<p>Compartilhamos dados apenas com prestadores necessários à operação, e somente no limite exigido:</p>
<ul>
  <li><b>Meta Platforms (WhatsApp Business Platform):</b> envio e recebimento das mensagens.</li>
  <li><b>Provedores de modelo de linguagem:</b> processamento do texto para gerar a resposta.</li>
  <li><b>Infraestrutura de nuvem e banco de dados:</b> hospedagem e armazenamento.</li>
  <li><b>Processador de pagamentos:</b> cobrança da assinatura.</li>
</ul>

<h2>5. Retenção e exclusão</h2>
<p>Mantemos os dados enquanto a assinatura estiver ativa. Após o encerramento, os dados são eliminados ou anonimizados em até 90 dias, salvo obrigação legal de guarda. O assinante pode solicitar a exclusão a qualquer momento.</p>

<h2>6. Segurança</h2>
<p>Adotamos criptografia em trânsito, controle de acesso por autenticação e senhas armazenadas com hash. Cada assinante acessa exclusivamente os dados do próprio negócio.</p>

<h2>7. Seus direitos (LGPD)</h2>
<p>Nos termos da Lei nº 13.709/2018, você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, bem como revogar consentimento. Basta escrever para o contato no rodapé.</p>

<h2>8. Contatos que iniciam conversa</h2>
<p>Quando alguém envia mensagem ao WhatsApp de um assinante, tratamos esses dados como operadores, em nome do assinante, que é o controlador da relação com o próprio cliente.</p>

<h2>9. Alterações</h2>
<p>Podemos atualizar esta política. Mudanças relevantes serão comunicadas pelo painel ou por e-mail.</p>
`));
});

app.get('/termos', (_req, res) => {
  res.type('html').send(PAGINA_LEGAL('Termos de Uso', `
<h2>1. Objeto</h2>
<p>O CA.RO ZAP fornece, por assinatura, uma plataforma de atendimento automatizado por WhatsApp com inteligência artificial, painel de acompanhamento e funil de vendas.</p>

<h2>2. Assinatura e planos</h2>
<p>Os planos possuem limite mensal de mensagens de IA, informado no momento da contratação. Ao atingir o limite, o atendimento automático é pausado até a renovação do ciclo ou a mudança de plano. Não há fidelidade; o cancelamento pode ser feito a qualquer momento.</p>

<h2>3. Responsabilidades do assinante</h2>
<ul>
  <li>Fornecer informações verdadeiras para o treinamento da IA.</li>
  <li>Utilizar a plataforma em conformidade com as políticas do WhatsApp e com a legislação vigente.</li>
  <li>Não enviar mensagens não solicitadas em massa, conteúdo ilícito, enganoso ou que viole direitos de terceiros.</li>
  <li>Manter a confidencialidade das credenciais de acesso.</li>
</ul>

<h2>4. Uso da inteligência artificial</h2>
<p>As respostas são geradas automaticamente a partir das informações cadastradas pelo assinante. O assinante é responsável pelo conteúdo que disponibiliza e deve revisar informações sensíveis, como preços e condições comerciais.</p>

<h2>5. Disponibilidade</h2>
<p>Empregamos esforços para manter o serviço disponível de forma contínua, mas ele pode sofrer interrupções por manutenção ou por indisponibilidade de terceiros, incluindo a plataforma do WhatsApp.</p>

<h2>6. Suspensão</h2>
<p>Podemos suspender contas em caso de inadimplência, uso abusivo, violação destes termos ou das políticas do WhatsApp.</p>

<h2>7. Foro</h2>
<p>Aplica-se a legislação brasileira, ficando eleito o foro do domicílio do assinante para dirimir controvérsias.</p>
`));
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`CA.RO ZAP plataforma na porta ${PORT}`)))
  .catch((e) => { console.error('Falha ao preparar schema:', e); app.listen(PORT); });
