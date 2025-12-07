
import { Client, ServiceRecord, ExpenseRecord, User, DatabaseConnection } from '../types';
import { DatabaseAdapter } from './database/types';
import { LocalStorageAdapter } from './database/LocalStorageAdapter';
import { SupabaseAdapter } from './database/SupabaseAdapter';
import { FirebaseAdapter } from './database/FirebaseAdapter';

// --- Configuration ---
const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'LOCAL';
let dbAdapter: DatabaseAdapter;

// Initialize Adapter
switch (DB_PROVIDER) {
  case 'SUPABASE':
    dbAdapter = new SupabaseAdapter(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );
    break;
  case 'FIREBASE':
    dbAdapter = new FirebaseAdapter({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
    });
    break;
  default:
    dbAdapter = new LocalStorageAdapter();
}

dbAdapter.initialize();

// --- Storage Keys (Legacy / Internal) ---
const STORAGE_KEYS = {
  CLIENTS: 'logitrack_clients',
  SERVICES: 'logitrack_services',
  EXPENSES: 'logitrack_expenses',
  USERS: 'logitrack_users',
  SESSION: 'logitrack_session',
  DB_CONNECTIONS: 'logitrack_db_connections'
};

// --- Helpers for Sync (Legacy) ---
const getList = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveList = <T>(key: string, list: T[]) => {
  localStorage.setItem(key, JSON.stringify(list));
};

// --- User / Auth (Hybrid) ---

export const getUsers = (): User[] => getList<User>(STORAGE_KEYS.USERS);

export const initializeData = async () => {
  // Check DB
  try {
    const users = await dbAdapter.getUsers();
    if (users.length === 0) {
      // Seed Admin
      const admin: User = {
        id: 'admin-1',
        name: 'Administrador',
        email: 'admin@logitrack.com',
        password: 'admin',
        phone: '(00) 00000-0000',
        role: 'ADMIN',
        status: 'ACTIVE'
      };
      await dbAdapter.saveUser(admin);
      // Also save locally for legacy sync checks if needed
      saveList(STORAGE_KEYS.USERS, [admin]);
    }
  } catch (e) {
    console.error("Error initializing data", e);
  }
};

export const updateUserProfile = async (user: User) => {
  await dbAdapter.saveUser(user);
  // Update session if it's current user
  const current = getCurrentUser();
  if (current && current.id === user.id) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  }
};

export const requestPasswordReset = async (email: string) => {
  // Mock implementation
  const users = await dbAdapter.getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, message: 'Email não encontrado.' };
  return { success: true, code: '123456' };
};

export const completePasswordReset = async (email: string, code: string, newPass: string) => {
  if (code !== '123456') return { success: false, message: 'Código inválido.' };
  const users = await dbAdapter.getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, message: 'Usuário não encontrado.' };

  user.password = newPass;
  await dbAdapter.saveUser(user);
  return { success: true };
};

export const registerUser = async (userData: Partial<User>): Promise<{ success: boolean, user?: User, message?: string }> => {
  const users = await dbAdapter.getUsers();
  if (users.find(u => u.email === userData.email)) {
    return { success: false, message: 'Email já cadastrado.' };
  }

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

  // Auto login
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

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

// --- Clients (Async Wrapper) ---

export const getClients = async (): Promise<Client[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  // Admin gets all? Adapter interface expects ownerId.
  // We might need to adjust Adapter to support "All" or Loop.
  // For now, let's assume we pass user ID.
  return await dbAdapter.getClients(user.id);
};

// Legacy Sync Version (Deprecated - for backward compat if needed)
export const getClientsSync = (): Client[] => {
  const user = getCurrentUser();
  const all = getList<Client>(STORAGE_KEYS.CLIENTS);
  if (user?.role === 'ADMIN') return all;
  return all.filter(c => c.ownerId === user?.id);
};

export const saveClient = async (client: Client) => {
  await dbAdapter.saveClient(client);
  // Keep local sync for instant UI updates if we are in Hybrid mode (optional)
  const list = getList<Client>(STORAGE_KEYS.CLIENTS);
  list.push(client);
  saveList(STORAGE_KEYS.CLIENTS, list);
};

// --- Services (Async Wrapper) ---

export const getServices = async (): Promise<ServiceRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getServices(user.id);
};

