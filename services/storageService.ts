import { Client, ServiceRecord, ExpenseRecord, User, DatabaseConnection, ServiceLog } from '../types';
import { DatabaseAdapter } from './database/types';
import { LocalStorageAdapter } from './database/LocalStorageAdapter';
import { SupabaseAdapter } from './database/SupabaseAdapter';
import { FirebaseAdapter } from './database/FirebaseAdapter';

// --- CONFIGURAÇÃO AUTOMÁTICA DO BANCO DE DADOS ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let dbAdapter: DatabaseAdapter;

if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('✅ Conectado ao Supabase (Nuvem)');
    dbAdapter = new SupabaseAdapter(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.warn('⚠️ Usando LocalStorage (Offline)');
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

export const initializeData = async () => {};

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

// --- SERVICES ---

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

// --- CORREÇÃO: SALVAMENTO SEGURO ---
export const saveService = async (service: ServiceRecord) => {
  let user = getCurrentUser();
  
  // Fallback: Se não achou na sessão, usa o ownerId que a tela NewOrder mandou
  if (!user && service.ownerId) {
      console.warn("Sessão não encontrada, usando ID do componente.");
      user = { id: service.ownerId, name: 'Usuário App', email: '', role: 'USER', status: 'ACTIVE' };
  }

  if (user) {
    service.ownerId = user.id;
    // O Adapter (Supabase) agora trata o log e erros
    await dbAdapter.saveService(service, user);
  } else {
    // ERRO CRÍTICO: Não temos usuário nem na sessão nem no componente
    console.error("ERRO: Tentativa de salvar sem usuário.");
    throw new Error("Sessão expirada ou usuário inválido. Tente fazer login novamente.");
  }
};

export const updateService = async (updatedService: ServiceRecord) => {
  const user = getCurrentUser();
  if (user) {
      // OTIMIZAÇÃO: Removemos a busca pesada aqui.
      await dbAdapter.updateService(updatedService, user);
  }
};

export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
  const user = getCurrentUser();
  if(user) {
      for (const updated of updates) {
        await dbAdapter.updateService(updated, user);
      }
  }
};

export const deleteService = async (id: string) => {
  const user = getCurrentUser();
  if (user) {
      // Cria objeto leve apenas com o necessário para o update
      const serviceToDelete: any = { id: id, deletedAt: new Date().toISOString() };
      await dbAdapter.updateService(serviceToDelete, user);
  }
};

export const restoreService = async (id: string) => {
    const user = getCurrentUser();
    if (user) {
        const serviceToRestore: any = { id: id, deletedAt: null };
        await dbAdapter.updateService(serviceToRestore, user);
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
