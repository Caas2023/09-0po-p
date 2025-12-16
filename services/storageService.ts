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

export const getUsers = async (): Promise<User[]> => {
  return await dbAdapter.getUsers();
};

export const initializeData = async () => {
  try {
    const users = await dbAdapter.getUsers();
    if (users.length === 0) {
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
      saveList(STORAGE_KEYS.USERS, [admin]);
    }
  } catch (e) {
    console.error("Error initializing data", e);
  }
};

export const updateUserProfile = async (user: User) => {
  await dbAdapter.updateUser(user);
  const current = getCurrentUser();
  if (current && current.id === user.id) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  }
};

export const requestPasswordReset = async (email: string) => {
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
  await dbAdapter.updateUser(user);
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
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newUser));
  return { success: true, user: newUser };
};

export const loginUser = async (email: string, pass: string): Promise<{ success: boolean, user?: User, message?: string }> => {
  const users = await dbAdapter.getUsers();
  const user = users.find(u => u.email === email && u.password === pass);

  if (user) {
    if (user.status === 'BLOCKED') return { success: false, message: 'Conta bloqueada. Contate o administrador.' };
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

export const deleteUser = async (id: string) => {
  await dbAdapter.deleteUser(id);
};

// --- Clients (SOFT DELETE IMPLEMENTATION) ---

export const getClients = async (): Promise<Client[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  // Retorna TODOS, inclusive deletados. A filtragem acontece na UI (Front-end)
  return await dbAdapter.getClients(user.id);
};

// Função para atualizar cliente (necessária para o soft delete)
export const updateClient = async (client: Client) => {
    // Como o adaptador pode não ter um updateClient explícito, usamos o saveClient 
    // assumindo que ele faz "upsert" ou modificamos o localStorage manualmente
    await dbAdapter.saveClient(client);
    
    // Atualiza cache local
    const list = getList<Client>(STORAGE_KEYS.CLIENTS);
    const index = list.findIndex(c => c.id === client.id);
    if (index !== -1) {
        list[index] = client;
        saveList(STORAGE_KEYS.CLIENTS, list);
    }
};

export const saveClient = async (client: Client) => {
  const user = getCurrentUser();
  if (user && !client.ownerId) {
    client.ownerId = user.id;
  }
  await dbAdapter.saveClient(client);
  const list = getList<Client>(STORAGE_KEYS.CLIENTS);
  
  // Verifica se já existe para não duplicar no LocalStorage
  const index = list.findIndex(c => c.id === client.id);
  if(index !== -1) {
      list[index] = client;
  } else {
      list.push(client);
  }
  saveList(STORAGE_KEYS.CLIENTS, list);
};

// SOFT DELETE
export const deleteClient = async (id: string) => {
  const clients = await getClients();
  const client = clients.find(c => c.id === id);
  if (client) {
      client.deletedAt = new Date().toISOString();
      await updateClient(client); 
  }
};

// RESTORE
export const restoreClient = async (id: string) => {
    const clients = await getClients();
    const client = clients.find(c => c.id === id);
    if (client) {
        client.deletedAt = undefined;
        await updateClient(client);
    }
};

// --- Services (SOFT DELETE IMPLEMENTATION) ---

export const getServices = async (): Promise<ServiceRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getServices(user.id);
};

export const saveService = async (service: ServiceRecord) => {
  const user = getCurrentUser();
  if (user) {
    service.ownerId = user.id;
  }
  await dbAdapter.saveService(service);
  const list = getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
  list.push(service);
  saveList(STORAGE_KEYS.SERVICES, list);
};

export const updateService = async (service: ServiceRecord) => {
  await dbAdapter.updateService(service);
  const list = getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
  const index = list.findIndex(s => s.id === service.id);
  if (index !== -1) {
    list[index] = service;
    saveList(STORAGE_KEYS.SERVICES, list);
  }
};

// SOFT DELETE
export const deleteService = async (id: string) => {
  const services = await getServices();
  const service = services.find(s => s.id === id);
  if (service) {
      service.deletedAt = new Date().toISOString();
      await updateService(service);
  }
};

// RESTORE
export const restoreService = async (id: string) => {
    const services = await getServices();
    const service = services.find(s => s.id === id);
    if (service) {
        service.deletedAt = undefined;
        await updateService(service);
    }
};

export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
  for (const s of updates) {
    await dbAdapter.updateService(s);
  }
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
  const services = await dbAdapter.getServices(user.id);
  return services.filter(s => s.clientId === clientId);
};


// --- Expenses ---

export const getExpenses = async (): Promise<ExpenseRecord[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  return await dbAdapter.getExpenses(user.id);
};

export const saveExpense = async (expense: ExpenseRecord) => {
  const user = getCurrentUser();
  if (user) {
    expense.ownerId = user.id;
  }
  await dbAdapter.saveExpense(expense);
  const list = getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
  list.push(expense);
  saveList(STORAGE_KEYS.EXPENSES, list);
};

export const deleteExpense = async (id: string) => {
  await dbAdapter.deleteExpense(id);
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
