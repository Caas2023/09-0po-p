import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  MapPin, 
  Phone, 
  Briefcase, 
  ChevronRight, 
  X,
  LayoutGrid, 
  List,       
  Trash2,     
  RotateCcw,  
  Building,
  Users
} from 'lucide-react';
import { Client, User as UserType, ServiceRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { saveClient, deleteClient, restoreClient } from '../services/storageService'; 
import { toast } from 'sonner';

interface ClientListProps {
  clients: Client[];
  services: ServiceRecord[];
  currentUser: UserType;
  onRefresh: () => void;
}

// --- MÁSCARAS ---
const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, "");
    return v.replace(/^(\d\d)(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
};

const formatCnpjCpf = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
        return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 18);
    }
};

export const ClientList: React.FC<ClientListProps> = ({ clients, services, currentUser, onRefresh }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTrash, setShowTrash] = useState(false);

  // Estado do formulário
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '', email: '', phone: '', category: 'Avulso', address: '', contactPerson: '', cnpj: ''
  });

  // Estado para a lista de solicitantes no cadastro
  const [requestersList, setRequestersList] = useState<string[]>([]);
  const [tempRequester, setTempRequester] = useState('');

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const isDeleted = !!c.deletedAt;
      if (showTrash && !isDeleted) return false;
      if (!showTrash && isDeleted) return false;

      return (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj?.includes(searchTerm)
      );
    });
  }, [clients, searchTerm, showTrash]);

  const handleInputChange = (field: keyof Client, value: string) => {
      let formattedValue = value;
      if (field === 'phone') formattedValue = formatPhone(value);
      else if (field === 'cnpj') formattedValue = formatCnpjCpf(value);
      setNewClient({ ...newClient, [field]: formattedValue });
  };

  // Funções para gerir solicitantes no modal
  const addRequesterToForm = (e?: React.MouseEvent) => {
      e?.preventDefault(); // Previne submit do form
      if (tempRequester.trim()) {
          setRequestersList([...requestersList, tempRequester.trim()]);
          setTempRequester('');
      }
  };

  const removeRequesterFromForm = (index: number) => {
      setRequestersList(requestersList.filter((_, i) => i !== index));
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    // Se houver texto no input de solicitante que não foi adicionado, adiciona agora
    let finalRequesters = [...requestersList];
    if (tempRequester.trim()) {
        finalRequesters.push(tempRequester.trim());
    }

    // Se a lista estiver vazia, usa o responsável como padrão
    if (finalRequesters.length === 0 && newClient.contactPerson) {
        finalRequesters.push(newClient.contactPerson);
    }

    const clientToSave: Client = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      name: newClient.name!,
      email: newClient.email || '',
      phone: newClient.phone || '',
      category: newClient.category || 'Avulso',
      address: newClient.address || '',
      contactPerson: newClient.contactPerson || '',
      requesters: finalRequesters, // Salva a lista criada
      cnpj: newClient.cnpj || '',
      createdAt: new Date().toISOString()
    };

    await saveClient(clientToSave);
    toast.success('Cliente cadastrado com sucesso!');
    
    // Resetar form
    setShowModal(false);
    setNewClient({ name: '', email: '', phone: '', category: 'Avulso', address: '', contactPerson: '', cnpj: '' });
    setRequestersList([]);
    setTempRequester('');
    
    onRefresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Tem certeza que deseja mover este cliente para a lixeira?")) {
          await deleteClient(id);
          toast.success("Cliente movido para lixeira");
          onRefresh();
      }
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Deseja restaurar este cliente?")) {
          await restoreClient(id); 
          toast.success("Cliente restaurado");
          onRefresh();
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header e Controles */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {showTrash ? <Trash2 className="text-red-500" /> : null}
                {showTrash ? 'Lixeira de Clientes' : 'Meus Clientes'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
                {showTrash ? 'Gerencie clientes excluídos' : 'Gerencie sua carteira de clientes'}
            </p>
            </div>
            
            <div className="flex gap-2">
                {currentUser.role === 'ADMIN' && (
                    <button 
                        onClick={() => setShowTrash(!showTrash)}
                        className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border ${
                            showTrash 
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                        title={showTrash ? "Voltar para ativos" : "Ver lixeira"}
                    >
                        {showTrash ? <ChevronRight size={20} /> : <Trash2 size={20} />}
                        <span className="hidden sm:inline">{showTrash ? 'Voltar' : 'Lixeira'}</span>
                    </button>
                )}

                {!showTrash && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Novo Cliente</span>
                    </button>
                )}
            </div>
        </div>

        <div className="flex gap-2">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 relative">
                <Search className="absolute left-5 top-3.5 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome, empresa ou responsável..." 
                    className="w-full pl-10 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title="Visualização em Grade"
                >
                    <LayoutGrid size={20} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title="Visualização em Lista"
                >
                    <List size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* Conteúdo: Lista ou Grid */}
      {filteredClients.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                    {showTrash ? <Trash2 size={32} /> : <User size={32} />}
                </div>
                <p>{showTrash ? 'A lixeira está vazia.' : 'Nenhum cliente encontrado.'}</p>
            </div>
      ) : (
        <>
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map(client => (
                        <div 
                            key={client.id} 
                            onClick={() => !showTrash && navigate(`/clients/${client.id}`)}
                            className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all group relative overflow-hidden ${!showTrash ? 'hover:shadow-md cursor-pointer' : 'opacity-80'}`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full ${showTrash ? 'bg-red-500' : 'bg-blue-500 opacity-0 group-hover:opacity-100'} transition-opacity`}></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Briefcase size={20} />
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                                        {client.category}
                                    </span>
                                    {showTrash && currentUser.role === 'ADMIN' && (
                                        <button 
                                            onClick={(e) => handleRestore(e, client.id)}
                                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                            title="Restaurar"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                    {!showTrash && currentUser.role === 'ADMIN' && (
                                        <button 
                                            onClick={(e) => handleDelete(e, client.id)}
                                            className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1 truncate pr-4">{client.name}</h3>
                            
                            <div className="space-y-2 mt-4">
                                {client.contactPerson && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <User size={14} />
                                    {client.contactPerson}
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <Phone size={14} />
                                    {client.phone}
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                                    <MapPin size={14} className="shrink-0" />
                                    <span className="truncate">{client.address}</span>
                                    </div>
                                )}
                            </div>

                            {!showTrash && (
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">Ver detalhes</span>
                                    <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'list' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Responsável</th>
                                <th className="p-4 font-bold">Contato</th>
                                <th className="p-4 font-bold">Categoria</th>
                                <th className="p-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredClients.map(client => (
                                <tr 
                                    key={client.id} 
                                    onClick={() => !showTrash && navigate(`/clients/${client.id}`)}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!showTrash ? 'cursor-pointer' : ''}`}
                                >
                                    <td className="p-4 font-medium text-slate-800 dark:text-white">
                                        {client.name}
                                        {client.cnpj && <div className="text-xs text-slate-400 font-normal">{client.cnpj}</div>}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">
                                        {client.contactPerson || '-'}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">
                                        {client.phone || '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                                            {client.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            {showTrash ? (
                                                <button 
                                                    onClick={(e) => handleRestore(e, client.id)}
                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                    title="Restaurar"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => navigate(`/clients/${client.id}`)}
                                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                    {currentUser.role === 'ADMIN' && (
                                                        <button 
                                                            onClick={(e) => handleDelete(e, client.id)}
                                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-6 relative animate-slide-up my-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="text-blue-600" />
              Novo Cliente
            </h2>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa / Cliente</label>
                <input 
                  required 
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={newClient.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Logística LTDA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
                  <input 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.contactPerson}
                    onChange={e => handleInputChange('contactPerson', e.target.value)}
                    placeholder="Nome do contato principal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>

              {/* --- CAMPO NOVO: SOLICITANTES AUTORIZADOS --- */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <Users size={12} /> Solicitantes Autorizados (Opcional)
                  </label>
                  <div className="flex gap-2 mb-2">
                      <input 
                          className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                          placeholder="Adicionar nome..."
                          value={tempRequester}
                          onChange={e => setTempRequester(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addRequesterToForm(e as any)}
                      />
                      <button 
                          type="button" 
                          onClick={(e) => addRequesterToForm(e)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      >
                          <Plus size={20} />
                      </button>
                  </div>
                  {/* Lista de Solicitantes */}
                  <div className="flex flex-wrap gap-2">
                      {newClient.contactPerson && (
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-200 dark:border-blue-800">
                              {newClient.contactPerson} (Resp.)
                          </span>
                      )}
                      {requestersList.map((req, index) => (
                          <span key={index} className="bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-500 flex items-center gap-1">
                              {req}
                              <button type="button" onClick={() => removeRequesterFromForm(index)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                          </span>
                      ))}
                  </div>
              </div>
              {/* ------------------------------------------- */}

              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">CPF ou CNPJ</label>
                  <input 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.cnpj}
                    onChange={e => handleInputChange('cnpj', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={18}
                  />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
                <input 
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={newClient.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.category}
                    onChange={e => handleInputChange('category', e.target.value)}
                  >
                    <option value="Avulso">Avulso</option>
                    <option value="Mensalista">Mensalista</option>
                    <option value="Parceiro">Parceiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input 
                    type="email"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg mt-2 transition-colors">
                Salvar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
