import { Client, ServiceRecord, ExpenseRecord, User, DatabaseConnection, ServiceLog } from '../types';
import { DatabaseAdapter } from './database/types';
import { LocalStorageAdapter } from './database/LocalStorageAdapter';
import { SupabaseAdapter } from './database/SupabaseAdapter';
import { FirebaseAdapter } from './database/FirebaseAdapter';

// --- CONFIGURAÇÃO AUTOMÁTICA DO BANCO DE DADOS ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let dbAdapter: DatabaseAdapter;

// Lógica Inteligente: Se tem chaves, usa Supabase. Se não, usa Local.
if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('✅ Modo Online: Conectado ao Supabase');
    dbAdapter = new SupabaseAdapter(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.warn('⚠️ Modo Offline: Usando LocalStorage (Dados não sincronizam)');
    dbAdapter = new LocalStorageAdapter();
}

dbAdapter.initialize();

const STORAGE_KEYS = {
  CLIENTS: 'logitrack_clients',
  SERVICES: 'logitrack_services',
  EXPENSES: 'logitrack_expenses',
  USERS: 'logitrack_users',
  SESSION: 'logitrack_session',
  DB_CONNECTIONS: 'logitrack_db_connections',
  LOGS: 'logitrack_logs'
};

// Helpers de LocalStorage (Mantidos para fallback e sessão)
const getList = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveList = <T>(key: string, list: T[]) => {
  localStorage.setItem(key, JSON.stringify(list));
};

// --- USER & AUTH ---

export const getUsers = async (): Promise<User[]> => {
  return await dbAdapter.getUsers();
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

// Mantém a sessão atualizada com o banco
export const refreshUserSession = async (): Promise<User | null> => {
  const currentSession = getCurrentUser();
  if (!currentSession) return null;
  try {
    const users = await dbAdapter.getUsers();
    const freshUser = users.find(u => u.id === currentSession.id);
    if (freshUser) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(freshUser));
      return freshUser;
    }
  } catch (error) { console.error(error); }
  return currentSession;
};

export const initializeData = async () => {
    // Função de inicialização simplificada
};

export const updateUserProfile = async (user: User) => {
  await dbAdapter.updateUser(user);
  const current = getCurrentUser();
  if (current && current.id === user.id) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  }
};

export const requestPasswordReset = async (email: string) => {
    if (dbAdapter.requestPasswordReset) return await dbAdapter.requestPasswordReset(email);
    return { success: true, code: '123456' };
};

export const completePasswordReset = async (email: string, code: string, newPass: string) => { 
    if (dbAdapter.completePasswordReset) return await dbAdapter.completePasswordReset(email, code, newPass);
    return { success: true }; 
};

export const registerUser = async (userData: Partial<User>): Promise<{ success: boolean, user?: User, message?: string }> => {
  const users = await dbAdapter.getUsers();
  if (users.find(u => u.email === userData.email)) return { success: false, message: 'Email já cadastrado.' };
  
  const newUser: User = { 
      id: crypto.randomUUID(), 
      name: userData.name || '', 
      email: userData.email || '', 
      password: userData.password || '', 
      phone: userData.phone || '', 
      role: 'USER', 
      status: 'ACTIVE' 
  };
  
  await dbAdapter.saveUser(newUser);
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newUser));
  return { success: true, user: newUser };
};

export const loginUser = async (email: string, pass: string): Promise<{ success: boolean, user?: User, message?: string }> => {
  const users = await dbAdapter.getUsers();
  const user = users.find(u => u.email === email && u.password === pass);
  
  if (user) {
    if (user.status === 'BLOCKED') return { success: false, message: 'Conta bloqueada.' };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    return { success: true, user };
  }
  return { success: false, message: 'Credenciais inválidas.' };
};

export const logoutUser = () => localStorage.removeItem(STORAGE_KEYS.SESSION);
export const deleteUser = async (id: string) => await dbAdapter.deleteUser(id);

// --- CLIENTS ---

export const getClients = async (): Promise<Client[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getClients(user.id);
};

export const saveClient = async (client: Client) => {
  const user = getCurrentUser();
  if (user && !client.ownerId) client.ownerId = user.id;
  await dbAdapter.saveClient(client);
};

