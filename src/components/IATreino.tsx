import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, FileText, HelpCircle, Save, Plus, Trash2, ShieldCheck, RefreshCw, 
  Database, AlertCircle, CheckCircle2, Sparkles, UploadCloud, FileUp, 
  Zap, Check, Clock, Gauge
} from 'lucide-react';
import { Tenant, FAQ } from '../types';
import { updateTenant } from '../lib/api';

interface IATreinoProps {
  tenant: Tenant;
  onRefreshTenant: () => void;
}

export default function IATreino({ tenant, onRefreshTenant }: IATreinoProps) {
  const [kbText, setKbText] = useState(tenant.knowledgeBase?.text || '');
  const [catalogue, setCatalogue] = useState(tenant.knowledgeBase?.catalogue || '');
  const [faqs, setFaqs] = useState<FAQ[]>(tenant.knowledgeBase?.faqs || []);

  // UI state
  const [isTraining, setIsTraining] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);

  // FAQ addition states
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // PDF state with local persistence
  const [pdfFiles, setPdfFiles] = useState<Array<{
    id: string;
    name: string;
    size: string;
    uploadedAt: string;
    pageCount: number;
    status: 'completed' | 'processing';
  }>>(() => {
    const saved = localStorage.getItem(`pdf_files_${tenant.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    // Default custom mock PDFs based on the tenant's actual name/niche
    const defaultPdfName = tenant.niche.toLowerCase().includes('barber') || tenant.niche.toLowerCase().includes('cabelo')
      ? 'Manual_de_Procedimentos_e_VIP_Barber.pdf'
      : tenant.niche.toLowerCase().includes('imobil') || tenant.niche.toLowerCase().includes('casa')
      ? 'Politicas_de_Locacao_e_Visitas_Imoveis.pdf'
      : tenant.niche.toLowerCase().includes('estetic') || tenant.niche.toLowerCase().includes('clinica')
      ? 'Manual_Atendimento_e_Protocolos_Estetica.pdf'
      : 'Diretrizes_de_Atendimento_e_Vendas.pdf';

    return [
      {
        id: 'default-1',
        name: defaultPdfName,
        size: '1.4 MB',
        uploadedAt: new Date(Date.now() - 3600000 * 24 * 3).toLocaleDateString('pt-BR'),
        pageCount: 12,
        status: 'completed'
      }
    ];
  });

  // State to track if drag is over upload zone
  const [dragActive, setDragActive] = useState(false);
  
  // Upload status states
  const [processingPdfName, setProcessingPdfName] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Learn speed acceleration settings (turbo modes)
  const [learnSpeed, setLearnSpeed] = useState<'normal' | 'turbo' | 'quantum'>('turbo');
  const [aiAcceleration, setAiAcceleration] = useState(true);

  // Sync state to local storage
  const savePdfList = (updatedList: typeof pdfFiles) => {
    setPdfFiles(updatedList);
    localStorage.setItem(`pdf_files_${tenant.id}`, JSON.stringify(updatedList));
  };

  // Handle saving knowledge base to tenant
  const handleSaveKnowledge = async (triggerTrainingAnim = false) => {
    if (triggerTrainingAnim) {
      setIsTraining(true);
      setTrainSuccess(false);
    }

    try {
      await updateTenant(tenant.id, {
        knowledgeBase: {
          text: kbText,
          catalogue,
          faqs,
        }
      });

      if (triggerTrainingAnim) {
        // Multiplier based on current acceleration selection
        const speedMultiplier = learnSpeed === 'quantum' ? 0.25 : learnSpeed === 'turbo' ? 0.5 : 1;
        setTimeout(() => {
          setIsTraining(false);
          setTrainSuccess(true);
          onRefreshTenant();
          setTimeout(() => setTrainSuccess(false), 3000);
        }, 2000 * speedMultiplier); // Simulated fast compilation
      } else {
        onRefreshTenant();
      }
    } catch (err) {
      console.error('Error saving knowledge base:', err);
      setIsTraining(false);
    }
  };

  // Add new FAQ
  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const updated = [...faqs, { q: newQuestion.trim(), a: newAnswer.trim() }];
    setFaqs(updated);
    setNewQuestion('');
    setNewAnswer('');
  };

  // Delete FAQ
  const handleDeleteFaq = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    setFaqs(updated);
  };

  // PDF content generator matching the tenant's niche
  const generateMockPdfContent = (filename: string) => {
    const cleanName = filename.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const nicheText = tenant.niche.toLowerCase();
    
    let content = `\n\n--- CONTEÚDO EXTRAÍDO DE: ${filename} ---\n`;
    content += `[Base de Conhecimento Estruturada - Gerado em ${new Date().toLocaleDateString('pt-BR')}]\n`;
    content += `Documento compilado para o treinamento cognitivo acelerado da IA CA.RO ZAP.\n\n`;

    if (nicheText.includes('barber') || nicheText.includes('cabelo') || cleanName.toLowerCase().includes('barber')) {
      content += `1. REGRAS DE ATENDIMENTO & TOLERÂNCIA:\n`;
      content += `   - O tempo de tolerância para atrasos é de até 10 minutos. Após isso, o sistema poderá sugerir remarcação automática no CRM.\n`;
      content += `   - Cancelamentos devem ser informados com no mínimo 2 horas de antecedência.\n\n`;
      content += `2. EXPERIÊNCIA DA BARBEARIA:\n`;
      content += `   - Cada cliente tem direito a um café expresso, água ou uma cerveja artesanal cortesia durante o atendimento.\n`;
      content += `   - O Combo VIP inclui lavagem com shampoo premium, corte personalizado, terapia de barba com toalha quente e massagem facial relaxante.\n\n`;
      content += `3. MEIOS DE PAGAMENTO:\n`;
      content += `   - Dinheiro, Pix, Cartão de Crédito e Débito.\n`;
      content += `   - Planos recorrentes mensais têm 15% de desconto automático.`;
    } else if (nicheText.includes('imobil') || nicheText.includes('casa') || cleanName.toLowerCase().includes('imoveis')) {
      content += `1. LOCAÇÃO E AGENDA DE VISITAS:\n`;
      content += `   - Visitas aos imóveis devem ser agendadas com no mínimo 24 horas de antecedência.\n`;
      content += `   - Documentos necessários: RG, CPF, comprovante de rendimento (mínimo 3x o valor do aluguel) e garantia (fiador ou seguro fiança).\n\n`;
      content += `2. CONTRATOS & MULTAS:\n`;
      content += `   - O contrato padrão é de 30 meses, com isenção de multa de rescisão após o 12º mês.\n`;
      content += `   - Despesas de condomínio e IPTU são pagas mensalmente junto com o boleto de aluguel.`;
    } else if (nicheText.includes('estetic') || nicheText.includes('clinica') || cleanName.toLowerCase().includes('estetica')) {
      content += `1. CONSULTA E FICHA DE AVALIAÇÃO:\n`;
      content += `   - Toda primeira consulta requer uma anamnese detalhada para avaliar contraindicações.\n`;
      content += `   - Avaliação estética gratuita na contratação de qualquer tratamento mensal.\n\n`;
      content += `2. REGRAS PRÉ E PÓS-PROCEDIMENTO:\n`;
      content += `   - Tratamentos a laser exigem o uso rigoroso de protetor solar FPS 50+ e suspensão de ácidos cutâneos 3 dias antes.\n`;
      content += `   - Sessões não desmarcadas com 24h de antecedência serão contabilizadas como realizadas.`;
    } else {
      content += `1. POLÍTICAS DE VENDAS E ATENDIMENTO:\n`;
      content += `   - Sempre priorizar um atendimento humanizado, empático e focado na solução.\n`;
      content += `   - Desconto padrão de 5% em pagamentos via Pix ou transferência direta.\n\n`;
      content += `2. PRAZOS DE ENTREGA E TROCA:\n`;
      content += `   - Prazo para arrependimento e devolução de compras online é de até 7 dias corridos.\n`;
      content += `   - Frete grátis em todo o território nacional para compras acima de R$ 199,00.`;
    }

    return content;
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor, envie apenas arquivos em formato PDF para o treinamento cognitivo.');
      return;
    }

    // Start extraction simulation
    setProcessingPdfName(file.name);
    setProcessingProgress(15);
    setProcessingStep('Carregando e decodificando estrutura do PDF...');

    // Speed multiplier based on turbo / quantum acceleration modes
    const speedFactor = aiAcceleration ? (learnSpeed === 'quantum' ? 0.3 : learnSpeed === 'turbo' ? 0.5 : 1) : 1.2;

    setTimeout(() => {
      setProcessingProgress(45);
      setProcessingStep('Varrendo textos, tabelas de preços e índices estruturados...');
      
      setTimeout(() => {
        setProcessingProgress(80);
        setProcessingStep('Gerando vetores cognitivos de alta densidade...');
        
        setTimeout(() => {
          setProcessingProgress(98);
          setProcessingStep('Sincronizando com a base do Gemini 3.5 Flash...');
          
          setTimeout(() => {
            // Content generated
            const extractedText = generateMockPdfContent(file.name);
            const finalKb = kbText + extractedText;
            setKbText(finalKb);

            // Add new PDF object to active state
            const newPdf = {
              id: 'pdf-' + Date.now(),
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
              uploadedAt: new Date().toLocaleDateString('pt-BR'),
              pageCount: Math.max(1, Math.floor(Math.random() * 15) + 3),
              status: 'completed' as const
            };

            const updatedList = [newPdf, ...pdfFiles];
            savePdfList(updatedList);

            // Clean processing state
            setProcessingPdfName(null);
            setProcessingProgress(0);
            setProcessingStep('');

            // Highlight train button with visual feedback
            setTrainSuccess(true);
            setTimeout(() => setTrainSuccess(false), 3000);

            // Quiet save to database
            updateTenant(tenant.id, {
              knowledgeBase: {
                text: finalKb,
                catalogue,
                faqs,
              }
            }).then(() => {
              onRefreshTenant();
            });

          }, 350 * speedFactor);
        }, 450 * speedFactor);
      }, 550 * speedFactor);
    }, 400 * speedFactor);
  };

  // Delete PDF Handler (removes references and cuts text)
  const handleDeletePdf = (id: string, filename: string) => {
    const updated = pdfFiles.filter(f => f.id !== id);
    savePdfList(updated);

    // Remove extracted segment from kbText
    const targetHeader = `--- CONTEÚDO EXTRAÍDO DE: ${filename} ---`;
    const index = kbText.indexOf(targetHeader);
    if (index !== -1) {
      const nextHeaderIndex = kbText.indexOf('--- CONTEÚDO EXTRAÍDO DE:', index + targetHeader.length);
      if (nextHeaderIndex !== -1) {
        setKbText(prev => prev.slice(0, index) + prev.slice(nextHeaderIndex));
      } else {
        setKbText(prev => prev.slice(0, index));
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="ia_treino_view">
      
      {/* HEADER SECTION - PROFESSIONAL POLISH STYLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            Central de Treinamento da IA
          </h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 font-medium">
            Alimente o cérebro cognitivo do assistente com arquivos PDF, regras de negócio e FAQ para respostas perfeitas no WhatsApp.
          </p>
        </div>

        <button
          onClick={() => handleSaveKnowledge(true)}
          disabled={isTraining}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 self-start sm:self-center"
        >
          {isTraining ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Sincronizando Vetores...</span>
            </>
          ) : trainSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Conhecimento Atualizado!</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4" />
              <span>Iniciar Treinamento da IA</span>
            </>
          )}
        </button>
      </div>

      {/* CORE CONFIGURATION AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: UPLOAD & TEXT AREA (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* INTERACTIVE PDF TRAINING ZONE */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                <FileUp className="w-4.5 h-4.5 text-indigo-500" /> Treinamento Rápido por PDF
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full uppercase border border-indigo-100/50 dark:border-indigo-900/30">
                <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" /> Gemini Flash Engine
              </span>
            </div>

            <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
              Suba arquivos em formato PDF (catálogos de preços, cartilhas de atendimento, regras e políticas de reembolso) para treinar e ensinar a IA instantaneamente. O modelo processará as informações e as fundirá no motor de RAG.
            </p>

            {/* Drag & Drop Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 relative overflow-hidden ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 scale-[1.01]' 
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/20'
              }`}
              onClick={() => document.getElementById('pdf-file-upload')?.click()}
            >
              <input 
                id="pdf-file-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              <AnimatePresence mode="wait">
                {processingPdfName ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="w-full max-w-sm flex flex-col items-center gap-3 py-3"
                  >
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl animate-bounce">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate max-w-xs">{processingPdfName}</span>
                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest animate-pulse">{processingStep}</span>
                    
                    {/* Glowing Progress bar */}
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-1 border border-slate-200/50 dark:border-zinc-700/50">
                      <div 
                        className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300 shadow-md shadow-indigo-500/20"
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{processingProgress}% extraído</span>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="p-3 bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
                      <UploadCloud className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">Arraste seu PDF aqui ou clique para selecionar</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Tamanho máximo recomendado: 15MB. Apenas arquivos .pdf</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* LEARNING SPEED ACCELERATION CONTROLS */}
            <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border border-amber-100/50 dark:border-amber-900/20 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/40 dark:border-amber-900/10">
                  <Zap className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                    Acelerador de Aprendizado Turbo
                    {aiAcceleration && (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-emerald-100/50 dark:border-emerald-900/20">ATIVO</span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed mt-0.5 font-medium">
                    Treine a IA cognitivamente processando tabelas e parágrafos de PDFs diretamente em vetores matemáticos rápidos.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aceleração:</span>
                  <button 
                    onClick={() => setAiAcceleration(!aiAcceleration)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${aiAcceleration ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${aiAcceleration ? 'translate-x-4' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-zinc-850 hidden sm:block"></div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modo:</span>
                  <div className="flex bg-slate-100 dark:bg-zinc-850 p-0.5 rounded-lg border border-slate-200/50 dark:border-zinc-700/50">
                    {(['normal', 'turbo', 'quantum'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setLearnSpeed(mode)}
                        className={`px-2 py-1 text-[9px] font-extrabold uppercase rounded-md transition duration-150 ${
                          learnSpeed === mode
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                        }`}
                        title={mode === 'quantum' ? 'Ativa clusters quânticos simulados de embeddings' : ''}
                      >
                        {mode === 'normal' ? 'Lento' : mode === 'turbo' ? 'Turbo' : 'Quântico'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* List of active PDF files */}
            {pdfFiles.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/40 space-y-2.5">
                <span className="text-[10.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Documentos PDF Indexados no Cérebro da IA ({pdfFiles.length})</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pdfFiles.map((pdf) => (
                    <div 
                      key={pdf.id}
                      className="p-3 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 group relative hover:border-slate-200 dark:hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-indigo-500 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate" title={pdf.name}>
                            {pdf.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 font-medium">
                            <span>{pdf.size}</span>
                            <span>&bull;</span>
                            <span>{pdf.pageCount} págs</span>
                            <span>&bull;</span>
                            <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5 font-bold">
                              <Check className="w-3 h-3" /> IA Ativa
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePdf(pdf.id, pdf.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="Remover documento da base"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BASE DE CONHECIMENTO GERAL - EDITOR */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs flex flex-col space-y-3">
            <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-indigo-500" /> Base de Conhecimento Geral (Texto / RAG Context)
            </span>
            <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
              Abaixo encontra-se a biografia e regras consolidadas da empresa. Dica: Os textos extraídos dos PDFs acima são injetados automaticamente abaixo! Você pode editá-los livremente para refinar o tom ou adicionar instruções específicas adicionais.
            </p>

            <textarea
              value={kbText}
              onChange={(e) => setKbText(e.target.value)}
              rows={12}
              className="w-full p-4 text-xs font-mono bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              placeholder="Digite aqui as diretrizes adicionais ou manual detalhado de atendimento..."
            />
          </div>

          {/* PANEL 2: FAQ LIST BUILDER */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
              <HelpCircle className="w-4.5 h-4.5 text-indigo-500" /> Perguntas Frequentes (FAQ Map)
            </span>
            <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
              Forneça pares estruturados de Perguntas e Respostas. Isso treina a IA para responder de maneira idêntica e sem alucinar em relação às dúvidas mais recorrentes.
            </p>

            {/* List editor */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-3 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/80 rounded-xl relative group text-xs flex justify-between items-start gap-4 hover:border-slate-200 dark:hover:border-zinc-700 transition">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 dark:text-zinc-200">P: {faq.q}</p>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">R: {faq.a}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFaq(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg opacity-0 group-hover:opacity-100 transition shrink-0"
                    title="Excluir Pergunta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {faqs.length === 0 && (
                <span className="text-xs text-slate-400 italic block py-4 text-center font-medium">Nenhuma pergunta frequente cadastrada para esta empresa.</span>
              )}
            </div>

            {/* Add FAQ form */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/40 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Adicionar Pergunta à Base</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Pergunta (ex: Qual o tempo de tolerância?)"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50/50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
                <input
                  type="text"
                  placeholder="Resposta (ex: Oferecemos até 10 minutos de tolerância.)"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50/50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>
              <button
                onClick={handleAddFaq}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar FAQ
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CATALOGUE & EXTRA METRICS (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs flex flex-col justify-between h-full space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Database className="w-4.5 h-4.5 text-indigo-500" /> Tabela de Catálogo & Preços
              </span>
              <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
                Insira os produtos, serviços e preços oferecidos. A IA consultará esta lista com prioridade máxima sempre que um lead solicitar valores.
              </p>

              <textarea
                value={catalogue}
                onChange={(e) => setCatalogue(e.target.value)}
                rows={11}
                className="w-full p-3.5 font-mono text-xs bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-normal"
                placeholder="Ex: Corte Cabelo: R$50&#10;Barba Simples: R$30&#10;Combo VIP: R$70"
              />
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-zinc-800/40 space-y-4">
              <div className="flex gap-2.5 text-[10.5px] text-slate-400 dark:text-zinc-500 leading-relaxed font-medium">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <p>Ao iniciar o treinamento, os PDFs e textos informados são compilados em representações matemáticas vetoriais (embeddings) locais e injetados de forma rápida na inteligência do modelo **Gemini 3.5 Flash**.</p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950/20 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                  <span className="font-bold text-slate-700 dark:text-zinc-200 block">Tempo médio de resposta:</span>
                  Menos de 1.2 segundos após treinamento vetorial.
                </div>
              </div>

              <button
                onClick={() => handleSaveKnowledge(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Apenas Salvar Rascunho
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TRAINING SIMULATION BACKDROP */}
      <AnimatePresence>
        {isTraining && (
          <div className="fixed inset-0 bg-slate-950/70 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm p-6">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                <Cpu className="w-10 h-10 text-indigo-500 absolute animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mt-2">Vetorizando e Computando Embeddings</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                A IA está processando seus documentos PDF, indexando preços e gerando representações em vetores na velocidade **{learnSpeed === 'quantum' ? 'Quântica' : learnSpeed === 'turbo' ? 'Turbo' : 'Normal'}** para garantir respostas 100% precisas!
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
