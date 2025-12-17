import { Client, ServiceRecord, ExpenseRecord, User, DatabaseConnection, ServiceLog } from '../types';
import { DatabaseAdapter } from './database/types';
import { LocalStorageAdapter } from './database/LocalStorageAdapter';
import { SupabaseAdapter } from './database/SupabaseAdapter';
import { FirebaseAdapter } from './database/FirebaseAdapter';

// --- Configuration ---
const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'LOCAL';
let dbAdapter: DatabaseAdapter;

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

const STORAGE_KEYS = {
  CLIENTS: 'logitrack_clients',
  SERVICES: 'logitrack_services',
  EXPENSES: 'logitrack_expenses',
  USERS: 'logitrack_users',
  SESSION: 'logitrack_session',
  DB_CONNECTIONS: 'logitrack_db_connections'
};

const getList = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveList = <T>(key: string, list: T[]) => {
  localStorage.setItem(key, JSON.stringify(list));
};

// --- User / Auth ---

export const getUsers = async (): Promise<User[]> => {
  return await dbAdapter.getUsers();
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
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
  } catch (e) { console.error(e); }
};

export const updateUserProfile = async (user: User) => {
  await dbAdapter.updateUser(user);
  const current = getCurrentUser();
  if (current && current.id === user.id) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  }
};

export const requestPasswordReset = async (email: string) => { return { success: true, code: '123456' }; };
export const completePasswordReset = async (email: string, code: string, newPass: string) => { return { success: true }; };

export const registerUser = async (userData: Partial<User>): Promise<{ success: boolean, user?: User, message?: string }> => {
  const users = await dbAdapter.getUsers();
  if (users.find(u => u.email === userData.email)) return { success: false, message: 'Email já cadastrado.' };
  const newUser: User = { id: crypto.randomUUID(), name: userData.name || '', email: userData.email || '', password: userData.password || '', phone: userData.phone || '', role: 'USER', status: 'ACTIVE' };
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

// --- Clients ---

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

// --- Services (LOGIC UPGRADED FOR LOGS) ---

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
    // Passamos o usuário para o adaptador registrar o log
    await dbAdapter.saveService(service, user);
  }
};

export const updateService = async (service: ServiceRecord) => {
  const user = getCurrentUser();
  if (user) {
      await dbAdapter.updateService(service, user);
  }
};

export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
  const user = getCurrentUser();
  if(user) {
      for (const s of updates) {
        await dbAdapter.updateService(s, user);
      }
  }
};

export const deleteService = async (id: string) => {
  const user = getCurrentUser();
  // Busca o serviço para marcar deletedAt
  const services = await dbAdapter.getServices(user?.id || '', undefined, undefined); 
  const service = services.find(s => s.id === id);
  if (service && user) {
      service.deletedAt = new Date().toISOString();
      await dbAdapter.updateService(service, user); // Adapter vai gerar log de EXCLUSAO
  }
};

export const restoreService = async (id: string) => {
    const user = getCurrentUser();
    // Para restaurar, precisamos buscar inclusive os deletados. 
    // O getServices padrão pode filtrar, mas o adapter direto retorna tudo se não tiver filtro.
    // Vamos simplificar assumindo que o ClientDetails tem o objeto em memória ou buscamos direto.
    // Aqui faremos um "update" cego passando deletedAt null se não tivermos o objeto.
    // Mas o ideal é ter o objeto.
    // Vamos fazer a busca manual no adapter se necessário, mas aqui vamos simular:
    const services = await dbAdapter.getServices(user?.id || ''); 
    const service = services.find(s => s.id === id);
    
    if (service && user) {
        service.deletedAt = undefined;
        await dbAdapter.updateService(service, user); // Adapter vai gerar log de RESTAURACAO
    }
};

// --- LOGS ---
export const getServiceLogs = async (serviceId: string): Promise<ServiceLog[]> => {
    if (dbAdapter.getServiceLogs) {
        return await dbAdapter.getServiceLogs(serviceId);
    }
    return [];
};

// --- Expenses ---

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

// --- DB Connections ---
export const getDatabaseConnections = (): DatabaseConnection[] => getList(STORAGE_KEYS.DB_CONNECTIONS);
export const saveDatabaseConnection = (conn: DatabaseConnection) => {
  const list = getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
  list.push(conn);
  saveList(STORAGE_KEYS.DB_CONNECTIONS, list);
};
export const updateDatabaseConnection = (conn: DatabaseConnection) => {
    const list = getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
    const index = list.findIndex(c => c.id === conn.id);
    if (index !== -1) { list[index] = conn; saveList(STORAGE_KEYS.DB_CONNECTIONS, list); }
};
export const deleteDatabaseConnection = (id: string) => {
    const list = getList<DatabaseConnection>(STORAGE_KEYS.DB_CONNECTIONS);
    saveList(STORAGE_KEYS.DB_CONNECTIONS, list.filter(c => c.id !== id));
};
export const performCloudBackup = async () => {};