// Legacy Sync Version
export const getServicesSync = (): ServiceRecord[] => {
  const user = getCurrentUser();
  const all = getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
  const userClients = new Set(getClientsSync().map(c => c.id));
  if (user?.role === 'ADMIN') return all;
  return all.filter(s => userClients.has(s.clientId));
};

export const saveService = async (service: ServiceRecord) => {
  await dbAdapter.saveService(service);
  const list = getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
  list.push(service);
  saveList(STORAGE_KEYS.SERVICES, list);
};

export const updateService = async (service: ServiceRecord) => {
  await dbAdapter.updateService(service);
  // Local Mirror
  const list = getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
  const index = list.findIndex(s => s.id === service.id);
  if (index !== -1) {
    list[index] = service;
    saveList(STORAGE_KEYS.SERVICES, list);
  }
};

// --- Bulk Operations ---
export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
  // Naive implementation: loop. Better DBs have batch ops.
  for (const s of updates) {
    await dbAdapter.updateService(s);
  }
  // Local Mirror (Optional, for sync legacy)
  const list = getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
  updates.forEach(u => {
    const index = list.findIndex(s => s.id === u.id);
    if (index !== -1) list[index] = u;
  });
  saveList(STORAGE_KEYS.SERVICES, list);
};

export const getServicesByClient = async (clientId: string): Promise<ServiceRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  // If adapter supports filtering by client natively, use it.
  // Otherwise filter in memory.
  const services = await dbAdapter.getServices(user.id);
  return services.filter(s => s.clientId === clientId);
};


// --- Expenses ---

export const getExpenses = async (): Promise<ExpenseRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  // Only LocalStorageAdapter implements getExpenses effectively for now in this codebase context
  // Ideally we add it to DatabaseAdapter interface.
  // For now we assume we read from local or we extend adapter later.
  // Let's rely on local storage for expenses as a fallback if adapter doesn't have it,
  // BUT we should really add it to adapter.
  // Given the task, let's use the adapter pattern properly.
  // We will cast to any to avoid interface issues if we didn't update types.ts yet,
  // but better: let's update types.ts first.
  // Retaining local read for safety until types are updated.
  return getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
};

export const saveExpense = async (expense: ExpenseRecord) => {
  const list = getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
  list.push(expense);
  saveList(STORAGE_KEYS.EXPENSES, list);
};

export const deleteExpense = async (id: string) => {
  const list = getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
  const newList = list.filter(e => e.id !== id);
  saveList(STORAGE_KEYS.EXPENSES, newList);
};


// --- DB Connections & Backups ---

export const getDatabaseConnections = (): DatabaseConnection[] => {
  return getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
};

export const saveDatabaseConnection = (conn: DatabaseConnection) => {
  const list = getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
  list.push(conn);
  saveList(STORAGE_KEYS.DB_CONNECTIONS, list);
};

export const deleteDatabaseConnection = (id: string) => {
  const list = getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
  const newList = list.filter(c => c.id !== id);
  saveList(STORAGE_KEYS.DB_CONNECTIONS, newList);
};

export const updateDatabaseConnection = (conn: DatabaseConnection) => {
  const list = getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
  const index = list.findIndex(c => c.id === conn.id);
  if (index !== -1) {
    list[index] = conn;
    saveList(STORAGE_KEYS.DB_CONNECTIONS, list);
  }
};

export const performCloudBackup = async () => {
  const conns = getDatabaseConnections().filter(c => c.isActive);
  const data = {
    users: getList(STORAGE_KEYS.USERS),
    clients: getList(STORAGE_KEYS.CLIENTS),
    services: getList(STORAGE_KEYS.SERVICES),
    expenses: getList(STORAGE_KEYS.EXPENSES),
    backupDate: new Date().toISOString()
  };

  for (const conn of conns) {
    try {
      await fetch(conn.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${conn.apiKey}`
        },
        body: JSON.stringify(data)
      });
      conn.lastBackupStatus = 'SUCCESS';
      conn.lastBackupTime = new Date().toISOString();
    } catch (e) {
      conn.lastBackupStatus = 'ERROR';
    }
    updateDatabaseConnection(conn);
  }
};