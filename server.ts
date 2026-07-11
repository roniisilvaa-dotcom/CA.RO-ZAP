import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Tenant, Contact, Message, WebhookLog, AuditLog, ChatbotStep } from './src/types';

// Initialize Express
const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const aiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

if (aiKey && aiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey: aiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI initialized successfully.');
  } catch (err) {
    console.error('Error initializing Gemini AI:', err);
  }
} else {
  console.log('Gemini API key is not configured or is placeholder. Falling back to mock responses.');
}

// -------------------------------------------------------------
// IN-MEMORY HIGH FIDELITY STORAGE FOR THE PREVIEW SESSION
// -------------------------------------------------------------

// Pre-defined sectors
const DEFAULT_SECTORS = ['Comercial', 'Suporte', 'Financeiro', 'Pós-Venda'];

// Initial Chatbot Config
const DEFAULT_CHATBOT: ChatbotStep[] = [
  {
    id: 'step_1',
    type: 'message',
    label: 'Saudação Inicial',
    content: 'Olá! Seja muito bem-vindo ao nosso atendimento inteligente. Como posso te ajudar hoje?',
    nextStepId: 'step_2',
  },
  {
    id: 'step_2',
    type: 'menu',
    label: 'Menu Principal',
    content: 'Selecione uma das opções abaixo:',
    options: [
      { label: 'Saber mais sobre serviços/preços', nextStepId: 'step_services' },
      { label: 'Falar com um atendente humano', nextStepId: 'step_transfer' },
      { label: 'Dúvidas Frequentes (FAQ)', nextStepId: 'step_faq' },
    ],
  },
  {
    id: 'step_services',
    type: 'message',
    label: 'Informações de Serviços',
    content: 'Nossa Inteligência Artificial conhece tudo sobre nossos produtos e serviços. Basta digitar sua dúvida a qualquer momento e ela responderá detalhadamente!',
    nextStepId: 'step_2',
  },
  {
    id: 'step_faq',
    type: 'message',
    label: 'Informações FAQ',
    content: 'Pergunte-me qualquer coisa! Eu fui treinado com a base de conhecimento oficial e posso esclarecer suas dúvidas em segundos.',
    nextStepId: 'step_2',
  },
  {
    id: 'step_transfer',
    type: 'transfer',
    label: 'Transferir para Atendente',
    content: 'Perfeito! Estou transferindo você para um de nossos especialistas no setor Comercial. Por favor, aguarde um instante.',
  }
];

// Initial multi-tenant database
let tenants: Tenant[] = [
  {
    id: 'tenant_barbearia',
    name: 'Corte Fino Grooming',
    niche: 'Barbearia & Estética',
    plan: 'business',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    whatsappConnected: true,
    whatsappNumber: '+55 11 99999-1111',
    sectors: [...DEFAULT_SECTORS, 'Estética'],
    webhookUrl: 'https://n8n.seuservidor.com/webhook/corte-fino-zap',
    knowledgeBase: {
      text: 'A Corte Fino é uma barbearia premium fundada em 2022. Oferecemos cortes modernos, barba com toalha quente, hidratação capilar e podologia masculina. Temos estacionamento gratuito para clientes e servimos cerveja artesanal cortesia. Endereço: Av. Brigadeiro Luís Antônio, 2500, Jardins, São Paulo. Nosso site para agendamentos diretos é cortefino.com.br.',
      faqs: [
        { q: 'Qual o horário de funcionamento?', a: 'Funcionamos de Segunda a Sábado das 09:00 às 20:00.' },
        { q: 'Precisa agendar horário?', a: 'Atendemos tanto por agendamento via site/WhatsApp quanto por ordem de chegada, mas o agendamento garante que você não pegará fila.' },
        { q: 'Quais os métodos de pagamento?', a: 'Aceitamos Pix, cartões de crédito/débito das principais bandeiras e dinheiro.' }
      ],
      catalogue: 'Corte de Cabelo: R$ 60\nBarba Clássica: R$ 40\nCombo Corte + Barba: R$ 90\nSelagem Redutora: R$ 120\nTratamento de Caspa: R$ 50'
    },
    chatbotConfig: [...DEFAULT_CHATBOT],
  },
  {
    id: 'tenant_clinica',
    name: 'Clinica Vitallis',
    niche: 'Clínica Médica & Bem-Estar',
    plan: 'enterprise',
    status: 'active',
    createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    whatsappConnected: true,
    whatsappNumber: '+55 11 98888-2222',
    sectors: [...DEFAULT_SECTORS, 'Médico', 'Exames'],
    webhookUrl: 'https://n8n.seuservidor.com/webhook/clinica-vitallis',
    knowledgeBase: {
      text: 'A Clínica Vitallis é uma referência em consultas médicas preventivas e exames de imagem. Contamos com especialistas em Cardiologia, Ginecologia, Pediatria, Nutrição e Clínica Geral. Localizada no Centro de Alphaville, Barueri - SP. Nosso site é clinicavitallis.com.br.',
      faqs: [
        { q: 'Aceitam planos de saúde?', a: 'Sim, atendemos Amil, Bradesco Saúde, SulAmérica, NotreDame Intermédica e Porto Seguro para a maioria das especialidades.' },
        { q: 'Como faço para marcar exames?', a: 'Você pode enviar a foto da sua guia médica aqui no WhatsApp e nosso setor de Exames fará o agendamento em instantes.' },
        { q: 'Qual o valor da consulta particular?', a: 'O valor padrão da consulta particular com clínico geral é R$ 250. Outras especialidades sob consulta.' }
      ],
      catalogue: 'Consulta Clínica Geral: R$ 250\nConsulta Cardiologia: R$ 350\nEletrocardiograma: R$ 120\nUltrassonografia Abdominal: R$ 220\nCheck-up Preventivo Anual: R$ 600'
    },
    chatbotConfig: [...DEFAULT_CHATBOT],
  },
  {
    id: 'tenant_imobiliaria',
    name: 'Imóveis Solar',
    niche: 'Imobiliária & Consultoria',
    plan: 'start',
    status: 'active',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    whatsappConnected: false,
    whatsappNumber: '',
    sectors: [...DEFAULT_SECTORS, 'Vendas', 'Locação', 'Jurídico'],
    webhookUrl: 'https://n8n.seuservidor.com/webhook/imoveis-solar',
    knowledgeBase: {
      text: 'A Imóveis Solar é especializada em compra, venda e locação de imóveis residenciais de médio e alto padrão na zona sul do Rio de Janeiro. Fazemos avaliações gratuitas de imóveis e assessoria jurídica completa para financiamento bancário.',
      faqs: [
        { q: 'Quais documentos preciso para alugar?', a: 'RG, CPF, comprovante de rendimentos (superior a 3x o aluguel) e garantia (aceitamos caução de 3 meses, fiador ou seguro fiança).' },
        { q: 'Vocês ajudam a aprovar financiamento?', a: 'Sim! Temos parceria com Caixa Econômica, Itaú e Bradesco e cuidamos de todo o processo de aprovação de crédito sem taxas adicionais.' },
        { q: 'Posso anunciar meu imóvel com vocês?', a: 'Claro! Basta enviar fotos e detalhes e cadastramos gratuitamente nos portais Zap, VivaReal e em nossa base.' }
      ],
      catalogue: 'Apartamento Copacabana (2 quartos, reformado): R$ 750.000\nCobertura Leblon (3 suítes, vista mar): R$ 2.400.000\nCasa em Condomínio Barra da Tijuca: R$ 1.950.000\nAluguel Apartamento Ipanema (1 quarto mobiliado): R$ 3.500/mês'
    },
    chatbotConfig: [...DEFAULT_CHATBOT],
  }
];

