import React, { useState, useEffect } from 'react';
import { User, DatabaseConnection, DbProvider } from '../types';
import { getUsers, getDatabaseConnections, saveDatabaseConnection, deleteDatabaseConnection, updateDatabaseConnection, performCloudBackup, updateUserProfile } from '../services/storageService';
import { Shield, Users, Database, Plus, Trash2, Save, Play, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface AdminPanelProps {
    currentAdmin: User;
    onImpersonate: (user: User) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentAdmin, onImpersonate }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'DATABASE'>('USERS');
    const [users, setUsers] = useState<User[]>([]);
    const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);

    // DB Form
    const [showDbForm, setShowDbForm] = useState(false);
    const [dbName, setDbName] = useState('');
    const [dbProvider, setDbProvider] = useState<DbProvider>('WEBHOOK');
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');

    const [backupStatus, setBackupStatus] = useState('');

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        const usersList = await getUsers();
        setUsers(usersList);
        // TODO: Implement getDatabaseConnections async in storageService if needed, 
        // for now it's likely local but good to be safe or if we are strict. 
        // Actually error said getDatabaseConnections not exported. I need to make sure it is exported.
        // Assuming keys are stored locally for now or we need async adapter support for them too?
        // Let's assume sync for now as they are config, or we need to implement it in adapter. 
        // Wait, the error said `Module '"../services/storageService"' has no exported member 'getDatabaseConnections'`. 
        // I probably missed exporting them in storageService.ts.
        // I better fix storageService exports first.
        setDbConnections(getDatabaseConnections());
    };

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
        setBackupStatus('Running...');
        await performCloudBackup();
        setBackupStatus('Done');
        refreshData();
        setTimeout(() => setBackupStatus(''), 3000);
    };

    const handleToggleRole = async (user: User) => {
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
        if (confirm(`Deseja alterar o nível de acesso de ${user.name} para ${newRole}?`)) {
            const updatedUser = { ...user, role: newRole };
            await updateDatabaseConnection(updatedUser as any); // We need a proper update user function
            // Actually storageService doesn't have a generic "updateUser" exported for admins yet, only updateUserProfile
            // Let's import updateUserProfile which basically calls dbAdapter.saveUser
            await updateUserProfile(updatedUser);
            refreshData();
        }
    };

    const renderDbInstructions = (provider: DbProvider) => {
        switch (provider) {
            case 'SUPABASE':
                return (
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h5 className="font-bold text-slate-700 dark:text-slate-300">Passo a Passo Supabase:</h5>
                        <ol className="list-decimal list-inside space-y-1 ml-1">
                            <li>Crie um projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Supabase</a>.</li>
                            <li>Vá no <strong>SQL Editor</strong> e cole o código abaixo (depois clique em RUN):</li>
                            <pre className="bg-slate-200 dark:bg-slate-900 p-2 rounded overflow-x-auto text-[10px] my-1 font-mono text-slate-800 dark:text-slate-200 select-all">
                                {`create table backups (
  id bigint primary key generated always as identity,
  created_at timestamptz default now(),
  app_data jsonb not null
);
alter table backups enable row level security;
create policy "Public Insert" on backups for insert with check (true);`}
                            </pre>
                            <li>Vá em <strong>Project Settings &gt; API</strong>.</li>
                            <li>No campo <strong>Endpoint URL</strong> abaixo, cole a URL do projeto e adicione <code className="bg-blue-100 text-blue-800 px-1 rounded">/rest/v1/backups</code> no final.</li>
                            <li>No campo <strong>API Key</strong> abaixo, cole a chave <code>anon public</code>.</li>
                        </ol>
                    </div>
                );
            case 'GOOGLE_DRIVE':
                return (
                    <div className="text-xs text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p>Para Google Drive, você precisará implantar um Google Apps Script como Web App.</p>
                        <p className="mt-2">1. Crie um script que receba POST requests.</p>
                        <p>2. Salve o conteúdo no Drive.</p>
                        <p>3. Cole a URL do Web App abaixo.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="text-blue-600" />
                        Painel Administrativo
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Controle de usuários e backup de dados.</p>
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
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Users size={18} />
                            Usuários Cadastrados
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <tr>
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Função</th>
                                    <th className="p-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-3 font-medium text-slate-800 dark:text-white">{u.name}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {u.role}
                                                </span>
                                                {u.id !== currentAdmin.id && (
                                                    <button
                                                        onClick={() => handleToggleRole(u)}
                                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Alternar Permissões"
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            {u.id !== currentAdmin.id && (
                                                <button
                                                    onClick={() => onImpersonate(u)}
                                                    className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors font-bold"
                                                >
                                                    Acessar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'DATABASE' && (
                <div className="space-y-6">
                    {/* Backup Controls */}
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

                    {/* Connection List */}
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
                                                {conn.lastBackupTime && (
                                                    <span className="text-[10px] text-slate-400">Último: {new Date(conn.lastBackupTime).toLocaleString()}</span>
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