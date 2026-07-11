import React, { useState } from 'react';
import { 
  Users, Search, UserPlus, Trash2, Mail, Phone, Tag, Calendar, 
  Download, Upload, ChevronRight, MessageSquare, Plus, Check, AlertCircle 
} from 'lucide-react';
import { Tenant, Contact } from '../types';
import { saveContact, deleteContact } from '../lib/api';

interface ContatosProps {
  tenant: Tenant;
  contacts: Contact[];
  onRefreshContacts: () => void;
  onNavigateToChat: (contact: Contact) => void;
}

export default function Contatos({ tenant, contacts, onRefreshContacts, onNavigateToChat }: ContatosProps) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Create contact states
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [stage, setStage] = useState('novo');

  // Import mock list animation
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Extract all unique tags across contacts for filter dropdown
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));

  // Filter contacts list
  const filtered = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.phone.includes(search) || 
                          (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchesTag = selectedTag === 'all' || (c.tags && c.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  // Handle manual contact creation
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      await saveContact(tenant.id, {
        name,
        phone,
        email,
        tags: tagInput ? tagInput.split(',').map(t => t.trim()) : [],
        pipelineStage: stage,
        aiAutoReply: true,
      });

      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setTagInput('');
      setStage('novo');
      setIsCreating(false);
      onRefreshContacts();
    } catch (err) {
      console.error('Error creating manual contact:', err);
    }
  };

  // Handle deletion of contact
  const handleDeleteContact = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este contato? Toda a conversa associada será apagada.')) {
      try {
        await deleteContact(tenant.id, id);
        onRefreshContacts();
      } catch (err) {
        console.error('Error deleting contact:', err);
      }
    }
  };

  // Simulate Bulk CSV Import
  const handleBulkImportSimulation = async () => {
    setIsImporting(true);
    setImportSuccess(false);

    // Dynamic mock leads data list
    const mockImports = [
      { name: 'Gabriel Pires (Lead WhatsApp)', phone: '+55 11 93456-7890', email: 'gabriel.pires@gmail.com', tags: ['Inbound n8n', 'Orçamento'], stage: 'novo' },
      { name: 'Juliana Mendes (Interesse Direct)', phone: '+55 21 95555-4444', email: 'juliana.mendes@hotmail.com', tags: ['Interesse Alto', 'Direct'], stage: 'contato' },
      { name: 'Rodrigo Alencar (Indicação)', phone: '+55 11 96666-3333', email: 'rodrigo.alencar@indique.com', tags: ['Indicação Vip'], stage: 'novo' }
    ];

    setTimeout(async () => {
      try {
        for (const lead of mockImports) {
          await saveContact(tenant.id, {
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            tags: lead.tags,
            pipelineStage: lead.stage,
            aiAutoReply: true,
          });
        }
        setIsImporting(false);
        setImportSuccess(true);
        onRefreshContacts();
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (err) {
        console.error('Error during bulk mock import:', err);
        setIsImporting(false);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6" id="contatos_view_panel">
      {/* Directory Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Base de Contatos & Leads
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Cadastre, pesquise, filtre e gerencie seus contatos integrados ao WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {/* Mock import btn */}
          <button
            onClick={handleBulkImportSimulation}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            {isImporting ? (
              <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            ) : importSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{importSuccess ? 'Importado!' : 'Importar CSV Mocks'}</span>
          </button>

          {/* Add contact btn */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Contato</span>
          </button>
        </div>
      </div>

      {/* Directory Filter controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Tag filter */}
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="w-full sm:w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
        >
          <option value="all">Filtrar por etiqueta</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Table grid directory */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/20 text-zinc-400 uppercase tracking-wider text-[10px] font-semibold border-b border-zinc-100 dark:border-zinc-850">
                <th className="py-3 px-4">Nome do Lead / Contato</th>
                <th className="py-3 px-4">WhatsApp / Telefone</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Estágio CRM</th>
                <th className="py-3 px-4">Etiquetas</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length > 0 ? (
                filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/10 text-zinc-700 dark:text-zinc-300">
                    {/* Identity */}
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p>{contact.name}</p>
                        <p className="text-[10px] font-normal text-zinc-400">ID: {contact.id}</p>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-zinc-500 dark:text-zinc-400">
                      {contact.phone}
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">
                      {contact.email || <span className="text-zinc-300 dark:text-zinc-700 italic">não informado</span>}
                    </td>

                    {/* Stage badge */}
                    <td className="py-3.5 px-4 capitalize font-medium">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold">
                        {contact.pipelineStage}
                      </span>
                    </td>

                    {/* Tags list */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags && contact.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] rounded font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* CTA Actions */}
                    <td className="py-3.5 px-4 text-right shrink-0">
                      <div className="flex justify-end gap-1.5">
                        {/* Go to chat */}
                        <button
                          onClick={() => onNavigateToChat(contact)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg transition"
                          title="Iniciar Atendimento"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Delete contact */}
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 dark:hover:bg-red-950/20 rounded-lg transition"
                          title="Excluir Contato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    Nenhum contato cadastrado ou compatível com os filtros na base de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL WINDOW: ADD NEW CONTACT */}
      {isCreating && (
        <div className="fixed inset-0 bg-zinc-950/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                Cadastrar Novo Contato no CRM
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none"
                  placeholder="Nome do Cliente"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    placeholder="+55 11 99999-9999"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    placeholder="email@cliente.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Etiquetas (Separadas por vírgula)</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none"
                  placeholder="VIP, Interesse Corte, n8n"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-1">Etapa Inicial CRM</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="novo">Novo</option>
                  <option value="contato">Em Contato</option>
                  <option value="proposta">Proposta</option>
                  <option value="negociacao">Negociação</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Cadastrar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
