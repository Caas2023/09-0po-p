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
  DB_CONNECTIONS: 'logitrack_db_connections',
  LOGS: 'logitrack_logs' // Chave garantida para logs
};

const getList = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveList = <T>(key: string, list: T[]) => {
  localStorage.setItem(key, JSON.stringify(list));
};

// --- LOGGING SYSTEM (Forçado no StorageService) ---
const getUserName = () => {
    const user = getCurrentUser();
    return user ? user.name : 'Sistema';
};

const createLog = (serviceId: string, action: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'RESTAURACAO', changes: any = {}) => {
    // Busca logs existentes direto do LocalStorage para garantir
    const logs = getList<ServiceLog>(STORAGE_KEYS.LOGS);
    
    const newLog: ServiceLog = {
        id: crypto.randomUUID(),
        serviceId,
        userName: getUserName(),
        action,
        changes,
        createdAt: new Date().toISOString()
    };

    logs.push(newLog);
    saveList(STORAGE_KEYS.LOGS, logs);
};

// --- User / Auth ---

export const getUsers = async (): Promise<User[]> => {
  return await dbAdapter.getUsers();
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

// --- NOVA FUNÇÃO DE SINCRONIZAÇÃO ---
export const refreshUserSession = async (): Promise<User | null> => {
  const currentSession = getCurrentUser();
  if (!currentSession) return null;

  try {
    // Busca todos os utilizadores do banco (Cloud) para encontrar a versão mais recente
    const users = await dbAdapter.getUsers();
    const freshUser = users.find(u => u.id === currentSession.id);

    if (freshUser) {
      // Atualiza o LocalStorage com os dados frescos da nuvem
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(freshUser));
      return freshUser;
    }
  } catch (error) {
    console.error("Erro ao atualizar sessão do utilizador:", error);
  }
  // Se falhar, retorna o que já temos
  return currentSession;
};
// ------------------------------------

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

// --- Services (COM LOGS DE VERDADE AGORA) ---

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
    await dbAdapter.saveService(service, user);
    // GERA LOG DE CRIAÇÃO
    createLog(service.id, 'CRIACAO', { info: 'Serviço criado inicialmente' });
  }
};

export const updateService = async (updatedService: ServiceRecord) => {
  const user = getCurrentUser();
  if (user) {
      // 1. Buscar serviço antigo para comparar
      const allServices = await dbAdapter.getServices(user.id);
      const oldService = allServices.find(s => s.id === updatedService.id);

      if (oldService) {
          const changes: any = {};
          
          // Comparação manual dos campos importantes
          if (oldService.cost !== updatedService.cost) changes['Valor'] = { old: oldService.cost, new: updatedService.cost };
          if (oldService.driverFee !== updatedService.driverFee) changes['Motoboy'] = { old: oldService.driverFee, new: updatedService.driverFee };
          if (oldService.waitingTime !== updatedService.waitingTime) changes['Espera'] = { old: oldService.waitingTime || 0, new: updatedService.waitingTime || 0 };
          if (oldService.extraFee !== updatedService.extraFee) changes['Taxa Extra'] = { old: oldService.extraFee || 0, new: updatedService.extraFee || 0 };
          if (oldService.paid !== updatedService.paid) changes['Pagamento'] = { old: oldService.paid ? 'Pago' : 'Pendente', new: updatedService.paid ? 'Pago' : 'Pendente' };
          
          if (JSON.stringify(oldService.pickupAddresses) !== JSON.stringify(updatedService.pickupAddresses)) {
              changes['Coleta'] = { old: oldService.pickupAddresses.join(', '), new: updatedService.pickupAddresses.join(', ') };
          }
          if (JSON.stringify(oldService.deliveryAddresses) !== JSON.stringify(updatedService.deliveryAddresses)) {
              changes['Entrega'] = { old: oldService.deliveryAddresses.join(', '), new: updatedService.deliveryAddresses.join(', ') };
          }

          // Se houver mudanças, cria o log
          if (Object.keys(changes).length > 0) {
              createLog(updatedService.id, 'EDICAO', changes);
          }
      }

      // 2. Salva no banco
      await dbAdapter.updateService(updatedService, user);
  }
};

export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
  const user = getCurrentUser();
  if(user) {
      // Para bulk update, vamos simplificar e logar apenas a mudança de status se aplicável
      const allServices = await dbAdapter.getServices(user.id);
      
      for (const updated of updates) {
        const oldService = allServices.find(s => s.id === updated.id);
        if (oldService && oldService.paid !== updated.paid) {
             createLog(updated.id, 'EDICAO', { 'Pagamento': { old: oldService.paid, new: updated.paid } });
        }
        await dbAdapter.updateService(updated, user);
      }
  }
};

export const deleteService = async (id: string) => {
  const user = getCurrentUser();
  const services = await dbAdapter.getServices(user?.id || '', undefined, undefined); 
  const service = services.find(s => s.id === id);
  if (service && user) {
      service.deletedAt = new Date().toISOString();
      await dbAdapter.updateService(service, user);
      // GERA LOG DE EXCLUSÃO
      createLog(id, 'EXCLUSAO');
  }
};

export const restoreService = async (id: string) => {
    const user = getCurrentUser();
    
    // Tenta buscar tudo do LocalStorage primeiro para performance ou do adapter se possível
    const allServicesData = localStorage.getItem(STORAGE_KEYS.SERVICES);
    const allServices: ServiceRecord[] = allServicesData ? JSON.parse(allServicesData) : [];
    
    const serviceIndex = allServices.findIndex(s => s.id === id);
    
    if (serviceIndex >= 0) {
        const service = allServices[serviceIndex];
        service.deletedAt = undefined;
        // Salva via adapter para manter consistência
        await dbAdapter.updateService(service, user!); 
        // GERA LOG DE RESTAURAÇÃO
        createLog(id, 'RESTAURACAO');
    }
};

// --- LOGS (Leitura) ---
export const getServiceLogs = async (serviceId: string): Promise<ServiceLog[]> => {
    // Tenta pegar do adapter primeiro (se for supabase/firebase)
    if (dbAdapter.getServiceLogs) {
        const adapterLogs = await dbAdapter.getServiceLogs(serviceId);
        if(adapterLogs.length > 0) return adapterLogs;
    }
    
    // Fallback para LocalStorage local
    const logs = getList<ServiceLog>(STORAGE_KEYS.LOGS);
    return logs
        .filter(l => l.serviceId === serviceId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