export const deleteClient = async (id: string) => {
  const clients = await getClients();
  const client = clients.find(c => c.id === id);
  if (client) {
      client.deletedAt = new Date().toISOString();
      await dbAdapter.saveClient(client); 
  }
};

export const restoreClient = async (id: string) => {
    const clients = await getClients();
    const client = clients.find(c => c.id === id);
    if (client) {
        client.deletedAt = undefined;
        await dbAdapter.saveClient(client);
    }
};

// --- SERVICES (CORRIGIDO: REMOVIDA A LENTIDÃO) ---

export const getServices = async (start?: string, end?: string): Promise<ServiceRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getServices(user.id, start, end);
};

export const getServicesByClient = async (clientId: string): Promise<ServiceRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getServices(user.id, undefined, undefined, clientId);
};

export const saveService = async (service: ServiceRecord) => {
  const user = getCurrentUser();
  if (user) {
    service.ownerId = user.id;
    // O Adapter já cuida do Log de Criação internamente
    await dbAdapter.saveService(service, user);
  }
};

export const updateService = async (updatedService: ServiceRecord) => {
  const user = getCurrentUser();
  if (user) {
      // CORREÇÃO DE PERFORMANCE:
      // Removemos a busca de "todos os serviços" (allServices) que travava o navegador.
      // O SupabaseAdapter agora é responsável por buscar apenas o serviço necessário para fazer o Log (Diff).
      await dbAdapter.updateService(updatedService, user);
  }
};

export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
  const user = getCurrentUser();
  if(user) {
      // Para atualização em massa, chamamos direto o update
      for (const updated of updates) {
        await dbAdapter.updateService(updated, user);
      }
  }
};

export const deleteService = async (id: string) => {
  const user = getCurrentUser();
  // Para deletar (mover para lixeira), precisamos apenas marcar deletedAt
  // Buscamos apenas o necessário ou passamos direto se já tivermos o objeto
  if (user) {
      // O ideal seria passar o objeto service inteiro se possível, mas para garantir:
      // Se for soft delete, o updateService resolve.
      // Se for hard delete, usamos deleteService do adapter.
      // Aqui assumimos que a UI já passa o objeto atualizado ou usamos lógica de backend.
      // Vamos simplificar forçando um update via adapter se for apenas mudança de status
      
      // Nota: A função deleteService na UI geralmente chama isso.
      // Se o adapter suportar 'soft delete' direto, melhor.
      // Como seu adapter updateService lida com logs, vamos tentar buscar e atualizar.
      
      const allServices = await dbAdapter.getServices(user.id); 
      const service = allServices.find(s => s.id === id);
      
      if (service) {
          service.deletedAt = new Date().toISOString();
          await dbAdapter.updateService(service, user);
      }
  }
};

export const restoreService = async (id: string) => {
    const user = getCurrentUser();
    // Correção: Buscar do Adapter, não do localStorage
    const allServices = await dbAdapter.getServices(user?.id || ''); 
    const service = allServices.find(s => s.id === id);
    
    if (service && user) {
        service.deletedAt = undefined;
        await dbAdapter.updateService(service, user); 
    }
};

export const getServiceLogs = async (serviceId: string): Promise<ServiceLog[]> => {
    if (dbAdapter.getServiceLogs) {
        return await dbAdapter.getServiceLogs(serviceId);
    }
    return [];
};

// --- EXPENSES ---

export const getExpenses = async (start?: string, end?: string): Promise<ExpenseRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getExpenses(user.id, start, end);
};

export const saveExpense = async (expense: ExpenseRecord) => {
  const user = getCurrentUser();
  if (user) {
    expense.ownerId = user.id;
    await dbAdapter.saveExpense(expense);
  }
};

export const deleteExpense = async (id: string) => {
  await dbAdapter.deleteExpense(id);
};

// --- STUBS (Não usados no modo Nuvem) ---
export const getDatabaseConnections = (): DatabaseConnection[] => [];
export const saveDatabaseConnection = (conn: DatabaseConnection) => {};
export const updateDatabaseConnection = (conn: DatabaseConnection) => {};
export const deleteDatabaseConnection = (id: string) => {};
export const performCloudBackup = async () => {};
