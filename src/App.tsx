import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, LayoutDashboard, MessageSquare, GitMerge, Users, GitFork, Cpu, 
  Settings, RefreshCw, Sun, Moon, Sparkles, ChevronRight, Check, ShieldCheck 
} from 'lucide-react';

import { Tenant, Contact, WebhookLog, AuditLog } from './types';
import { 
  fetchTenants, fetchContacts, fetchAuditLogs, fetchWebhookLogs, fetchTenantDetails 
} from './lib/api';

import Dashboard from './components/Dashboard';
import ChatAtendimento from './components/ChatAtendimento';
import CRMKanban from './components/CRMKanban';
import Contatos from './components/Contatos';
import ChatbotFlow from './components/ChatbotFlow';
import IATreino from './components/IATreino';
import Configuracoes from './components/Configuracoes';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);

  // Navigation and loading states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'crm' | 'leads' | 'chatbot' | 'ia' | 'config'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dark mode theme state (default light)
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      loadTenantData(selectedTenant.id);
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await fetchTenants();
      setTenants(data);
      if (data.length > 0) {
        setSelectedTenant(data[0]);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantData = async (tenantId: string) => {
    setRefreshing(true);
    try {
      const [contactsData, auditData, webhooksData, updatedTenantDetails] = await Promise.all([
        fetchContacts(tenantId),
        fetchAuditLogs(tenantId),
        fetchWebhookLogs(tenantId),
        fetchTenantDetails(tenantId)
      ]);
      
      setContacts(contactsData);
      setAuditLogs(auditData);
      setWebhookLogs(webhooksData);
      // Synchronize back any modifications to tenant config (knowledge, webhook URL, plan, etc.)
      setSelectedTenant(updatedTenantDetails);
    } catch (err) {
      console.error('Error loading tenant details:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshAll = () => {
    if (selectedTenant) {
      loadTenantData(selectedTenant.id);
    }
  };

  // Switcher callback from subcomponents
  const handleJumpToChatWithContact = (contact: Contact) => {
    setActiveTab('chat');
    // Ensure that inside ChatAtendimento, this contact starts as selected
    // Note: since selectedContact in ChatAtendimento is local, we pass down initial state or let it sync
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          <Bot className="w-8 h-8 text-indigo-500 absolute animate-pulse" />
        </div>
        <h2 className="text-zinc-100 font-bold text-lg">Iniciando CA.RO ZAP</h2>
        <p className="text-zinc-500 text-xs mt-1">Carregando painel e canais inteligentes...</p>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50/50 dark:bg-zinc-950 flex flex-col lg:flex-row font-sans text-slate-800 dark:text-zinc-200 transition-colors duration-200">
        
        {/* SIDEBAR NAVIGATION - PROFESSIONAL POLISH THEME */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-zinc-800/80 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-sm shrink-0">
          
          {/* Logo & Platform Status */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-zinc-800/50">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold tracking-tight text-[15px] text-slate-900 dark:text-zinc-50">
                  CA.RO ZAP
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                  IA Ativa
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Atendimento Inteligente</p>
            </div>
          </div>

          {/* Navigation links inside Sidebar */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" id="navigation_rail">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 px-2">Navegação</div>
            
            {[
              { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
              { id: 'chat', name: 'Atendimento', icon: MessageSquare },
              { id: 'crm', name: 'Funil CRM', icon: GitMerge },
              { id: 'leads', name: 'Clientes', icon: Users },
              { id: 'chatbot', name: 'Chatbot', icon: GitFork },
              { id: 'ia', name: 'Treinar IA', icon: Cpu },
              { id: 'config', name: 'Ajustes', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav_btn_${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                    isActive 
                      ? 'bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-50 shadow-sm' 
                      : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/40 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                  <span className="flex-1 text-left">{tab.name}</span>
                  {tab.id === 'chat' && contacts.filter(c => c.pipelineStage !== 'fechado').length > 0 && (
                    <span className="ml-auto bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-indigo-100/50 dark:border-indigo-900/40">
                      {contacts.filter(c => c.pipelineStage !== 'fechado').length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick instructions panel inside sidebar */}
            <div className="hidden lg:block mt-6 p-4 bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/40 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Dica de Teste
              </span>
              <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                Vá em **Atendimento**, clique em **"Simular WhatsApp"**, envie perguntas e assista à IA qualificar o lead no CRM!
              </p>
            </div>
          </nav>

          {/* Business Plan Status from Design HTML */}
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800/50 mt-auto hidden lg:block">
            <div className="bg-indigo-900 dark:bg-indigo-950 border border-indigo-800/30 dark:border-indigo-900/50 rounded-xl p-4 text-white">
              <div className="text-[10.5px] opacity-70 mb-1 uppercase font-bold tracking-wider">Plano Business</div>
              <div className="font-display font-semibold text-sm mb-3 flex items-center justify-between">
                <span>94% IA Ativa</span>
                <span className="text-[9px] bg-indigo-700 dark:bg-indigo-900 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">Enterprise</span>
              </div>
              <div className="w-full bg-indigo-950 dark:bg-indigo-900/60 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white dark:bg-indigo-400 h-full w-3/4 rounded-full"></div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT PORTION */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          
          {/* TOP HEADER BAR */}
          <header className="h-16 border-b border-slate-200/80 dark:border-zinc-800/80 px-6 sm:px-8 flex items-center justify-between bg-white dark:bg-zinc-900 z-10 shadow-xs shrink-0">
            
            {/* Tenant selection dropdown */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700/60 px-3.5 py-1.5 rounded-xl cursor-pointer transition">
                <div className="w-3.5 h-3.5 rounded bg-orange-500 flex items-center justify-center text-[8px] text-white font-black">&bull;</div>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:inline">Empresa:</span>
                <select
                  value={selectedTenant?.id || ''}
                  onChange={(e) => {
                    const target = tenants.find(t => t.id === e.target.value);
                    if (target) setSelectedTenant(target);
                  }}
                  className="bg-transparent border-none p-0 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100">
                      {t.name} ({t.niche})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controls: WhatsApp live nodes status, Theme, Reload */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Live WhatsApp node indicator */}
              <div className="hidden md:flex items-center gap-2 text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Node: WhatsApp-Live</span>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 hidden md:block"></div>

              {/* Sync, Theme & User block */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition text-slate-500 dark:text-zinc-400"
                  title="Sincronizar base"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
                </button>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition text-slate-500 dark:text-zinc-300 shadow-xs"
                  title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </button>

                <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800"></div>

                {/* Profile block */}
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-100">Ricardo Archer</div>
                    <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-zinc-300 shadow-xs">
                    RA
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* MAIN CONTAINER PANEL */}
          <main className="flex-1 p-6 sm:p-8 bg-slate-50/40 dark:bg-zinc-950/40 overflow-y-auto" id="main_content_viewport">
            {selectedTenant && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + '_' + selectedTenant.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'dashboard' && (
                    <Dashboard 
                      tenant={selectedTenant} 
                      contacts={contacts} 
                      auditLogs={auditLogs} 
                    />
                  )}

                  {activeTab === 'chat' && (
                    <ChatAtendimento 
                      tenant={selectedTenant} 
                      contacts={contacts} 
                      onRefreshContacts={handleRefreshAll} 
                    />
                  )}

                  {activeTab === 'crm' && (
                    <CRMKanban 
                      tenant={selectedTenant} 
                      contacts={contacts} 
                      onRefreshContacts={handleRefreshAll} 
                      onNavigateToChat={handleJumpToChatWithContact}
                    />
                  )}

                  {activeTab === 'leads' && (
                    <Contatos 
                      tenant={selectedTenant} 
                      contacts={contacts} 
                      onRefreshContacts={handleRefreshAll} 
                      onNavigateToChat={handleJumpToChatWithContact}
                    />
                  )}

                  {activeTab === 'chatbot' && (
                    <ChatbotFlow 
                      tenant={selectedTenant} 
                      onRefreshTenant={handleRefreshAll} 
                    />
                  )}

                  {activeTab === 'ia' && (
                    <IATreino 
                      tenant={selectedTenant} 
                      onRefreshTenant={handleRefreshAll} 
                    />
                  )}

                  {activeTab === 'config' && (
                    <Configuracoes 
                      tenant={selectedTenant} 
                      webhookLogs={webhookLogs} 
                      onRefreshTenant={handleRefreshAll} 
                      onRefreshWebhookLogs={handleRefreshAll} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>

      </div>
    </div>
  );
}
