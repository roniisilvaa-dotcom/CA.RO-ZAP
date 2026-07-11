import { useState } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Bot, User, CheckCircle2, Phone, Mail, FileText, 
  Tag, Calendar, Sparkles, MessageSquare, AlertCircle, Plus 
} from 'lucide-react';
import { Tenant, Contact } from '../types';
import { saveContact } from '../lib/api';

interface CRMKanbanProps {
  tenant: Tenant;
  contacts: Contact[];
  onRefreshContacts: () => void;
  onNavigateToChat: (contact: Contact) => void;
}

export default function CRMKanban({ tenant, contacts, onRefreshContacts, onNavigateToChat }: CRMKanbanProps) {
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);

  // Define CRM stages with appropriate styling parameters
  const STAGES = [
    { id: 'novo', name: 'Novos Leads', color: 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400' },
    { id: 'contato', name: 'Em Contato', color: 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400' },
    { id: 'proposta', name: 'Proposta', color: 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-400' },
    { id: 'negociacao', name: 'Negociação', color: 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400' },
    { id: 'fechado', name: 'Fechado / Ganho', color: 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400' }
  ];

  // Group contacts by stage
  const getLeadsInStage = (stageId: string) => {
    return contacts.filter(c => c.pipelineStage === stageId);
  };

  // Fast-advance stage
  const handleMoveStage = async (contact: Contact, direction: 'prev' | 'next') => {
    const stageIds = STAGES.map(s => s.id);
    const currentIdx = stageIds.indexOf(contact.pipelineStage);
    let newIdx = currentIdx;

    if (direction === 'next' && currentIdx < stageIds.length - 1) {
      newIdx = currentIdx + 1;
    } else if (direction === 'prev' && currentIdx > 0) {
      newIdx = currentIdx - 1;
    }

    if (newIdx !== currentIdx) {
      const targetStage = stageIds[newIdx];
      try {
        await saveContact(tenant.id, {
          id: contact.id,
          pipelineStage: targetStage,
        });
        onRefreshContacts();
        // Update selected if open
        if (selectedLead?.id === contact.id) {
          setSelectedLead(prev => prev ? { ...prev, pipelineStage: targetStage } : null);
        }
      } catch (err) {
        console.error('Error shifting CRM stage:', err);
      }
    }
  };

  return (
    <div className="space-y-6" id="crm_kanban_view">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Funil de Vendas CRM
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Arrastar e acompanhar o progresso dos leads qualificados pela Inteligência Artificial.
          </p>
        </div>
        <div className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl font-semibold">
          Total: {contacts.length} Leads Ativos
        </div>
      </div>

      {/* Kanban Board Grid Layout */}
      <LayoutGroup>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsInStage(stage.id);
            return (
              <div 
                key={stage.id} 
                className="bg-zinc-50 dark:bg-zinc-950/30 p-3.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 flex flex-col shrink-0 min-w-[220px]"
                id={`crm_column_${stage.id}`}
              >
                {/* Column Title */}
                <div className={`px-3 py-2 rounded-xl border-l-4 ${stage.color} mb-3 flex justify-between items-center shrink-0`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{stage.name}</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 bg-white dark:bg-zinc-900 rounded-lg shadow-xs">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5 min-h-[100px]">
                  {stageLeads.length > 0 ? (
                    stageLeads.map((lead) => (
                      <motion.div
                        layout
                        key={lead.id}
                        id={`kanban_card_${lead.id}`}
                        onClick={() => setSelectedLead(lead)}
                        className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs cursor-pointer hover:shadow-md hover:border-indigo-500/50 transition-all space-y-2.5 relative group"
                        whileHover={{ y: -2 }}
                      >
                        {/* Card Header (Lead Score tag & Name) */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-snug">
                            {lead.name}
                          </h4>
                          {lead.leadScore === 'hot' && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[9px] font-bold rounded">
                              HOT 🔥
                            </span>
                          )}
                          {lead.leadScore === 'warm' && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded">
                              WARM ⚡
                            </span>
                          )}
                        </div>

                        {/* Phone / Contact Details snippet */}
                        <p className="text-[10px] text-zinc-400">{lead.phone}</p>

                        {/* Applied tags preview */}
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[9px] font-medium">
                                {tag}
                              </span>
                            ))}
                            {lead.tags.length > 2 && (
                              <span className="text-[9px] text-zinc-400 font-bold">+{lead.tags.length - 2}</span>
                            )}
                          </div>
                        )}

                        {/* Card Footer: Quick Actions navigation & move columns */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 text-xs text-zinc-400 shrink-0">
                          {/* Left Arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStage(lead, 'prev');
                            }}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            disabled={lead.pipelineStage === 'novo'}
                            title="Mover para esquerda"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick details indicator */}
                          <span className="text-[10px] font-semibold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                            Ver Ficha
                          </span>

                          {/* Right Arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStage(lead, 'next');
                            }}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            disabled={lead.pipelineStage === 'fechado'}
                            title="Mover para direita"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-[11px] text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      Sem leads nesta etapa.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      {/* CRM LEAD FULL SLIDE OVER DETAILS SCREEN */}
      {selectedLead && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex justify-end z-50">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-md font-bold text-zinc-900 dark:text-zinc-100">Ficha do Lead (CRM Hub)</h3>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full"
                >
                  &times;
                </button>
              </div>

              {/* Lead main identity */}
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/20 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                  {selectedLead.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight">{selectedLead.name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedLead.phone}</p>
                  <p className="text-xs text-zinc-400">{selectedLead.email || 'Sem email cadastrado'}</p>
                </div>
              </div>

              {/* AI scoring explanation */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 p-4 rounded-xl border border-indigo-100/40 dark:border-indigo-900/40 space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-500" /> Diagnóstico da IA Avançada
                </span>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Temperatura:</span>
                  {selectedLead.leadScore === 'hot' && <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded">QUENTE 🔥</span>}
                  {selectedLead.leadScore === 'warm' && <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 rounded">MORNO ⚡</span>}
                  {selectedLead.leadScore === 'cold' && <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-950/30 px-2 py-0.5 rounded">FRIO ❄️</span>}
                </div>

                {selectedLead.leadReason ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 italic leading-relaxed pt-1.5">
                    "{selectedLead.leadReason}"
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 italic pt-1.5">Aguardando mensagem simulada do cliente para disparar qualificação automática.</p>
                )}
              </div>

              {/* Lead detail fields list */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Campos do CRM</span>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-zinc-400">Etapa do Funil:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200 capitalize">{selectedLead.pipelineStage}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Auto Resposta WhatsApp:</span>
                    <span className={`font-semibold ${selectedLead.aiAutoReply ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {selectedLead.aiAutoReply ? 'Ativado (IA Atendendo)' : 'Desativado (Humanos)'}
                    </span>
                  </div>

                  {selectedLead.customFields && Object.entries(selectedLead.customFields).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5">
                      <span className="text-zinc-400 capitalize">{k}:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CRM tags applied */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Etiquetas Aplicadas</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLead.tags && selectedLead.tags.map((tag) => (
                    <span key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded text-xs font-bold">
                      {tag}
                    </span>
                  ))}
                  {(!selectedLead.tags || selectedLead.tags.length === 0) && (
                    <span className="text-xs text-zinc-400 italic">Sem etiquetas.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Footer inside drawer */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <button
                onClick={() => {
                  onNavigateToChat(selectedLead);
                  setSelectedLead(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <MessageSquare className="w-4 h-4" />
                Ir para Chat do WhatsApp
              </button>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-200"
              >
                Fechar Ficha
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
