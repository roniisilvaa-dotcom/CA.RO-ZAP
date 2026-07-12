import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Send, Bot, User, UserCheck, Tag, Trash2, Edit2, Plus, AlertCircle,
  Sparkles, Check, CheckCheck, Landmark, Smartphone, Mail, Phone, Lock, 
  HelpCircle, CheckCircle2, RefreshCw, Languages, FileText, ChevronRight,
  UserPlus, CheckSquare
} from 'lucide-react';
import { Tenant, Contact, Message, Note } from '../types';
import { 
  sendMessage, fetchMessages, saveContact, suggestReply, magicEnhance, aiAutoRespond 
} from '../lib/api';

interface ChatAtendimentoProps {
  tenant: Tenant;
  contacts: Contact[];
  onRefreshContacts: () => void;
}

export default function ChatAtendimento({ tenant, contacts, onRefreshContacts }: ChatAtendimentoProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messagesList, setMessagesList] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // AI magic box state
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [isEnhancingText, setIsEnhancingText] = useState(false);
  const [magicBoxOpen, setMagicBoxOpen] = useState(false);

  // Inbound Customer Simulator states
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatedText, setSimulatedText] = useState('');
  const [isSimulatingResponse, setIsSimulatingResponse] = useState(false);

  // Add tag / dynamic fields states
  const [newTagInput, setNewTagInput] = useState('');
  const [newNoteInput, setNewNoteInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesList]);

  // Load messages when contact changes
  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const loadMessages = async (contactId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await fetchMessages(contactId);
      setMessagesList(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Handle human agent sending message or internal note
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedContact) return;

    try {
      const msg = await sendMessage(selectedContact.id, {
        sender: isInternalNote ? 'agent' : 'agent',
        body: inputText,
        type: 'text',
        isInternalNote,
        authorName: 'Camila',
      });

      setMessagesList(prev => [...prev, msg]);
      setInputText('');

      // If we posted a message (not internal note), trigger webhook simulated event
      if (!isInternalNote) {
        // Refresh contact list to show last message timestamp
        onRefreshContacts();
      } else {
        // If we made a note, reload contact to reflect internal history
        await handleSaveContactField({
          notes: [
            {
              id: 'n_' + Math.random().toString(36).substring(2, 9),
              body: inputText,
              author: 'Camila',
              createdAt: new Date().toISOString()
            },
            ...(selectedContact.notes || [])
          ]
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Update contact property directly to server
  const handleSaveContactField = async (updatedFields: Partial<Contact>) => {
    if (!selectedContact) return;
    try {
      const updated = await saveContact(tenant.id, {
        id: selectedContact.id,
        ...updatedFields,
      });
      setSelectedContact(updated);
      onRefreshContacts();
    } catch (err) {
      console.error('Error updating contact:', err);
    }
  };

  // -------------------------------------------------------------
  // AI COPILOT: SUGGEST RESPONSE VIA GEMINI
  // -------------------------------------------------------------
  const handleGetAiSuggestion = async () => {
    if (!selectedContact) return;
    setIsGeneratingSuggestion(true);
    setAiSuggestion('');
    try {
      const history = messagesList.slice(-6).map(m => ({
        sender: m.sender,
        body: m.body
      }));

      const res = await suggestReply(
        history,
        tenant.knowledgeBase.text,
        tenant.knowledgeBase.catalogue
      );

      setAiSuggestion(res.suggestion);
    } catch (err) {
      console.error('Error getting suggestion:', err);
      setAiSuggestion('Não foi possível gerar uma sugestão com a IA neste momento. Tente novamente.');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleApplySuggestion = () => {
    setInputText(aiSuggestion);
    setAiSuggestion('');
  };

  // -------------------------------------------------------------
  // AI ENHANCER: MAGIC REWRITE
  // -------------------------------------------------------------
  const handleEnhanceText = async (mode: string) => {
    if (!inputText.trim()) return;
    setIsEnhancingText(true);
    try {
      const res = await magicEnhance(inputText, mode);
      setInputText(res.output);
    } catch (err) {
      console.error('Error rewriting text:', err);
    } finally {
      setIsEnhancingText(false);
    }
  };

  // -------------------------------------------------------------
  // WHATSAPP INBOUND SIMULATOR: TRIGGERS GEMINI AUTO RESPONDER & CLASSIFIER
  // -------------------------------------------------------------
  const handleSimulateInboundMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedText.trim() || !selectedContact) return;

    setIsSimulatingResponse(true);
    const textToSend = simulatedText;
    setSimulatedText('');
    setSimulatorOpen(false);

    try {
      // Trigger RAG auto respond on the backend
      const res = await aiAutoRespond(tenant.id, selectedContact.id, textToSend);
      
      // Update local messages and update selectedContact to display new score/stage
      setMessagesList(prev => [...prev, res.aiMessage]);
      setSelectedContact(res.contact);
      onRefreshContacts();
    } catch (err) {
      console.error('Error simulating inbound:', err);
    } finally {
      setIsSimulatingResponse(false);
    }
  };

  // Add custom tags
  const handleAddTag = () => {
    if (!newTagInput.trim() || !selectedContact) return;
    const cleanTag = newTagInput.trim();
    if (!selectedContact.tags.includes(cleanTag)) {
      const updatedTags = [...selectedContact.tags, cleanTag];
      handleSaveContactField({ tags: updatedTags });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedContact) return;
    const updatedTags = selectedContact.tags.filter(t => t !== tagToRemove);
    handleSaveContactField({ tags: updatedTags });
  };

  // Filter contacts by search & pipeline stage dropdown
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone.includes(searchQuery) ||
                          (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = filterStage === 'all' || c.pipelineStage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden h-[calc(100vh-180px)] min-h-[500px]" id="chat_atendimento_panel">
      
      {/* 1. LEFT SIDEBAR: CONVERSATIONS LIST */}
      <div className="lg:col-span-3 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/20">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              Conversas 
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                {filteredContacts.length}
              </span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterStage(filterStage === 'all' ? 'novo' : 'all')}
                className={`p-1 rounded text-xs transition ${
                  filterStage !== 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Filtrar por Novos"
              >
                Novos
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar contato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Pipeline stages filter */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">Todas as etapas CRM</option>
            <option value="novo">Novo Lead</option>
            <option value="contato">Em Contato</option>
            <option value="proposta">Proposta Enviada</option>
            <option value="negociacao">Em Negociação</option>
            <option value="fechado">Fechado / Ganho</option>
          </select>
        </div>

        {/* Contacts List Body */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              return (
                <div
                  key={contact.id}
                  id={`contact_item_${contact.id}`}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative ${
                    isSelected 
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-4 border-indigo-600' 
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    {contact.avatarUrl ? (
                      <img src={contact.avatarUrl} alt={contact.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold font-display text-sm">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Status dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                  </div>

                  {/* Body information */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {contact.name}
                      </h4>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {new Date(contact.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                      {contact.phone}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {/* AI Autoreply badge */}
                      {contact.aiAutoReply ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[9px] rounded font-medium">
                          <Bot className="w-2.5 h-2.5" /> Auto-IA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-[9px] rounded font-medium">
                          <User className="w-2.5 h-2.5" /> Humano
                        </span>
                      )}

                      {/* Lead score badge */}
                      {contact.leadScore === 'hot' && (
                        <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] rounded font-bold">
                          HOT 🔥
                        </span>
                      )}
                      {contact.leadScore === 'warm' && (
                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] rounded font-bold">
                          WARM ⚡
                        </span>
                      )}

                      {/* Stage badge */}
                      <span className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] rounded-full uppercase tracking-wider font-mono">
                        {contact.pipelineStage}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              Nenhum contato encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTRAL PANEL: ACTIVE CHAT WINDOW */}
      <div className="lg:col-span-6 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/40">
        {selectedContact ? (
          <>
            {/* Active Chat Header */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {selectedContact.avatarUrl ? (
                  <img src={selectedContact.avatarUrl} alt={selectedContact.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    {selectedContact.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {selectedContact.name}
                    {selectedContact.aiAutoReply && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                        AI Ativa
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    WhatsApp: {selectedContact.phone} | Responsável: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{selectedContact.assignedTo ? 'Camila' : 'Sem responsável'}</span>
                  </p>
                </div>
              </div>

              {/* Action utilities */}
              <div className="flex items-center gap-1.5">
                {/* AI Toggle on WhatsApp */}
                <button
                  id="toggle_ai_autoreply"
                  onClick={() => handleSaveContactField({ aiAutoReply: !selectedContact.aiAutoReply })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedContact.aiAutoReply 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800'
                  }`}
                  title={selectedContact.aiAutoReply ? 'Desativar Resposta Automática da IA' : 'Ativar Resposta Automática da IA'}
                >
                  <Bot className="w-4 h-4" />
                  <span>{selectedContact.aiAutoReply ? 'IA Ativa' : 'IA Desativada'}</span>
                </button>

                {/* Simulator Open */}
                <button
                  id="open_simulator_btn"
                  onClick={() => setSimulatorOpen(true)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm"
                  title="Simular Mensagem Recebida do Cliente"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Simular WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 relative">
              {isLoadingMessages ? (
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs text-zinc-400">Carregando histórico...</span>
                  </div>
                </div>
              ) : null}

              {messagesList.length > 0 ? (
                messagesList.map((message) => {
                  const isCustomer = message.sender === 'customer';
                  const isAI = message.sender === 'ai';
                  const isNote = message.isInternalNote;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} group`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs shadow-sm ${
                          isNote 
                            ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 text-zinc-800 dark:text-zinc-200 shadow-amber-100/10'
                            : isCustomer
                              ? 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 text-zinc-800 dark:text-zinc-200'
                              : isAI
                                ? 'bg-emerald-500 text-white rounded-tr-none font-medium'
                                : 'bg-indigo-600 text-white rounded-tr-none'
                        }`}
                      >
                        {/* Bubble metadata sender tag */}
                        <div className="flex items-center justify-between gap-4 mb-1 text-[9px] font-semibold tracking-wide uppercase opacity-75">
                          <span>
                            {isNote ? '📝 NOTA INTERNA' : isCustomer ? 'CLIENTE' : isAI ? '🤖 ASSISTENTE IA' : 'HUMANO'}
                          </span>
                          {message.authorName && <span>por {message.authorName}</span>}
                        </div>

                        {/* Content text */}
                        <p className="whitespace-pre-line leading-relaxed">{message.body}</p>

                        {/* Timing and read tick */}
                        <div className={`flex items-center justify-end gap-1 text-[9px] mt-1.5 ${isCustomer ? 'text-zinc-400' : 'text-white/80'}`}>
                          <span>
                            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isCustomer && !isNote && <CheckCheck className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-zinc-400">
                  Nenhuma mensagem registrada. Envie uma mensagem ou use o simulador para começar.
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* AI Suggestion box preview if available */}
            {aiSuggestion && (
              <div className="px-4 py-3 bg-indigo-50/70 dark:bg-indigo-950/30 border-t border-b border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3 relative shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Sugestão Automática da IA</span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 italic font-medium">"{aiSuggestion}"</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={handleApplySuggestion}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded-lg shadow-sm"
                    >
                      Inserir no campo de texto
                    </button>
                    <button
                      onClick={() => setAiSuggestion('')}
                      className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] rounded-lg"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Input Footer */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 shrink-0">
              
              {/* Toolbar utilities */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Internal note switch */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsInternalNote(false)}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      !isInternalNote 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' 
                        : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    💬 Enviar WhatsApp
                  </button>
                  <button
                    onClick={() => setIsInternalNote(true)}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      isInternalNote 
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700' 
                        : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    📝 Nota Interna
                  </button>
                </div>

                {/* AI Tools Bar */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleGetAiSuggestion}
                    disabled={isGeneratingSuggestion}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-lg hover:bg-indigo-100 border border-indigo-200/40"
                  >
                    {isGeneratingSuggestion ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Sugestão de Resposta
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setMagicBoxOpen(!magicBoxOpen)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg hover:bg-zinc-200"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      Caixa Mágica IA
                    </button>

                    {/* Magic box drop options */}
                    {magicBoxOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 p-1.5 space-y-1">
                        <span className="text-[9px] font-bold text-zinc-400 block px-2 py-1 uppercase tracking-wider">Ações Rápidas de IA</span>
                        <button
                          onClick={() => { handleEnhanceText('professional'); setMagicBoxOpen(false); }}
                          className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          👔 Tom Profissional
                        </button>
                        <button
                          onClick={() => { handleEnhanceText('friendly'); setMagicBoxOpen(false); }}
                          className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          😊 Tom Amigável
                        </button>
                        <button
                          onClick={() => { handleEnhanceText('correct'); setMagicBoxOpen(false); }}
                          className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          ✍️ Corrigir Gramática
                        </button>
                        <button
                          onClick={() => { handleEnhanceText('translate_en'); setMagicBoxOpen(false); }}
                          className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          🇺🇸 Traduzir p/ Inglês
                        </button>
                        <button
                          onClick={() => { handleEnhanceText('translate_es'); setMagicBoxOpen(false); }}
                          className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          🇪🇸 Traduzir p/ Espanhol
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input message */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    isInternalNote 
                      ? "Digite uma nota interna... (Surgirá no histórico e será salvo no CRM)" 
                      : "Escreva uma resposta para o cliente..."
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isEnhancingText}
                  className={`flex-1 px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 border ${
                    isInternalNote 
                      ? 'bg-amber-50/50 border-amber-200 text-amber-900 focus:ring-amber-400' 
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100'
                  }`}
                />
                <button
                  type="submit"
                  className={`p-2.5 rounded-xl text-white shadow transition-all shrink-0 ${
                    isInternalNote 
                      ? 'bg-amber-500 hover:bg-amber-600' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Bot className="w-16 h-16 text-indigo-500/40 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Central de Atendimento</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Selecione um cliente no menu lateral esquerdo para visualizar a conversa, interagir com os leads, simular envios ou treinar o copiloto inteligente.
            </p>
          </div>
        )}
      </div>

      {/* 3. RIGHT SIDEBAR: LEAD DETAILS & CRM STAGE CONTROLS */}
      <div className="lg:col-span-3 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/20 p-4 space-y-5">
        {selectedContact ? (
          <>
            {/* 3A. CRM Lead Score */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Qualificação da IA</span>
              
              <div className="flex items-center gap-2">
                {selectedContact.leadScore === 'hot' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-sm font-bold">
                    <span>HOT 🔥 (Quente)</span>
                  </div>
                )}
                {selectedContact.leadScore === 'warm' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-sm font-bold">
                    <span>WARM ⚡ (Morno)</span>
                  </div>
                )}
                {selectedContact.leadScore === 'cold' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-sm font-bold">
                    <span>COLD ❄️ (Frio)</span>
                  </div>
                )}
                {!selectedContact.leadScore && (
                  <span className="text-xs text-zinc-400 italic">Sem classificação prévia da IA.</span>
                )}
              </div>

              {selectedContact.leadReason && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700/60 mt-2">
                  "{selectedContact.leadReason}"
                </p>
              )}
            </div>

            {/* 3B. Pipeline stage change */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Etapa no Pipeline CRM</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'novo', name: 'Novo' },
                  { id: 'contato', name: 'Contato' },
                  { id: 'proposta', name: 'Proposta' },
                  { id: 'negociacao', name: 'Negociação' },
                  { id: 'fechado', name: 'Fechado 🏆' }
                ].map((s) => {
                  const isActive = selectedContact.pipelineStage === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSaveContactField({ pipelineStage: s.id })}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3C. Custom dynamic properties extracted */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Campos Extraídos pela IA</span>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 text-xs space-y-2">
                {selectedContact.customFields && Object.keys(selectedContact.customFields).length > 0 ? (
                  Object.entries(selectedContact.customFields).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-1 border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                      <span className="text-zinc-400 capitalize">{k}:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{v}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-400 italic block py-1">Nenhum dado dinâmico detectado ainda.</span>
                )}
              </div>
            </div>

            {/* 3D. Applied tags manager */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Etiquetas / Tags</span>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedContact.tags && selectedContact.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="text-zinc-400 hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Nova tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 roundedpx-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3E. Internal notes list history */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Atividades e Histórico</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedContact.notes && selectedContact.notes.map(note => (
                  <div key={note.id} className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/30 p-2.5 rounded-lg text-[11px] space-y-1 text-zinc-700 dark:text-zinc-300">
                    <p className="font-semibold text-[10px] text-amber-700">Por {note.author}</p>
                    <p>{note.body}</p>
                    <span className="text-[9px] text-zinc-400 block">
                      {new Date(note.createdAt).toLocaleDateString('pt-BR')} {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {(!selectedContact.notes || selectedContact.notes.length === 0) && (
                  <span className="text-zinc-400 text-xs italic block">Nenhum evento ou nota registrado no CRM.</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-zinc-400 text-xs py-12">
            Selecione um cliente para exibir detalhes.
          </div>
        )}
      </div>

      {/* 4. MODAL POPUP: WHATSAPP CUSTOMER INBOUND SIMULATOR */}
      <AnimatePresence>
        {simulatorOpen && selectedContact && (
          <div className="fixed inset-0 bg-zinc-950/55 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-md font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-500" />
                  Simular Mensagem Recebida (Inbound)
                </h3>
                <button
                  onClick={() => setSimulatorOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 text-lg"
                >
                  &times;
                </button>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs text-zinc-500 space-y-1.5">
                <p><strong>Remetente:</strong> {selectedContact.name} ({selectedContact.phone})</p>
                <p>Esta ação simula o recebimento real de uma mensagem no WhatsApp. Se a Auto-IA estiver ativa, ela responderá automaticamente com base no nicho e no conhecimento treinado.</p>
              </div>

              <form onSubmit={handleSimulateInboundMessage} className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">Mensagem do Cliente</label>
                
                {/* Suggestions triggers prompt */}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSimulatedText('Quais os serviços disponíveis e os valores de cada um de vocês?')}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[10px] text-zinc-600 dark:text-zinc-300 rounded font-semibold"
                  >
                    Dúvida catálogo 💰
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedText('Preciso agendar horário? Tem convênio com o plano Amil?')}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[10px] text-zinc-600 dark:text-zinc-300 rounded font-semibold"
                  >
                    Horário & Convênio 🏥
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedText('Quero agendar um combo agora mesmo para sábado às 10 horas com o Thiago.')}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[10px] text-zinc-600 dark:text-zinc-300 rounded font-semibold"
                  >
                    Agendar agora (Hot) 🔥
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedText('Por favor, me transfira para um atendente humano agora.')}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[10px] text-zinc-600 dark:text-zinc-300 rounded font-semibold"
                  >
                    Atendente Humano 🙋‍♂️
                  </button>
                </div>

                <textarea
                  placeholder="Escreva a mensagem simulada do WhatsApp..."
                  value={simulatedText}
                  onChange={(e) => setSimulatedText(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-100"
                  required
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSimulatorOpen(false)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    Simular Recebimento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spinner backdrop when Simulating processes */}
      {isSimulatingResponse && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center gap-3 shadow-2xl">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Processando com Inteligência Artificial</h4>
            <p className="text-[11px] text-zinc-400 max-w-xs text-center">A IA está gerando resposta RAG baseada no catálogo, calculando Lead Score, adicionando tags e movendo o lead no pipeline do CRM.</p>
          </div>
        </div>
      )}
    </div>
  );
}
