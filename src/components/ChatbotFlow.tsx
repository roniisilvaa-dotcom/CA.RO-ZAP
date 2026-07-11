import { useState } from 'react';
import { 
  Bot, GitFork, ArrowRight, Settings, Plus, Trash2, Calendar, Clock, 
  MessageSquare, UserCheck, AlertTriangle, Save, CheckCircle2 
} from 'lucide-react';
import { Tenant, ChatbotStep, ChatbotOption } from '../types';
import { updateTenant } from '../lib/api';

interface ChatbotFlowProps {
  tenant: Tenant;
  onRefreshTenant: () => void;
}

export default function ChatbotFlow({ tenant, onRefreshTenant }: ChatbotFlowProps) {
  const [steps, setSteps] = useState<ChatbotStep[]>(tenant.chatbotConfig || []);
  const [selectedStep, setSelectedStep] = useState<ChatbotStep | null>(steps[0] || null);

  // Business Hours state
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(true);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState(
    'Olá! No momento estamos fora do nosso horário de atendimento (Seg a Sáb das 9h às 20h). Deixe sua mensagem e nossa IA entrará em contato!'
  );

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle saving configurations to server
  const handleSaveFlows = async () => {
    try {
      await updateTenant(tenant.id, {
        chatbotConfig: steps,
      });
      setSaveSuccess(true);
      onRefreshTenant();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving chatbot config:', err);
    }
  };

  // Add new step node
  const handleAddStep = () => {
    const newId = 'step_' + Math.random().toString(36).substring(2, 9);
    const newStep: ChatbotStep = {
      id: newId,
      type: 'message',
      label: 'Novo Bloco ' + (steps.length + 1),
      content: 'Escreva a mensagem deste bloco aqui...',
    };

    const updated = [...steps, newStep];
    setSteps(updated);
    setSelectedStep(newStep);
  };

  // Delete step
  const handleDeleteStep = (id: string) => {
    if (steps.length <= 1) {
      alert('Seu chatbot deve possuir ao menos um bloco de atendimento.');
      return;
    }
    const updated = steps.filter(s => s.id !== id);
    setSteps(updated);
    setSelectedStep(updated[0]);
  };

  // Update selected step field
  const handleUpdateStepField = (fields: Partial<ChatbotStep>) => {
    if (!selectedStep) return;
    const updated = steps.map(s => {
      if (s.id === selectedStep.id) {
        const next = { ...s, ...fields } as ChatbotStep;
        return next;
      }
      return s;
    });
    setSteps(updated);
    setSelectedStep(prev => prev ? { ...prev, ...fields } as ChatbotStep : null);
  };

  // Add Menu option
  const handleAddOption = () => {
    if (!selectedStep) return;
    const currentOptions = selectedStep.options || [];
    const newOption: ChatbotOption = {
      label: 'Opção ' + (currentOptions.length + 1),
      nextStepId: steps[0]?.id || '',
    };
    handleUpdateStepField({
      options: [...currentOptions, newOption],
    });
  };

  // Remove Menu option
  const handleRemoveOption = (index: number) => {
    if (!selectedStep || !selectedStep.options) return;
    const updatedOptions = selectedStep.options.filter((_, i) => i !== index);
    handleUpdateStepField({
      options: updatedOptions,
    });
  };

  // Update specific Menu Option value
  const handleUpdateOption = (index: number, label: string, nextStepId: string) => {
    if (!selectedStep || !selectedStep.options) return;
    const updatedOptions = selectedStep.options.map((opt, i) => {
      if (i === index) {
        return { label, nextStepId };
      }
      return opt;
    });
    handleUpdateStepField({
      options: updatedOptions,
    });
  };

  return (
    <div className="space-y-6" id="chatbot_flow_view">
      {/* Visual Editor Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Editor de Fluxos do Chatbot
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Personalize o atendimento do WhatsApp, configure menus de decisão e horários de funcionamento.
          </p>
        </div>

        <button
          onClick={handleSaveFlows}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-center"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Body Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LIST OF BLOCKS / STEPS */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Passos do Chatbot</h3>
            <button
              onClick={handleAddStep}
              className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Bloco
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {steps.map((step) => {
              const isSelected = selectedStep?.id === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStep(step)}
                  className={`p-3 rounded-xl cursor-pointer border text-xs transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 text-indigo-950 dark:text-indigo-300 font-semibold' 
                      : 'bg-zinc-50/50 dark:bg-zinc-950/20 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {step.type === 'message' && <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-400" />}
                    {step.type === 'menu' && <GitFork className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
                    {step.type === 'transfer' && <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />}
                    
                    <span className="truncate">{step.label}</span>
                  </div>

                  {/* Quick delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                    className="p-1 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Business working hours widget */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Expediente & Fora de Horário</span>
            
            {/* Toggle hours limit */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Ativar Mensagem Fora de Horário</span>
              <input
                type="checkbox"
                checked={workingHoursEnabled}
                onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-zinc-100 border-zinc-300"
              />
            </div>

            {workingHoursEnabled && (
              <textarea
                value={outOfHoursMessage}
                onChange={(e) => setOutOfHoursMessage(e.target.value)}
                rows={4}
                className="w-full p-2.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Insira a saudação fora de expediente..."
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WORKSPACE FOR SELECTED NODE */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between min-h-[400px]">
          {selectedStep ? (
            <div className="space-y-5">
              {/* Node meta */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Editor de Bloco Conversacional</h3>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded-full uppercase">
                  ID: {selectedStep.id}
                </span>
              </div>

              {/* Node edit fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Título do Bloco</label>
                  <input
                    type="text"
                    value={selectedStep.label}
                    onChange={(e) => handleUpdateStepField({ label: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    placeholder="Ex: Menu Inicial"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Tipo de Ação</label>
                  <select
                    value={selectedStep.type}
                    onChange={(e) => handleUpdateStepField({ type: e.target.value as any, options: e.target.value === 'menu' ? [] : undefined })}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="message">Mensagem Simples (Envia Texto)</option>
                    <option value="menu">Menu de Decisão (Botões de Escolha)</option>
                    <option value="transfer">Transbordo Humano (Direciona p/ Atendente)</option>
                  </select>
                </div>
              </div>

              {/* Message text content block */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Mensagem de Texto (Enviada no WhatsApp)</label>
                <textarea
                  value={selectedStep.content}
                  onChange={(e) => handleUpdateStepField({ content: e.target.value })}
                  rows={4}
                  className="w-full p-3 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Olá! Como posso ajudar você hoje?..."
                />
              </div>

              {/* Message flow options if type is MENU */}
              {selectedStep.type === 'menu' && (
                <div className="space-y-3.5 bg-zinc-50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Opções do Menu</span>
                    <button
                      onClick={handleAddOption}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Opção
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {selectedStep.options && selectedStep.options.map((opt, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-2.5 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-250/20 dark:border-zinc-800/80 shadow-xs">
                        {/* Option label text */}
                        <div className="flex-1 w-full">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Rótulo do Botão</label>
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => handleUpdateOption(idx, e.target.value, opt.nextStepId)}
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-lg text-zinc-800 dark:text-zinc-100"
                            placeholder="Ex: Falar com suporte"
                          />
                        </div>

                        {/* Direct target step */}
                        <div className="flex-1 w-full">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Ir para o Bloco</label>
                          <select
                            value={opt.nextStepId}
                            onChange={(e) => handleUpdateOption(idx, opt.label, e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-lg px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300"
                          >
                            <option value="">-- Selecione o bloco --</option>
                            {steps.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg mt-4 shrink-0 transition"
                          title="Remover Opção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!selectedStep.options || selectedStep.options.length === 0) && (
                      <span className="text-xs text-zinc-400 italic block py-2 text-center">Nenhum botão de decisão cadastrado. O fluxo travará aqui. Crie opções para o menu.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Message Flow redirect if NOT MENU */}
              {selectedStep.type === 'message' && (
                <div className="bg-zinc-50 dark:bg-zinc-950/20 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Avanço automático (Fluxo Direto)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Após enviar a mensagem, avançar para:</span>
                    <select
                      value={selectedStep.nextStepId || ''}
                      onChange={(e) => handleUpdateStepField({ nextStepId: e.target.value })}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                    >
                      <option value="">Parar Fluxo (Aguardar Cliente)</option>
                      {steps.filter(s => s.id !== selectedStep.id).map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-400 text-xs">
              Selecione um passo do chatbot no painel esquerdo para editá-lo.
            </div>
          )}

          {/* Quick instructions preview */}
          <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2.5 text-xs text-zinc-400">
            <AlertTriangle className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
            <p><strong>Dica de Arquiteto:</strong> A nossa IA (Gemini) trabalha de forma híbrida com este chatbot. Se o cliente desviar do fluxo fixo do chatbot digitando uma pergunta complexa ou contextual, o chatbot dá preferência ao processamento cognitivo da IA, respondendo com base nas tabelas e base de conhecimento cadastradas!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