// In-memory contacts
let contacts: Record<string, Contact[]> = {
  tenant_barbearia: [
    {
      id: 'c_b1',
      name: 'Carlos Oliveira (Cliente Recorrente)',
      phone: '+55 11 91234-5678',
      email: 'carlos.oliveira@email.com',
      tags: ['Cliente Vip', 'Corte + Barba'],
      pipelineStage: 'contato',
      assignedTo: 'u_1',
      customFields: { preferência: 'Cerveja IPA', barbeiro: 'Thiago' },
      notes: [
        { id: 'n1', body: 'Gosta de corte degradê bem baixo nas laterais.', author: 'Atendente Thiago', createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() }
      ],
      lastMessageAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      leadScore: 'hot',
      leadReason: 'Cliente recorrente ativo agendando combo de fim de semana.',
      aiAutoReply: false,
    },
    {
      id: 'c_b2',
      name: 'Mariana Silva (Novos Serviços)',
      phone: '+55 11 97777-6666',
      email: 'mariana.silva@email.com',
      tags: ['Lead Frio'],
      pipelineStage: 'novo',
      assignedTo: null,
      customFields: { servico: 'Corte infantil para o filho' },
      notes: [],
      lastMessageAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      leadScore: 'warm',
      leadReason: 'Perguntou sobre preços de corte infantil, mas não respondeu ao orçamento final.',
      aiAutoReply: true,
    }
  ],
  tenant_clinica: [
    {
      id: 'c_c1',
      name: 'Dr. Roberto Santos',
      phone: '+55 11 93333-4444',
      email: 'roberto.santos@email.com',
      tags: ['Convênio Amil', 'Cardiologia'],
      pipelineStage: 'negociacao',
      assignedTo: 'u_2',
      customFields: { carteirinha: '83742834-00' },
      notes: [
        { id: 'n2', body: 'Enviou a guia médica para exame de Holter 24h.', author: 'Atendente Júlia', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() }
      ],
      lastMessageAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      leadScore: 'hot',
      leadReason: 'Guia médica elegível enviada, aguardando confirmação da Amil para fechar.',
      aiAutoReply: true,
    }
  ],
  tenant_imobiliaria: [
    {
      id: 'c_i1',
      name: 'Fernanda Lima',
      phone: '+55 21 98222-1111',
      email: 'fernanda.lima@email.com',
      tags: ['Procura Cobertura', 'Leblon'],
      pipelineStage: 'proposta',
      assignedTo: 'u_3',
      customFields: { orcamento: 'R$ 2.500.000', financiamento: 'Itaú' },
      notes: [
        { id: 'n3', body: 'Gostou muito da cobertura do Leblon de R$ 2.400.000. Agendando visita física para amanhã.', author: 'Corretor Bruno', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() }
      ],
      lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      leadScore: 'hot',
      leadReason: 'Intenção de compra altíssima, orçamento compatível e visita agendada.',
      aiAutoReply: false,
    }
  ]
};

