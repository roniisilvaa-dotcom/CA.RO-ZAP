import React, { useState } from 'react';
import { 
  Smartphone, QrCode, Wifi, WifiOff, Globe, Send, UserPlus, Users, Shield, 
  Trash2, CreditCard, Layers, Check, HelpCircle, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { Tenant, User, WebhookLog } from '../types';
import { updateTenant } from '../lib/api';

interface ConfiguracoesProps {
  tenant: Tenant;
  webhookLogs: WebhookLog[];
  onRefreshTenant: () => void;
  onRefreshWebhookLogs: () => void;
}

export default function Configuracoes({ tenant, webhookLogs, onRefreshTenant, onRefreshWebhookLogs }: ConfiguracoesProps) {
  // WhatsApp connection states
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState(false);

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState(tenant.webhookUrl || '');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Stripe Checkout billing states
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  // Team states
  const [team, setTeam] = useState<User[]>([
    { id: 'u_1', name: 'rony silva (Você)', email: 'ronysiilvaa1@gmail.com', role: 'admin', tenantId: tenant.id, active: true },
    { id: 'u_2', name: 'Júlia Costa', email: 'julia.costa@vitallis.com', role: 'manager', tenantId: tenant.id, active: true },
    { id: 'u_3', name: 'Thiago Silva', email: 'thiago.silva@barber.com', role: 'agent', tenantId: tenant.id, active: true }
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'manager' | 'agent'>('agent');

  // Handle WhatsApp pairing simulation
  const handleGenerateQR = () => {
    setQrLoading(true);
    setQrCodeOpen(true);
    setTimeout(() => {
      setQrLoading(false);
    }, 1000);
  };

  const handleSimulatePairing = async () => {
    setPairingSuccess(true);
    setTimeout(async () => {
      try {
        await updateTenant(tenant.id, {
          whatsappConnected: true,
          whatsappNumber: '+55 11 9' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
        });
        setQrCodeOpen(false);
        setPairingSuccess(false);
        onRefreshTenant();
      } catch (err) {
        console.error('Error pairing WhatsApp:', err);
      }
    }, 1500);
  };

  const handleDisconnectWhatsApp = async () => {
    if (confirm('Deseja realmente desconectar este WhatsApp? Suas automações de chatbot e IA pararão imediatamente.')) {
      try {
        await updateTenant(tenant.id, {
          whatsappConnected: false,
          whatsappNumber: '',
        });
        onRefreshTenant();
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
  };

  // Save Webhook URL
  const handleSaveWebhook = async () => {
    try {
      await updateTenant(tenant.id, {
        webhookUrl,
      });
      alert('Configuração de Webhook salva com sucesso!');
      onRefreshTenant();
    } catch (err) {
      console.error('Error saving webhook:', err);
    }
  };

  // Trigger test webhook outbound
  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestSuccess(false);

    // Call test webhook simulation
    setTimeout(async () => {
      try {
        const res = await fetch('/api/webhooks/test-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: tenant.id, webhookUrl }),
        });
        setIsTestingWebhook(false);
        setTestSuccess(true);
        onRefreshWebhookLogs();
        setTimeout(() => setTestSuccess(false), 3000);
      } catch (err) {
        console.error(err);
        setIsTestingWebhook(false);
      }
    }, 1200);
  };

  // Add team member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const newMember: User = {
      id: 'u_' + Math.random().toString(36).substring(2, 9),
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      tenantId: tenant.id,
      active: true,
    };

    setTeam([...team, newMember]);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('agent');
  };

  // Delete team member
  const handleDeleteMember = (id: string) => {
    if (id === 'u_1') {
      alert('Você não pode excluir a si mesmo!');
      return;
    }
    setTeam(team.filter(u => u.id !== id));
  };

  // Simulate stripe upgrade
  const handleUpgradeSubscriptionPlan = (planId: string) => {
    setSelectedPlanToUpgrade(planId);
  };

  const handleConfirmUpgrade = () => {
    setUpgrading(true);
    setTimeout(async () => {
      try {
        await updateTenant(tenant.id, {
          plan: selectedPlanToUpgrade as any,
        });
        setUpgrading(false);
        setSelectedPlanToUpgrade(null);
        onRefreshTenant();
      } catch (err) {
        console.error(err);
        setUpgrading(false);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6" id="configuracoes_view">
      
      {/* Grid Configuration Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: WHATSAPP PANEL & WEBHOOKS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Panel 1: WhatsApp sync */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-500" /> Integração com WhatsApp (Mock)
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Conecte sua conta do WhatsApp Business à plataforma. Uma vez pareado, todas as mensagens recebidas do seu celular serão processadas em tempo real pelo Chatbot de Fluxo e pela Inteligência Artificial.
            </p>

            {tenant.whatsappConnected ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200/40 dark:border-emerald-900/40">
                <div className="flex items-center gap-3">
                  <Wifi className="w-10 h-10 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">WhatsApp Conectado com Sucesso!</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">Celular ativo respondendo de forma autônoma: <strong>{tenant.whatsappNumber}</strong></p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectWhatsApp}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-lg text-xs font-bold transition"
                >
                  Desconectar WhatsApp
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-950/20 p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-10 h-10 text-zinc-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">WhatsApp Desconectado</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Nenhum dispositivo móvel pareado nesta conta. Gere o QR code para sincronizar.</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateQR}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Parear Novo WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Panel 2: Webhooks n8n */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-500" /> Integração com n8n (Webhooks Automações)
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Integre o CA.RO ZAP a ferramentas externas como **n8n, Make ou Webhooks proprietários**. O sistema enviará gatilhos JSON automáticos para cada evento relevante ocorrido: `lead.created`, `lead.stage_changed`, `message.sent`.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://suainstancia.n8n.com/webhook/corte-fino-zap"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none"
              />
              <button
                onClick={handleSaveWebhook}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition"
              >
                Salvar URL
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <button
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 border border-indigo-200/20 flex items-center gap-1.5 transition shadow-sm"
              >
                {isTestingWebhook ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : testSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{testSuccess ? 'Webhook Disparado!' : 'Disparar Webhook de Teste'}</span>
              </button>
            </div>

            {/* Webhook Logs display */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Registros Recentes de Webhooks n8n</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {webhookLogs.length > 0 ? (
                  webhookLogs.map((log) => (
                    <div key={log.id} className="p-2 bg-zinc-50 dark:bg-zinc-950/10 border border-zinc-250/20 dark:border-zinc-800 text-[10px] font-mono flex items-center justify-between rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.event}</span>
                        <span className="text-zinc-400 truncate max-w-[150px]">{log.payload}</span>
                      </div>
                      <span className={`px-1 rounded text-[9px] font-bold uppercase ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400 italic block py-2">Nenhum webhook disparado recentemente. Clique no teste acima.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TEAM & PLANS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Plan subscription Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-500" /> Assinatura & Limites
            </span>

            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-4 rounded-xl space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Plano Atual</span>
                <span className="text-[10px] bg-white text-indigo-700 px-2.5 py-0.5 rounded-full font-bold uppercase">
                  {tenant.plan}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">CA.RO ZAP {tenant.plan === 'free' ? 'Grátis' : tenant.plan === 'start' ? 'Start' : tenant.plan === 'business' ? 'Business' : 'Enterprise'}</p>
                <p className="text-[10px] opacity-80 mt-1">Sua empresa possui acesso ilimitado aos canais de atendimento</p>
              </div>
            </div>

            {/* Limits Progress */}
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-500">
                  <span>Usuários da Equipe:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{team.length} / 10</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(team.length / 10) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-zinc-500">
                  <span>Consumo IA (Embeddings):</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">65% (Trained)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>

            {/* Plans listing for upgrade mock */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Fazer Upgrade de Plano</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {['start', 'business', 'enterprise'].map((planId) => {
                  if (planId === tenant.plan) return null;
                  return (
                    <button
                      key={planId}
                      onClick={() => handleUpgradeSubscriptionPlan(planId)}
                      className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-indigo-50 border border-zinc-200 dark:border-zinc-750 rounded-lg text-zinc-700 dark:text-zinc-300 text-[10px] font-bold capitalize text-left transition"
                    >
                      Mudar p/ {planId}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Team users list */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> Membros da Equipe
            </span>

            {/* Add Team member form */}
            <form onSubmit={handleAddMember} className="space-y-2 pt-1">
              <div className="grid grid-cols-1 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Nome do integrante"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-100 focus:outline-none"
                  required
                />
                <input
                  type="email"
                  placeholder="E-mail (ex: joao@empresa.com)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-100 focus:outline-none"
                  required
                />
                <div className="flex gap-1.5">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-lg px-2 py-1 text-[11px] text-zinc-700 dark:text-zinc-300"
                  >
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente</option>
                    <option value="agent">Atendente</option>
                  </select>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 rounded-lg text-[11px]"
                  >
                    Convidar
                  </button>
                </div>
              </div>
            </form>

            {/* Users listing */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 pt-2 space-y-2">
              {team.map((user) => (
                <div key={user.id} className="flex items-center justify-between text-xs pt-2 first:pt-0">
                  <div className="truncate max-w-[150px]">
                    <p className="font-semibold text-zinc-850 dark:text-zinc-200 leading-none">{user.name}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] rounded uppercase font-mono">
                      {user.role}
                    </span>
                    <button
                      onClick={() => handleDeleteMember(user.id)}
                      className="text-zinc-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: WHATSAPP QR CODE GENERATOR SIMULATOR */}
      {qrCodeOpen && (
        <div className="fixed inset-0 bg-zinc-950/65 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sincronizar Celular QR</h3>
              <button onClick={() => setQrCodeOpen(false)} className="text-zinc-400 hover:text-zinc-600">&times;</button>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center relative w-56 h-56">
              {qrLoading ? (
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              ) : pairingSuccess ? (
                <div className="text-center space-y-1 text-emerald-500 flex flex-col items-center">
                  <Wifi className="w-12 h-12 animate-pulse" />
                  <span className="text-xs font-bold">WhatsApp Pareado!</span>
                </div>
              ) : (
                <div className="relative">
                  <QrCode className="w-44 h-44 text-zinc-800 dark:text-zinc-200" />
                  {/* Moving scanner bar */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Leia o código acima pelo WhatsApp</h4>
              <p className="text-[10px] text-zinc-400 max-w-xs leading-relaxed">Abra o WhatsApp no celular {`>`} Configurações {`>`} Dispositivos Conectados {`>`} Conectar Dispositivo e aponte para a tela.</p>
            </div>

            <button
              onClick={handleSimulatePairing}
              disabled={qrLoading || pairingSuccess}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              {pairingSuccess ? 'Dispositivo Conectado!' : 'Simular Leitura (Parear Celular)'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: STRIPE BILLING CHECKOUT UPGRADE */}
      {selectedPlanToUpgrade && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-md font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              Upgrade Assinatura (Checkout Stripe)
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Você está alterando o plano da sua empresa para **Plano {selectedPlanToUpgrade.toUpperCase()}**. Isto removerá os limites de usuários, processará embeddings maiores de FAQ e liberará integrações ilimitadas com Webhooks n8n.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-950/20 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
              <p className="font-bold flex justify-between items-center">
                <span>Subtotal Anual:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {selectedPlanToUpgrade === 'start' ? 'R$ 97/mês' : selectedPlanToUpgrade === 'business' ? 'R$ 197/mês' : 'R$ 497/mês'}
                </span>
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">Cobrado anualmente via cartão de crédito ou Pix. Cancelamento sem fidelidade.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPlanToUpgrade(null)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={upgrading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1"
              >
                {upgrading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{upgrading ? 'Processando Stripe...' : 'Confirmar Upgrade de Plano'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
