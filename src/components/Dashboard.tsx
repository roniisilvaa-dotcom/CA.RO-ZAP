import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, MessageSquare, Clock, Cpu, ArrowUpRight, TrendingUp, CheckCircle, 
  HelpCircle, UserCheck, ShieldAlert 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Tenant, Contact } from '../types';

interface DashboardProps {
  tenant: Tenant;
  contacts: Contact[];
  auditLogs: any[];
}

export default function Dashboard({ tenant, contacts, auditLogs }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'today'>('7d');

  // Compute metrics based on contacts list
  const totalContacts = contacts.length;
  const activeChats = contacts.filter(c => c.pipelineStage !== 'fechado').length;
  const aiAutoChats = contacts.filter(c => c.aiAutoReply).length;
  const humanChats = totalContacts - aiAutoChats;

  const hotLeads = contacts.filter(c => c.leadScore === 'hot').length;
  const warmLeads = contacts.filter(c => c.leadScore === 'warm').length;
  const coldLeads = contacts.filter(c => c.leadScore === 'cold').length;

  // Chart data simulation depending on Niche & timeRange
  const trendData = timeRange === 'today' ? [
    { name: '08:00', total: 4, ai: 3, human: 1 },
    { name: '10:00', total: 12, ai: 9, human: 3 },
    { name: '12:00', total: 15, ai: 11, human: 4 },
    { name: '14:00', total: 22, ai: 17, human: 5 },
    { name: '16:00', total: 19, ai: 14, human: 5 },
    { name: '18:00', total: 10, ai: 8, human: 2 },
  ] : timeRange === '7d' ? [
    { name: 'Seg', total: 18, ai: 14, human: 4 },
    { name: 'Ter', total: 25, ai: 20, human: 5 },
    { name: 'Qua', total: 32, ai: 24, human: 8 },
    { name: 'Qui', total: 28, ai: 21, human: 7 },
    { name: 'Sex', total: 42, ai: 32, human: 10 },
    { name: 'Sáb', total: 35, ai: 28, human: 7 },
    { name: 'Dom', total: 14, ai: 12, human: 2 },
  ] : [
    { name: 'Semana 1', total: 120, ai: 95, human: 25 },
    { name: 'Semana 2', total: 145, ai: 110, human: 35 },
    { name: 'Semana 3', total: 170, ai: 135, human: 35 },
    { name: 'Semana 4', total: 195, ai: 155, human: 40 },
  ];

  const pieData = [
    { name: 'Hot Leads', value: hotLeads || 3, color: '#EF4444' },
    { name: 'Warm Leads', value: warmLeads || 4, color: '#F59E0B' },
    { name: 'Cold Leads', value: coldLeads || 1, color: '#3B82F6' },
  ];

  return (
    <div className="space-y-6" id="dashboard_view">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {tenant.niche}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Olá, rony! Bem-vindo ao painel da {tenant.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Acompanhe o desempenho de suas automações de WhatsApp e inteligência artificial em tempo real.
          </p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl self-start md:self-center border border-slate-200/50 dark:border-zinc-700/50">
          {(['today', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              id={`filter_${r}`}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                timeRange === r
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              {r === 'today' ? 'Hoje' : r === '7d' ? '7 Dias' : '30 Dias'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs relative overflow-hidden"
          id="metric_total_chats"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Conversas Totais</p>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">{totalContacts * 4 + 12}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-4">
            <ArrowUpRight className="w-4 h-4" />
            <span>+18.4%</span>
            <span className="text-slate-400 dark:text-zinc-500 font-medium ml-1">vs ontem</span>
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs relative overflow-hidden"
          id="metric_new_leads"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Clientes & Leads</p>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">{totalContacts}</h3>
            </div>
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-100/50 dark:border-sky-900/20">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-4">
            <ArrowUpRight className="w-4 h-4" />
            <span>+12.1%</span>
            <span className="text-slate-400 dark:text-zinc-500 font-medium ml-1">qualificados</span>
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs relative overflow-hidden"
          id="metric_median_time"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tempo de Resposta</p>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">48s</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100/50 dark:border-amber-900/20">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-4">
            <CheckCircle className="w-4 h-4" />
            <span>-14s economia</span>
          </div>
        </motion.div>

        {/* Metric 4 - WITH BRANDED LEFT BORDER FROM DESIGN HTML */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 border-l-4 border-l-indigo-500 shadow-xs relative overflow-hidden"
          id="metric_ai_automation"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Automação IA</p>
              <h3 className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400 mt-2">
                {totalContacts > 0 ? Math.round((aiAutoChats / totalContacts) * 100) : 89.4}%
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
              <Cpu className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 text-xs mt-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-slate-500 dark:text-zinc-400">912 resolvidas</span>
          </div>
        </motion.div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart (Conversas) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Fluxo de Conversas</h2>
              <p className="text-xs text-zinc-400">Distribuição volumétrica das mensagens processadas</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-indigo-500">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Total
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Automação IA
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" stroke="#A1A1AA" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181B', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="ai" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAI)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart (Lead Quality Index) */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Qualificação dos Leads</h2>
            <p className="text-xs text-zinc-400">Classificação avançada em tempo real da IA</p>
          </div>

          <div className="h-44 flex items-center justify-center relative my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181B', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#FFF', 
                    fontSize: '11px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-xs text-zinc-400 block font-medium uppercase">Total</span>
              <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{totalContacts}</span>
            </div>
          </div>

          <div className="space-y-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-2 text-zinc-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                  {d.name}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Panel: Live Audit logs & Active Team status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Audit / Action Log Feed */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Atividades do Sistema</h2>
              <p className="text-xs text-zinc-400">Auditoria das últimas ações e treinamentos de IA</p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-60 overflow-y-auto pr-2 space-y-3 pt-2">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="flex gap-3 pt-3 first:pt-0">
                  <div className="mt-0.5">
                    {log.action.includes('IA') ? (
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                    ) : log.action.includes('WhatsApp') ? (
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{log.action}</span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">{log.details}</p>
                    <span className="text-[10px] text-zinc-400 block mt-1">por {log.user}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400">
                Nenhuma atividade recente registrada para esta empresa.
              </div>
            )}
          </div>
        </div>

        {/* Assigned team status card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800/50 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Equipe Logada</h2>
            <p className="text-xs text-zinc-400">Status dos agentes e setores ativos</p>
          </div>

          <div className="space-y-4 my-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    R
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">rony (Você)</p>
                  <p className="text-zinc-400 text-[10px]">Administrador</p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-medium">Online</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold">
                    T
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">Thiago Silva</p>
                  <p className="text-zinc-400 text-[10px]">Atendente</p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-[10px] rounded font-medium">Ausente</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold">
                    J
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">Júlia Costa</p>
                  <p className="text-zinc-400 text-[10px]">Gerente</p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-medium">Online</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center text-[11px] text-zinc-400 font-medium">
            Setores Vinculados: <span className="font-semibold text-zinc-500 dark:text-zinc-300">{tenant.sectors.slice(0, 3).join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