// In-memory messages
let messages: Record<string, Message[]> = {
  c_b1: [
    { id: 'm1_1', contactId: 'c_b1', sender: 'customer', body: 'Olá, gostaria de marcar um horário para corte e barba neste sábado.', type: 'text', createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
    { id: 'm1_2', contactId: 'c_b1', sender: 'ai', body: 'Olá Carlos! Temos horários disponíveis no sábado às 10h, 14h e 16h com o barbeiro Thiago. Qual deles fica melhor para você?', type: 'text', createdAt: new Date(Date.now() - 23.9 * 3600 * 1000).toISOString() },
    { id: 'm1_3', contactId: 'c_b1', sender: 'customer', body: 'Pode ser às 10h. O Thiago já sabe como eu gosto do degradê.', type: 'text', createdAt: new Date(Date.now() - 23.8 * 3600 * 1000).toISOString() },
    { id: 'm1_4', contactId: 'c_b1', sender: 'agent', body: 'Perfeito, Carlos! Horário agendado para sábado às 10h com o Thiago. Separamos sua cerveja favorita IPA já gelando. Nos vemos lá!', type: 'text', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
  ],
  c_b2: [
    { id: 'm2_1', contactId: 'c_b2', sender: 'customer', body: 'Bom dia, vocês cortam cabelo de criança? Meu filho tem 4 anos.', type: 'text', createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
    { id: 'm2_2', contactId: 'c_b2', sender: 'ai', body: 'Olá Mariana! Sim! Temos barbeiros super pacientes e especializados em corte infantil. O corte infantil custa R$ 50 e inclui um pirulito e diversão garantida na nossa cadeira de carrinho! Gostaria de agendar para ele?', type: 'text', createdAt: new Date(Date.now() - 4.9 * 3600 * 1000).toISOString() },
    { id: 'm2_3', contactId: 'c_b2', sender: 'customer', body: 'Vou ver com o pai dele e te aviso em seguida.', type: 'text', createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString() }
  ],
  c_c1: [
    { id: 'm3_1', contactId: 'c_c1', sender: 'customer', body: 'Gostaria de agendar um eletrocardiograma e consulta com cardiologista.', type: 'text', createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: 'm3_2', contactId: 'c_c1', sender: 'ai', body: 'Olá Roberto! Maravilhoso. Aceitamos Amil para ambas as especialidades. Você poderia nos enviar a foto da guia médica do seu convênio para podermos validar os códigos e agendar?', type: 'text', createdAt: new Date(Date.now() - 1.9 * 3600 * 1000).toISOString() },
    { id: 'm3_3', contactId: 'c_c1', sender: 'customer', body: 'Aqui está a foto da guia da Amil.', type: 'text', createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
  ],
  c_i1: [
    { id: 'm4_1', contactId: 'c_i1', sender: 'customer', body: 'Ainda está disponível aquela cobertura duplex no Leblon por 2.4 milhões?', type: 'text', createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
    { id: 'm4_2', contactId: 'c_i1', sender: 'agent', body: 'Olá Fernanda! Sim, ela está disponível e é um dos imóveis mais cobiçados da região. Vista total para o mar, 3 suítes amplas e piscina privativa. Que tal fazermos uma visita amanhã à tarde?', type: 'text', createdAt: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString() },
    { id: 'm4_3', contactId: 'c_i1', sender: 'customer', body: 'Excelente! Pode ser amanhã às 15h. Vou com meu engenheiro avaliar o terraço.', type: 'text', createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() }
  ]
};

// Webhook simulation logs
let webhookLogs: Record<string, WebhookLog[]> = {
  tenant_barbearia: [
    { id: 'w1', timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), event: 'lead.created', payload: '{"contactId":"c_b2","name":"Mariana Silva","score":"warm"}', status: 'success' },
    { id: 'w2', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), event: 'deal.won', payload: '{"contactId":"c_b1","name":"Carlos Oliveira","stage":"contato"}', status: 'success' }
  ],
  tenant_clinica: [
    { id: 'w3', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), event: 'lead.updated', payload: '{"contactId":"c_c1","status":"guia_recebida"}', status: 'success' }
  ],
  tenant_imobiliaria: [
    { id: 'w4', timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), event: 'appointment.scheduled', payload: '{"contactId":"c_i1","date":"2026-07-11T15:00:00"}', status: 'success' }
  ]
};

// Audit Logs
let auditLogs: AuditLog[] = [
  { id: 'a1', tenantId: 'tenant_barbearia', user: 'ronysiilvaa1@gmail.com', action: 'WhatsApp Conectado', details: 'WhatsApp +55 11 99999-1111 foi pareado com sucesso via QR Code.', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  { id: 'a2', tenantId: 'tenant_barbearia', user: 'ronysiilvaa1@gmail.com', action: 'IA Treinada', details: 'Base de conhecimento textual e tabela de preços de catálogo atualizadas.', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  { id: 'a3', tenantId: 'tenant_clinica', user: 'ronysiilvaa1@gmail.com', action: 'Novo Setor Criado', details: 'Setor de Exames adicionado ao fluxo de atendimento.', timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() }
];

// Helper to simulate webhook trigger to n8n
function triggerWebhookSimulator(tenantId: string, event: string, payload: any) {
  const tenant = tenants.find(t => t.id === tenantId);
  if (!tenant || !tenant.webhookUrl) return;

  const log: WebhookLog = {
    id: 'w_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    event,
    payload: JSON.stringify(payload),
    status: Math.random() > 0.05 ? 'success' : 'failed', // 95% success rate
  };

  if (!webhookLogs[tenantId]) webhookLogs[tenantId] = [];
  webhookLogs[tenantId].unshift(log);

  // Trigger console log
  console.log(`[n8n Webhook Simulator] Sent Event '${event}' to ${tenant.webhookUrl} with payload:`, payload);
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// GET Tenants
app.get('/api/tenants', (req, res) => {
  res.json(tenants);
});

// GET Tenant Details
app.get('/api/tenants/:id', (req, res) => {
  const tenant = tenants.find(t => t.id === req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
});

// POST Tenant Update (Training IA, Chatbot, WhatsApp, Plan, Webhook, status)
app.post('/api/tenants/:id', (req, res) => {
  const index = tenants.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    // Create new tenant
    const newTenant: Tenant = {
      id: req.params.id,
      name: req.body.name || 'Nova Empresa',
      niche: req.body.niche || 'Geral',
      plan: req.body.plan || 'free',
      status: req.body.status || 'active',
      createdAt: new Date().toISOString(),
      whatsappConnected: req.body.whatsappConnected || false,
      whatsappNumber: req.body.whatsappNumber || '',
      knowledgeBase: req.body.knowledgeBase || { text: '', faqs: [], catalogue: '' },
      chatbotConfig: req.body.chatbotConfig || [...DEFAULT_CHATBOT],
      sectors: req.body.sectors || [...DEFAULT_SECTORS],
      webhookUrl: req.body.webhookUrl || '',
    };
    tenants.push(newTenant);
    if (!contacts[newTenant.id]) contacts[newTenant.id] = [];
    return res.json(newTenant);
  }

  // Update existing
  tenants[index] = {
    ...tenants[index],
    ...req.body,
  };

  // Add audit log for training
  if (req.body.knowledgeBase) {
    auditLogs.unshift({
      id: 'a_' + Math.random().toString(36).substring(2, 9),
      tenantId: req.params.id,
      user: 'ronysiilvaa1@gmail.com',
      action: 'IA Re-treinada',
      details: 'Base de conhecimento e catálogo atualizados pelo usuário.',
      timestamp: new Date().toISOString(),
    });
  }

  res.json(tenants[index]);
});

// GET Contacts for Tenant
app.get('/api/contacts/:tenantId', (req, res) => {
  res.json(contacts[req.params.tenantId] || []);
});

// POST Contact Create/Update
app.post('/api/contacts/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const list = contacts[tenantId] || [];

  const contactData: Partial<Contact> = req.body;
  if (!contactData.id) {
    // Create
    const newContact: Contact = {
      id: 'c_' + Math.random().toString(36).substring(2, 9),
      name: contactData.name || 'Contato Sem Nome',
      phone: contactData.phone || '+55 11 90000-0000',
      email: contactData.email || '',
      tags: contactData.tags || [],
      pipelineStage: contactData.pipelineStage || 'novo',
      assignedTo: contactData.assignedTo || null,
      customFields: contactData.customFields || {},
      notes: [],
      lastMessageAt: new Date().toISOString(),
      leadScore: contactData.leadScore || null,
      leadReason: contactData.leadReason || '',
      aiAutoReply: contactData.aiAutoReply !== undefined ? contactData.aiAutoReply : true,
    };
    list.unshift(newContact);
    contacts[tenantId] = list;
    messages[newContact.id] = [];

    // Trigger Webhook Event
    triggerWebhookSimulator(tenantId, 'lead.created', { contactId: newContact.id, name: newContact.name, score: newContact.leadScore });

    return res.json(newContact);
  }

  // Update
  const index = list.findIndex(c => c.id === contactData.id);
  if (index !== -1) {
    const oldStage = list[index].pipelineStage;
    list[index] = {
      ...list[index],
      ...contactData,
    } as Contact;

    // Trigger Webhook if Stage Changed
    if (contactData.pipelineStage && contactData.pipelineStage !== oldStage) {
      triggerWebhookSimulator(tenantId, 'lead.stage_changed', {
        contactId: list[index].id,
        name: list[index].name,
        oldStage,
        newStage: list[index].pipelineStage
      });
    }

    contacts[tenantId] = list;
    return res.json(list[index]);
  }

  res.status(404).json({ error: 'Contact not found' });
});

// POST Delete Contact
app.post('/api/contacts/:tenantId/delete', (req, res) => {
  const { tenantId } = req.params;
  const { id } = req.body;
  if (!contacts[tenantId]) return res.status(404).json({ error: 'Tenant contacts not found' });
  contacts[tenantId] = contacts[tenantId].filter(c => c.id !== id);
  res.json({ success: true });
});

// GET Messages for Contact
app.get('/api/messages/:contactId', (req, res) => {
  res.json(messages[req.params.contactId] || []);
});

// POST Send Message
app.post('/api/messages/:contactId', (req, res) => {
  const { contactId } = req.params;
  const list = messages[contactId] || [];

  const newMessage: Message = {
    id: 'm_' + Math.random().toString(36).substring(2, 9),
    contactId,
    sender: req.body.sender || 'agent',
    body: req.body.body || '',
    type: req.body.type || 'text',
    mediaUrl: req.body.mediaUrl,
    createdAt: new Date().toISOString(),
    isInternalNote: req.body.isInternalNote || false,
    authorName: req.body.authorName,
  };

  list.push(newMessage);
  messages[contactId] = list;

  // Update contact's lastMessageAt
  for (const tid of Object.keys(contacts)) {
    const cIdx = contacts[tid].findIndex(c => c.id === contactId);
    if (cIdx !== -1) {
      contacts[tid][cIdx].lastMessageAt = newMessage.createdAt;
      // Trigger Webhook Event
      triggerWebhookSimulator(tid, 'message.sent', { contactId, sender: newMessage.sender, body: newMessage.body });
      break;
    }
  }

  res.json(newMessage);
});

// GET Webhook Logs
app.get('/api/webhook-logs/:tenantId', (req, res) => {
  res.json(webhookLogs[req.params.tenantId] || []);
});

// GET Audit Logs
app.get('/api/audit-logs/:tenantId', (req, res) => {
  const tenantLogs = auditLogs.filter(l => l.tenantId === req.params.tenantId);
  res.json(tenantLogs);
});

// -------------------------------------------------------------
// ADVANCED GEMINI INTEGRATION ENDPOINTS
// -------------------------------------------------------------

// 1. Suggest Response Endpoint
app.post('/api/ai/suggest', async (req, res) => {
  const { conversationHistory, kbText, catalogue } = req.body;

  if (!ai) {
    return res.json({
      suggestion: '[Modo de Demonstração]: Olá! Entendi sua solicitação perfeitamente. Como posso prosseguir com seu agendamento no nosso sistema premium?',
    });
  }

  try {
    const prompt = `Você é o co-piloto de atendimento inteligente do SaaS CA.RO ZAP. 
Sua tarefa é analisar o histórico de conversa com o cliente e sugerir a MELHOR resposta para o atendente humano enviar.

BASE DE CONHECIMENTO DA EMPRESA:
${kbText || 'Não há base cadastrada.'}

PRODUTOS E PREÇOS:
${catalogue || 'Não há catálogo.'}

HISTÓRICO DA CONVERSA (Últimas mensagens):
${JSON.stringify(conversationHistory)}

Regras de sugestão:
- Seja extremamente conciso, direto e amigável.
- Use emojis moderadamente para dar um tom humanizado.
- Baseie-se APENAS nas informações fornecidas. Nunca invente dados.
- Se não houver informação suficiente na Base de Conhecimento para responder à pergunta do cliente, sugira que o atendente pergunte detalhes adicionais ou encaminhe para o setor responsável.

Escreva APENAS a sugestão de resposta final, sem comentários ou metadados adicionais.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    res.json({ suggestion: response.text?.trim() });
  } catch (error: any) {
    console.error('Error suggesting response via Gemini:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Magic Box Enhancer Endpoint (Professional, Friendly, Translation, Summarize)
app.post('/api/ai/magic', async (req, res) => {
  const { text, mode } = req.body;

  if (!ai) {
    // Demonstration fallback
    let output = text;
    if (mode === 'professional') output = `[Profissional] Prezado cliente, agradecemos pelo contato. Como podemos auxiliá-lo em suas solicitações nesta data?`;
    else if (mode === 'friendly') output = `[Amigável] Olá! Que alegria falar com você! 😊 Me conta, como posso deixar seu dia melhor hoje?`;
    else if (mode === 'translate_en') output = `[Translation EN] Hello! Thank you for reaching out. How can we assist you today?`;
    else if (mode === 'translate_es') output = `[Translation ES] ¡Hola! Gracias por contactarnos. ¿Cómo podemos ayudarle hoy?`;
    else if (mode === 'correct') output = text + ' (Texto corrigido ortograficamente)';
    else if (mode === 'summarize') output = `Resumo executivo da conversa: O cliente solicita agendamento de serviços premium de atendimento e consulta de valores de catálogo.`;

    return res.json({ output });
  }

  try {
    let modeInstruction = '';
    if (mode === 'professional') {
      modeInstruction = 'Reescreva o texto do atendente de forma extremamente profissional, polida, corporativa e elegante. Mantenha as informações originais intactas.';
    } else if (mode === 'friendly') {
      modeInstruction = 'Reescreva o texto com um tom acolhedor, amigável, entusiasmado e empático. Use emojis adequados para transmitir simpatia e atenção.';
    } else if (mode === 'translate_en') {
      modeInstruction = 'Traduza o texto perfeitamente para o inglês corporativo/amigável dependendo do tom original.';
    } else if (mode === 'translate_es') {
      modeInstruction = 'Traduza o texto perfeitamente para o espanhol padrão de atendimento ao cliente.';
    } else if (mode === 'correct') {
      modeInstruction = 'Corrija quaisquer erros gramaticais, ortográficos ou de concordância do texto. Mantenha o tom original, apenas otimize a grafia.';
    } else if (mode === 'summarize') {
      modeInstruction = 'Gere um resumo executivo ultra condensado (em tópicos de uma linha) de toda a conversa enviada. Foque no problema do cliente e no próximo passo.';
    }

    const prompt = `Ação solicitada: ${modeInstruction}

Texto de Entrada:
"${text}"

Escreva apenas o resultado final reescrito/traduzido/corrigido, sem nenhum tipo de explicação extra ou introdução.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    res.json({ output: response.text?.trim() });
  } catch (error: any) {
    console.error('Error in Magic Box enhancer via Gemini:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. WhatsApp Auto-Responder, RAG context search, and Advanced Lead Classifier (Hot/Warm/Cold, Tags, Stages, Info extraction)
app.post('/api/ai/auto-respond', async (req, res) => {
  const { tenantId, contactId, customerMessage } = req.body;

  const tenant = tenants.find(t => t.id === tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  // 1. Log customer message
  if (!messages[contactId]) messages[contactId] = [];
  const incomingMsg: Message = {
    id: 'm_cust_' + Math.random().toString(36).substring(2, 9),
    contactId,
    sender: 'customer',
    body: customerMessage,
    type: 'text',
    createdAt: new Date().toISOString(),
  };
  messages[contactId].push(incomingMsg);

  // Update contact's lastMessageAt
  const list = contacts[tenantId] || [];
  const contactIndex = list.findIndex(c => c.id === contactId);
  if (contactIndex !== -1) {
    list[contactIndex].lastMessageAt = incomingMsg.createdAt;
  }

  // 2. Run Auto-Reply simulation if enabled
  let aiReplyText = '';
  let shouldTransfer = false;

  // Advanced Analysis variables
  let leadScore: 'hot' | 'warm' | 'cold' = 'warm';
  let leadReason = 'Lead em estágio inicial de contato.';
  let extractedFields: Record<string, string> = {};
  let suggestedTags: string[] = [];
  let moveStageTo = '';

  if (!ai) {
    // Demonstration responses based on niche
    if (tenantId === 'tenant_barbearia') {
      if (customerMessage.toLowerCase().includes('preço') || customerMessage.toLowerCase().includes('valor')) {
        aiReplyText = 'Olá! O nosso Corte de Cabelo custa R$ 60 e a Barba custa R$ 40. Temos também o Combo promocional por R$ 90! Gostaria de agendar para hoje?';
      } else if (customerMessage.toLowerCase().includes('falar com') || customerMessage.toLowerCase().includes('atendente') || customerMessage.toLowerCase().includes('humano') || customerMessage.toLowerCase().includes('barbeiro')) {
        aiReplyText = 'Entendido! Estou transferindo você para nosso atendente humano agora mesmo. Por favor, aguarde um instante.';
        shouldTransfer = true;
      } else {
        aiReplyText = 'Olá! Bem-vindo à Corte Fino Grooming! Eu sou a Inteligência Artificial e posso te ajudar com preços de serviços, horários de funcionamento ou agendamento direto. O que você deseja hoje?';
      }
    } else if (tenantId === 'tenant_clinica') {
      if (customerMessage.toLowerCase().includes('convênio') || customerMessage.toLowerCase().includes('plano')) {
        aiReplyText = 'Sim! Aceitamos os planos Bradesco Saúde, Amil, SulAmérica, NotreDame Intermédica e Porto Seguro. Qual o seu plano para que eu possa verificar as especialidades disponíveis?';
      } else if (customerMessage.toLowerCase().includes('exame') || customerMessage.toLowerCase().includes('guia')) {
        aiReplyText = 'Ótimo! Você pode nos enviar a foto da sua guia médica aqui no WhatsApp e nosso setor de Exames fará o agendamento em instantes.';
      } else {
        aiReplyText = 'Olá! Sou o assistente inteligente da Clínica Vitallis. Como posso ajudar com suas consultas, especialidades ou exames hoje?';
      }
    } else {
      aiReplyText = `Olá! Sou o assistente inteligente do ${tenant.name}. Como posso ajudar você no dia de hoje com nossos produtos ou serviços?`;
    }

    // Set demo values for advanced classifications
    leadScore = customerMessage.toLowerCase().includes('quero fechar') || customerMessage.toLowerCase().includes('agendar') || customerMessage.toLowerCase().includes('comprar') ? 'hot' : 'warm';
    leadReason = `Identificado interesse em serviços com base no texto: "${customerMessage}".`;
    suggestedTags = ['WhatsApp Zap', tenant.niche.split(' ')[0]];
    if (customerMessage.toLowerCase().includes('preço') || customerMessage.toLowerCase().includes('valor')) {
      suggestedTags.push('Dúvida Preço');
    }
    moveStageTo = leadScore === 'hot' ? 'negociacao' : 'contato';

  } else {
    try {
      // 2A. Generate AI Answer using Gemini grounded on Knowledge Base and Chatbot Config
      const botSystemInstruction = `Você é o assistente virtual inteligente e amigável da empresa "${tenant.name}" (nicho: ${tenant.niche}). 
Sua tarefa é responder ao cliente via WhatsApp de forma gentil, humana, educada e de acordo com as regras de negócio da empresa.

BASE DE CONHECIMENTO DA EMPRESA (RAG):
${tenant.knowledgeBase.text}

PERGUNTAS E RESPOSTAS FREQUENTES (FAQ):
${JSON.stringify(tenant.knowledgeBase.faqs)}

CATÁLOGO E PREÇOS:
${tenant.knowledgeBase.catalogue}

DIRETRIZES IMPORTANTES:
1. Responda baseando-se estritamente na base de dados acima.
2. NUNCA invente informações (links, telefones, serviços, preços). Se o cliente perguntar algo que não está na base, informe educadamente que não possui essa informação e ofereça a transferência automática para um atendente humano.
3. Se o cliente solicitar falar com um "atendente", "humano", "suporte", "pessoa", "gerente", "barbeiro", "corretor", diga que está transferindo imediatamente e inclua a palavra reservada "[TRANSFERIR_HUMANO]" no final da resposta.
4. Mantenha respostas curtas, scannables e fáceis de ler no celular (use quebras de linha e tópicos).`;

      const botResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: customerMessage,
        config: {
          systemInstruction: botSystemInstruction,
          temperature: 0.2,
        },
      });

      aiReplyText = botResponse.text?.trim() || '';

      if (aiReplyText.includes('[TRANSFERIR_HUMANO]') || customerMessage.toLowerCase().includes('atendente') || customerMessage.toLowerCase().includes('humano')) {
        shouldTransfer = true;
        aiReplyText = aiReplyText.replace('[TRANSFERIR_HUMANO]', '').trim();
        if (!aiReplyText) {
          aiReplyText = 'Certo! Vou transferir você para nosso atendimento humano agora mesmo. Um momento!';
        }
      }

      // 2B. Run Advanced Lead Classifier (Extract entities, score lead, suggest tags & stage) using Structured JSON Schema output!
      const classifierPrompt = `Sua tarefa é agir como um Analista de Leads Sênior e classificar o Lead com base na mensagem recebida e no contexto da empresa.

DADOS DA EMPRESA:
- Nome: ${tenant.name}
- Nicho: ${tenant.niche}

MENSAGEM DO CLIENTE:
"${customerMessage}"

HISTÓRICO DA CONVERSA:
${JSON.stringify(messages[contactId].slice(-4))}

Classifique os seguintes campos:
1. leadScore: Deve ser 'hot' (se demonstrou forte intenção de agendar, comprar ou tirar dúvidas cruciais para fechamento), 'warm' (se demonstrou dúvida geral ou está pesquisando preços) ou 'cold' (se é uma dúvida fora de escopo, reclamação ou spam).
2. leadReason: Uma frase explicando o motivo desse score.
3. suggestedTags: Array de até 3 tags (strings curtas como 'Dúvida Preços', 'Agendamento', 'Interesse Compra', etc.).
4. moveStageTo: A etapa ideal para o CRM Kanban. Escolha entre: 'novo', 'contato', 'proposta', 'negociacao', 'fechado'.
5. customFields: Objeto chave-valor com qualquer informação útil extraída (ex: orcamento, barbeiro, especialidade, convenio, etc.) se houver.`;

      const classificationResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: classifierPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              leadScore: { type: Type.STRING, description: "hot, warm, or cold" },
              leadReason: { type: Type.STRING, description: "Detailed reason for the lead score" },
              suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              moveStageTo: { type: Type.STRING, description: "CRM Kanban stage: novo, contato, proposta, negociacao, fechado" },
              customFields: { type: Type.OBJECT, description: "Extracted dynamic fields from message" }
            },
            required: ['leadScore', 'leadReason', 'suggestedTags', 'moveStageTo']
          },
          temperature: 0.1,
        }
      });

      try {
        const result = JSON.parse(classificationResponse.text?.trim() || '{}');
        leadScore = result.leadScore || 'warm';
        leadReason = result.leadReason || '';
        suggestedTags = result.suggestedTags || [];
        moveStageTo = result.moveStageTo || '';
        extractedFields = result.customFields || {};
      } catch (parseErr) {
        console.error('Error parsing JSON classifier response:', parseErr);
      }

    } catch (err) {
      console.error('Error running auto-respond with Gemini:', err);
      aiReplyText = 'Olá! Tivemos uma oscilação na rede, mas estou aqui para te ajudar. O que você gostaria de saber sobre nossos serviços?';
    }
  }

  // 3. Save the AI answer to database
  const aiMessage: Message = {
    id: 'm_ai_' + Math.random().toString(36).substring(2, 9),
    contactId,
    sender: 'ai',
    body: aiReplyText,
    type: 'text',
    createdAt: new Date().toISOString(),
  };
  messages[contactId].push(aiMessage);

  // 4. Perform Auto-Actions on Contact State
  if (contactIndex !== -1) {
    const contact = list[contactIndex];
    contact.lastMessageAt = aiMessage.createdAt;

    // Apply lead classifications
    contact.leadScore = leadScore;
    contact.leadReason = leadReason;

    // Add suggested tags (no duplicates)
    suggestedTags.forEach(tag => {
      if (!contact.tags.includes(tag)) {
        contact.tags.push(tag);
      }
    });

    // Move stage automatically if it moves forward
    if (moveStageTo && moveStageTo !== contact.pipelineStage) {
      const stagesOrder = ['novo', 'contato', 'proposta', 'negociacao', 'fechado'];
      const oldIdx = stagesOrder.indexOf(contact.pipelineStage);
      const newIdx = stagesOrder.indexOf(moveStageTo);
      // Move forward only to prevent looping
      if (newIdx > oldIdx) {
        contact.pipelineStage = moveStageTo;
      }
    }

    // Merge custom fields
    contact.customFields = {
      ...contact.customFields,
      ...extractedFields
    };

    // Auto Transfer triggers
    if (shouldTransfer) {
      contact.aiAutoReply = false; // Turn off AI so agent takes over!
      contact.assignedTo = 'u_1'; // Assign to default agent
      contact.notes.unshift({
        id: 'n_trans_' + Math.random().toString(36).substring(2, 9),
        body: `🤖 Transferido automaticamente do Chatbot IA para Atendimento Humano (Motivo: solicitação de atendente ou transbordo). Resumo preliminar: ${leadReason}`,
        author: 'Sistema CA.RO ZAP',
        createdAt: new Date().toISOString()
      });
    }

    contacts[tenantId] = list;

    // Trigger Webhook Event to n8n to showcase full interoperability
    triggerWebhookSimulator(tenantId, 'ai.reply_processed', {
      contactId,
      customerMessage,
      aiReply: aiReplyText,
      leadScore,
      suggestedTags,
      pipelineStage: contact.pipelineStage,
      transferredToHuman: shouldTransfer
    });
  }

  res.json({
    aiMessage,
    contact: list[contactIndex],
    classifications: {
      leadScore,
      leadReason,
      suggestedTags,
      moveStageTo,
      customFields: extractedFields,
      shouldTransfer
    }
  });
});

// 4. SuperAdmin Dashboard: Create Tenant
app.post('/api/admin/tenants/create', (req, res) => {
  const { name, niche, plan } = req.body;
  const newId = 'tenant_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const newTenant: Tenant = {
    id: newId,
    name,
    niche,
    plan: plan || 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    whatsappConnected: false,
    whatsappNumber: '',
    sectors: [...DEFAULT_SECTORS],
    webhookUrl: `https://n8n.seuservidor.com/webhook/${newId}`,
    knowledgeBase: {
      text: `Esta é a base de conhecimento inicial de ${name}. Forneça detalhes sobre sua empresa aqui para treinar sua IA.`,
      faqs: [{ q: 'Qual a nossa missão?', a: 'Oferecer o melhor atendimento com alta eficiência.' }],
      catalogue: 'Serviço Padrão 1: R$ 100\nServiço Padrão 2: R$ 180'
    },
    chatbotConfig: [...DEFAULT_CHATBOT]
  };

  tenants.push(newTenant);
  contacts[newId] = [];
  webhookLogs[newId] = [];

  auditLogs.unshift({
    id: 'a_' + Math.random().toString(36).substring(2, 9),
    tenantId: 'system',
    user: 'ronysiilvaa1@gmail.com',
    action: 'Empresa Criada',
    details: `SaaS Tenant '${name}' cadastrado no plano ${plan.toUpperCase()}`,
    timestamp: new Date().toISOString()
  });

  res.json(newTenant);
});

// 5. SuperAdmin Dashboard: Lock Tenant
app.post('/api/admin/tenants/status', (req, res) => {
  const { id, status } = req.body;
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  tenant.status = status;

  auditLogs.unshift({
    id: 'a_' + Math.random().toString(36).substring(2, 9),
    tenantId: 'system',
    user: 'ronysiilvaa1@gmail.com',
    action: status === 'locked' ? 'Empresa Bloqueada' : 'Empresa Desbloqueada',
    details: `Status da empresa '${tenant.name}' alterado para ${status.toUpperCase()}`,
    timestamp: new Date().toISOString()
  });

  res.json(tenant);
});


// -------------------------------------------------------------
// VITE OR STATIC BUILD MIDDLEWARE MOUNTING
// -------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const setupDevServer = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Development Server running on http://localhost:${PORT}`);
    });
  };
  setupDevServer();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Production Server running on port ${PORT}`);
  });
}
