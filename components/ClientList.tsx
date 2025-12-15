import React, { useState, useMemo } from 'react';
import { Search, Filter, ClipboardList, Trash2, AlertTriangle, X, LayoutGrid, LayoutList, Trophy } from 'lucide-react';
import { Client, ServiceRecord, User } from '../types';
import { saveClient, deleteClient } from '../services/storageService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ClientListProps {
    clients: Client[];
    services: ServiceRecord[];
    currentUser: User;
    onRefresh: () => void;
}

export function ClientList({ clients, services, currentUser, onRefresh }: ClientListProps) {
    const navigate = useNavigate();
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todos');
    
    // Novo estado para controlar o modo de visualização (Grade ou Lista)
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

    // Estado para controle do Modal de Exclusão
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estados do Formulário
    const [newClientName, setNewClientName] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientCategory, setNewClientCategory] = useState('Varejo');
    const [newClientAddress, setNewClientAddress] = useState('');
    const [newClientContact, setNewClientContact] = useState('');
    const [newClientCnpj, setNewClientCnpj] = useState('');

    const categories = ['Varejo', 'Serviços', 'Logística', 'Saúde', 'Tecnologia', 'Construção', 'Educação', 'Automotivo', 'Eventos', 'Outros'];

    // Função auxiliar para contar serviços (agora usamos ela também na ordenação)
    const getServiceCount = (clientId: string) => {
        return services.filter(s => s.clientId === clientId).length;
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        const client: Client = {
            id: crypto.randomUUID(),
            ownerId: currentUser.id,
            name: newClientName,
            email: newClientEmail,
            phone: newClientPhone,
            category: newClientCategory,
            address: newClientAddress,
            contactPerson: newClientContact,
            cnpj: newClientCnpj,
            createdAt: new Date().toISOString()
        };
        await saveClient(client);
        setIsAdding(false);
        toast.success('Cliente cadastrado com sucesso!');
        onRefresh();

        // Reset form
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPhone('');
        setNewClientCategory('Varejo');
        setNewClientAddress('');
        setNewClientContact('');
        setNewClientCnpj('');
    };

    // Função para confirmar e executar a exclusão
    const confirmDelete = async () => {
        if (!clientToDelete) return;
        setIsDeleting(true);
        try {
            await deleteClient(clientToDelete.id);
            toast.success('Cliente removido com sucesso.');
            onRefresh(); // Atualiza a lista
        } catch (error) {
            toast.error('Erro ao remover cliente.');
            console.error(error);
        } finally {
            setIsDeleting(false);
            setClientToDelete(null); // Fecha o modal
        }
    };

    // LÓGICA DE FILTRO E ORDENAÇÃO ATUALIZADA
    const filteredAndSortedClients = useMemo(() => {
        // 1. Filtrar
        const filtered = clients.filter(client => {
            const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phone.includes(searchTerm);

            const matchesCategory = filterCategory === 'Todos' || (client.category || 'Outros') === filterCategory;

            return matchesSearch && matchesCategory;
        });

        // 2. Ordenar (Quem tem mais serviços fica em cima)
        return filtered.sort((a, b) => {
            const countA = getServiceCount(a.id);
            const countB = getServiceCount(b.id);

            // Ordem decrescente de serviços (Maior para o menor)
            if (countB !== countA) {
                return countB - countA;
            }
            // Desempate por nome alfabético
            return a.name.localeCompare(b.name);
        });
    }, [clients, searchTerm, filterCategory, services]);

    return (
        <div className="space-y-6 animate-fade-in relative">
            
            {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
            {clientToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Excluir Cliente?</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Tem certeza que deseja remover <strong>{clientToDelete.name}</strong>? 
                                <br/>Isso também pode afetar o histórico de serviços associados.
                            </p>
                            
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={() => setClientToDelete(null)}
                                    className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Clientes</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Botões de Alternância de Visualização */}
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button 
                            onClick={() => setViewMode('GRID')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Visualização em Lista"
                        >
                            <LayoutList size={20} />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex-1 md:flex-none"
                    >
                        {isAdding ? 'Cancelar' : 'Adicionar Cliente'}
                    </button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou telefone..."
                        className="w-full pl-10 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative min-w-[200px]">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Filter size={18} />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full pl-10 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="Todos">Todas Categorias</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isAdding && (
                <form onSubmit={handleAddClient} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 animate-slide-down">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Novo Cliente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nome da Empresa *</label>
                            <input required placeholder="Ex: Minha Loja Ltda" className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Categoria</label>
                            <select
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newClientCategory}
                                onChange={e => setNewClientCategory(e.target.value)}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Email</label>
                            <input 
                                placeholder="contato@empresa.com" 
                                type="email" 
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                                value={newClientEmail} 
                                onChange={e => setNewClientEmail(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Telefone *</label>
                            <input required placeholder="(11) 99999-9999" className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">CNPJ</label>
                            <input placeholder="00.000.000/0001-00" className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientCnpj} onChange={e => setNewClientCnpj(e.target.value)} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Responsável / Contato</label>
                            <input placeholder="Nome da pessoa de contato" className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientContact} onChange={e => setNewClientContact(e.target.value)} />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Endereço Completo</label>
                            <input placeholder="Rua, Número, Bairro, Cidade - UF" className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors">Salvar Cliente</button>
                    </div>
                </form>
            )}

            {filteredAndSortedClients.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                    {clients.length === 0
                        ? "Você ainda não possui clientes. Adicione o primeiro acima!"
                        : "Nenhum cliente encontrado para a busca selecionada."}
                </div>
            ) : (
                <div className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                    {filteredAndSortedClients.map((client, index) => {
                        const count = getServiceCount(client.id);
                        
                        // Destaque visual para o TOP 3 (apenas no modo GRID)
                        const isTopRank = index < 3 && count > 0;
                        const rankColor = index === 0 ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' : 
                                          index === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-700 border-slate-300' :
                                          'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200';

                        if (viewMode === 'LIST') {
                            // --- MODO LISTA ---
                            return (
                                <div
                                    key={client.id}
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex justify-between items-center group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isTopRank ? rankColor : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            {isTopRank ? <Trophy size={14} /> : index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-blue-600">{client.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{client.category}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{client.phone}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{client.contactPerson || '-'}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <ClipboardList size={16} className="text-blue-500" />
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{count}</span>
                                        </div>

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setClientToDelete(client);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        } else {
                            // --- MODO GRADE (Cartões Atuais) ---
                            return (
                                <div
                                    key={client.id}
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                    className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative"
                                >
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        {isTopRank && (
                                            <div className={`p-1 rounded-full border ${rankColor}`} title="Top Cliente">
                                                <Trophy size={12} />
                                            </div>
                                        )}
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-600">
                                            {client.category || 'Sem Categoria'}
                                        </span>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setClientToDelete(client);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                            title="Excluir Cliente"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 mb-1 pr-24 truncate">{client.name}</h3>
                                    {client.contactPerson && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">Contato: {client.contactPerson}</p>}

                                    <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                                        <p className="truncate">{client.email || 'Sem email'}</p>
                                        <p>{client.phone}</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-md text-xs font-bold">
                                            <ClipboardList size={14} className="text-blue-500" />
                                            {count} {count === 1 ? 'Serviço' : 'Serviços'}
                                        </div>
                                        <span className="font-medium text-blue-500 group-hover:underline text-xs">Ver Detalhes &rarr;</span>
                                    </div>
                                </div>
                            );
                        }
                    })}
                </div>
            )}
        </div>
    );
}
