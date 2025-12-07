import React, { useState } from 'react';
import { Search, Filter, ClipboardList, Trash2, AlertTriangle, X } from 'lucide-react';
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

    const filteredClients = clients.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.phone.includes(searchTerm);

        const matchesCategory = filterCategory === 'Todos' || (client.category || 'Outros') === filterCategory;

        return matchesSearch && matchesCategory;
    });

    const getServiceCount = (clientId: string) => {
        return services.filter(s => s.clientId === clientId).length;
    };

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
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    {isAdding ? 'Cancelar' : 'Adicionar Cliente'}
                </button>
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
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Email *</label>
                            <input required placeholder="contato@empresa.com" type="email" className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.length > 0 ? (
                    filteredClients.map(client => {
                        const count = getServiceCount(client.id);
                        return (
                            <div
                                key={client.id}
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative"
                            >
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-600">
                                        {client.category || 'Sem Categoria'}
                                    </span>
                                    
                                    {/* Ícone de Exclusão (Lixeira) */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation(); // Impede a navegação
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
                                    <p className="truncate">{client.email}</p>
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
                        )
                    })
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        {clients.length === 0
                            ? "Você ainda não possui clientes. Adicione o primeiro acima!"
                            : "Nenhum cliente encontrado para a busca selecionada."}
                    </div>
                )}
            </div>
        </div>
    );
}
