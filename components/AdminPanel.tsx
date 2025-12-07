import React, { useState, useEffect } from 'react';
import { User, DatabaseConnection, DbProvider, UserStatus } from '../types';
import { getUsers, updateUserProfile, deleteUser, getDatabaseConnections, saveDatabaseConnection, deleteDatabaseConnection, updateDatabaseConnection, performCloudBackup } from '../services/storageService';
import { Shield, Users, Database, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Lock, Unlock, Play } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanelProps {
    currentAdmin: User;
    onImpersonate: (user: User) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentAdmin, onImpersonate }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'DATABASE'>('USERS');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Database Config State
    const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);
    const [showDbForm, setShowDbForm] = useState(false);
    const [dbName, setDbName] = useState('');
    const [dbProvider, setDbProvider] = useState<DbProvider>('WEBHOOK');
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [backupStatus, setBackupStatus] = useState('');

    // Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'DELETE' | 'BLOCK' | 'UNBLOCK' | null;
        user: User | null;
    }>({ isOpen: false, action: null, user: null });

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setIsLoading(true);
        try {
            const usersList = await getUsers();
            setUsers(usersList);
            setDbConnections(getDatabaseConnections());
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            toast.error("Erro ao carregar lista de usuários.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Ações de Usuário ---

    const openConfirmModal = (user: User, action: 'DELETE' | 'BLOCK' | 'UNBLOCK') => {
        if (user.id === currentAdmin.id) {
            toast.error("Você não pode realizar esta ação em sua própria conta.");
            return;
        }
        setConfirmModal({ isOpen: true, action, user });
    };

    const handleConfirmAction = async () => {
        const { action, user } = confirmModal;
        if (!user || !action) return;

        try {
            if (action === 'DELETE') {
                await deleteUser(user.id);
                toast.success(`Usuário ${user.name} excluído com sucesso.`);
            } else if (action === 'BLOCK') {
                const updatedUser: User = { ...user, status: 'BLOCKED' };
                await updateUserProfile(updatedUser);
                toast.success(`Acesso de ${user.name} bloqueado.`);
            } else if (action === 'UNBLOCK') {
                const updatedUser: User = { ...user, status: 'ACTIVE' };
                await updateUserProfile(updatedUser);
                toast.success(`Acesso de ${user.name} liberado.`);
            }
            
            await refreshData();
        } catch (error) {
            toast.error("Falha ao executar a ação.");
            console.error(error);
        } finally {
            setConfirmModal({ isOpen: false, action: null, user: null });
        }
    };

    // --- Ações de Banco de Dados ---

    const handleAddDb = (e: React.FormEvent) => {
        e.preventDefault();
        const newConn: DatabaseConnection = {
            id: crypto.randomUUID(),
            name: dbName,
            provider: dbProvider,
            endpointUrl: dbUrl,
            apiKey: dbKey,
            isActive: true,
            lastBackupStatus: 'NEVER'
        };
        saveDatabaseConnection(newConn);
        setShowDbForm(false);
        setDbName('');
        setDbUrl('');
        setDbKey('');
        refreshData();
    };

    const handleDeleteDb = (id: string) => {
        if (confirm('Remover conexão?')) {
            deleteDatabaseConnection(id);
            refreshData();
        }
    };

    const handleRunBackup = async () => {
        setBackupStatus('Executando...');
        await performCloudBackup();
        setBackupStatus('Concluído');
        refreshData();
        setTimeout(() => setBackupStatus(''), 3000);
    };

    const renderDbInstructions = (provider: DbProvider) => {
        switch (provider) {
            case 'SUPABASE':
                return (
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h5 className="font-bold text-slate-700 dark:text-slate-300">Passo a Passo Supabase:</h5>
                        <p>Configure a tabela 'backups' no seu projeto Supabase conforme a documentação técnica.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            
            {/* MODAL DE DUPLA CONFIRMAÇÃO */}
            {confirmModal.isOpen && confirmModal.user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up">
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                confirmModal.action === 'DELETE' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                {confirmModal.action === 'DELETE' && 'Excluir Usuário?'}
                                {confirmModal.action === 'BLOCK' && 'Bloquear Acesso?'}
                                {confirmModal.action === 'UNBLOCK' && 'Desbloquear Acesso?'}
                            </h3>
                            
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Você está prestes a realizar uma ação em <strong>{confirmModal.user.name}</strong>.
                                <br/>
                                {confirmModal.action === 'DELETE' && 'Isso removerá permanentemente o usuário e seus dados.'}
                                {confirmModal.action === 'BLOCK' && 'O usuário não conseguirá mais fazer login.'}
                            </p>
                            
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={() => setConfirmModal({ isOpen: false, action: null, user: null })}
                                    className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmAction}
                                    className={`px-5 py-2.5 rounded-lg text-white font-bold shadow-sm flex items-center gap-2 transition-colors ${
                                        confirmModal.action === 'DELETE' ? 'bg-red-600 hover:bg-red-700' : 
                                        confirmModal.action === 'BLOCK' ? 'bg-amber-600 hover:bg-amber-700' : 
                                        'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="text-blue-600" />
                        Painel Administrativo
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Controle de usuários e segurança do sistema.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'USERS' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                        Usuários
                    </button>
                    <button
                        onClick={() => setActiveTab('DATABASE')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'DATABASE' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                        Backup & Banco de Dados
                    </button>
                </div>
            </div>

            {activeTab === 'USERS' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Users size={18} />
                            Usuários Cadastrados ({users.length})
                        </h3>
                        <button onClick={refreshData} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Atualizar Lista
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <tr>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Função</th>
                                    <th className="p-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td>
                                    </tr>
                                ) : (
                                    users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-3">
                                                {u.status === 'BLOCKED' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <Lock size={10} /> Bloqueado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <CheckCircle size={10} /> Ativo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                                {u.name}
                                                {u.id === currentAdmin.id && <span className="text-[10px] text-slate-400">(Você)</span>}
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {u.id !== currentAdmin.id && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => onImpersonate(u)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                                                            title="Acessar como este usuário"
                                                        >
                                                            <Users size={16} />
                                                        </button>
                                                        
                                                        {/* Botão Bloquear/Desbloquear */}
                                                        {u.status === 'BLOCKED' ? (
                                                            <button
                                                                onClick={() => openConfirmModal(u, 'UNBLOCK')}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                                                title="Desbloquear"
                                                            >
                                                                <Unlock size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => openConfirmModal(u, 'BLOCK')}
                                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md"
                                                                title="Bloquear/Suspender"
                                                            >
                                                                <Lock size={16} />
                                                            </button>
                                                        )}

                                                        {/* Botão Excluir */}
                                                        <button
                                                            onClick={() => openConfirmModal(u, 'DELETE')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                                            title="Excluir Conta"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB DATABASE (Mantida igual a anterior, apenas renderizada aqui) */}
            {activeTab === 'DATABASE' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <RefreshCw size={20} className={backupStatus ? "animate-spin text-blue-500" : "text-slate-400"} />
                                Sincronização de Backup
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Envie os dados locais para os serviços conectados.
                            </p>
                        </div>
                        <button
                            onClick={handleRunBackup}
                            disabled={!!backupStatus || dbConnections.length === 0}
                            className="bg-blue-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <Play size={18} fill="currentColor" />
                            {backupStatus || 'Executar Backup Agora'}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Database size={18} />
                                Conexões de Backup
                            </h3>
                            <button
                                onClick={() => setShowDbForm(!showDbForm)}
                                className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                                <Plus size={14} /> Nova Conexão
                            </button>
                        </div>

                        {showDbForm && (
                            <form onSubmit={handleAddDb} className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 animate-slide-down">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nome da Conexão</label>
                                        <input required value={dbName} onChange={e => setDbName(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Ex: Backup Supabase" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Provedor</label>
                                        <select value={dbProvider} onChange={e => setDbProvider(e.target.value as DbProvider)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                            <option value="WEBHOOK">Webhook (Genérico)</option>
                                            <option value="SUPABASE">Supabase</option>
                                            <option value="GOOGLE_DRIVE">Google Drive (Apps Script)</option>
                                            <option value="MONGODB">MongoDB Data API</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Endpoint URL</label>
                                        <input required value={dbUrl} onChange={e => setDbUrl(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="https://..." />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">API Key / Token (Opcional)</label>
                                        <input value={dbKey} onChange={e => setDbKey(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" type="password" placeholder="Bearer token ou API Key" />
                                    </div>
                                </div>

                                {renderDbInstructions(dbProvider)}

                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setShowDbForm(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                                    <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700">Salvar Conexão</button>
                                </div>
                            </form>
                        )}

                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {dbConnections.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 italic">Nenhuma conexão configurada.</div>
                            ) : (
                                dbConnections.map(conn => (
                                    <div key={conn.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-800 dark:text-white">{conn.name}</h4>
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full border border-slate-200 dark:border-slate-600">{conn.provider}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{conn.endpointUrl}</p>
                                                {conn.lastBackupStatus === 'SUCCESS' && (
                                                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-bold"><CheckCircle size={10} /> Backup OK</span>
                                                )}
                                                {conn.lastBackupStatus === 'ERROR' && (
                                                    <span className="text-xs text-red-600 flex items-center gap-1 font-bold"><XCircle size={10} /> Falha</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleDeleteDb(conn.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
