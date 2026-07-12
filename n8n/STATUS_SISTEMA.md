# CA.RO ZAP — Status do Sistema (o que está NO AR)

_Plataforma SaaS de atendimento e vendas por WhatsApp com IA. Cada assinante = 1 perfil com persona própria._

## Está funcionando (ao vivo, testado)

**1. Banco de dados — Supabase**
- Projeto: CA.RO Connect (ref hgrmyogjllbrprgnzfpl, us-west-2).
- Schema dedicado `caro`: tenants, contacts, messages, notes, audit_logs, webhook_logs, users.
- Colunas de remarketing em contacts: followup_stage, last_followup_at.
- Conexao (n8n/painel): Session Pooler aws-1-us-west-2.pooler.supabase.com:5432, user postgres.hgrmyogjllbrprgnzfpl, SSL on.

**2. Motor de atendimento — n8n Cloud (carostudio.app.n8n.cloud)**
- Workflow "CA.RO ZAP - Motor de Atendimento" (id 7TStseS97QfFnYcE) — ATIVO.
- Webhook (Evolution) -> identifica tenant pela instancia -> transcreve audio (Whisper) / le imagem (GPT-4o) -> Claude responde com a persona (RAG) -> OpenAI classifica lead (hot/warm/cold, tags, etapa, email) -> grava no CRM -> envia resposta no WhatsApp -> transbordo humano so nos casos certos.
- Modelos: Claude claude-sonnet-5, Whisper whisper-1, GPT-4o (imagem), gpt-4o-mini (classificacao).
- Transferencia conservadora: a IA vende sozinha; so transfere em pedido explicito de humano, cliente/aluna ativa, reclamacao, fechamento premium, imprensa/parceria.

**3. Remarketing / Follow-up — n8n Cloud**
- Workflow "CA.RO ZAP - Remarketing / Follow-up" (id H6E9JXRNJ1WNjZqR) — ATIVO, roda a cada 30 min.
- Reengaja leads mornos/quentes inativos, quebrando objecao no tom da persona: 4h -> 24h -> 48h -> 1 semana. Reinicia quando o cliente responde.

**4. WhatsApp — Evolution API (Railway)**
- Deploy no Railway (projeto acceptable-luck): Evolution API + Postgres + Redis.
- URL: https://evolution-api-production-bbc0.up.railway.app (Manager em /manager).
- Instancia barbearia_cortefino = CONECTADA ao WhatsApp da Camila Rocha. Webhook MESSAGES_UPSERT + Base64 ligado.

**5. Persona ativa — Camila Rocha (cliente do CA.RO ZAP)**
- Consultora de imagem, nicho cristao feminino. Base de conhecimento completa (~5.6k chars): identidade, tom de voz, produtos e links, scripts de quebra de objecao, coleta de email, foco em vender.
- Produtos: Consultoria (12x R$397 / R$3.997), Curso Geracao do Estilo (Kiwify), Coloracao Pessoal, Palestras.

## IDs de credenciais no n8n
- Postgres: Supabase Postgres (4WySqKz9d9BJUEef)
- OpenAI: OpenAI Header Auth (Xa0rYQqqJTcoUJ5m)
- Anthropic: Anthropic API (fhYQtVMOZwPf4k7p)
- Evolution: Evolution API (vMyamc0iZ1n3B05Y)

## Proxima fase — Painel / Plataforma multi-perfil
- Backend do painel (server.ts): reescrito pra ler/gravar no caro, multi-tenant, login JWT, editor de persona, espelhamento das conversas. Falta: DATABASE_URL, deploy no Railway, front (login + api com token).
- Cobranca/assinatura (Stripe): fase seguinte.
- Provisionamento automatico (instancia Evolution + QR por assinante): fase seguinte.

## Observacoes
- O WhatsApp conectado e o numero real da Camila — a IA responde a todo mundo que mandar mensagem nova. Para producao, ideal um numero dedicado por assinante.
- Follow-up ativo em WhatsApp nao-oficial tem risco de bloqueio se agressivo; por isso e espacado e no tom elegante da persona.
