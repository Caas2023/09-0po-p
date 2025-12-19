import { User, Client, ServiceRecord, ExpenseRecord, ServiceLog } from '../types';

const USERS_KEY = 'logitrack_users';
const CLIENTS_KEY = 'logitrack_clients';
const SERVICES_KEY = 'logitrack_services';
const EXPENSES_KEY = 'logitrack_expenses';
const LOGS_KEY = 'logitrack_logs';
const SESSION_KEY = 'logitrack_session';

// --- HELPERS ---
const getSessionUser = (): User | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

const getUserName = () => {
    const user = getSessionUser();
    return user ? user.name : 'Sistema';
};

// --- AUTHENTICATION (RESTAURADA) ---

// Função de Registro
export const registerUser = async (user: User): Promise<void> => {
  const users = await getUsers();
  if (users.some(u => u.email === user.email)) {
    throw new Error("Email já cadastrado.");
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Função de Login
export const loginUser = async (email: string, password: string): Promise<User> => {
  const users = await getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    throw new Error("Email ou senha incorretos.");
  }
  
  if (user.status === 'BLOCKED') {
    throw new Error("Sua conta está bloqueada. Contate o administrador.");
  }

  // Salva na sessão
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

// Simulação de Reset de Senha (apenas placeholder para o frontend não quebrar)
export const requestPasswordReset = async (email: string): Promise<void> => {
    // Em um backend real, enviaria email. Aqui só simulamos sucesso se o email existir.
    const users = await getUsers();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error("Email não encontrado.");
};

export const completePasswordReset = async (password: string): Promise<void> => {
    // Esta função dependeria de um token em um sistema real.
    // No LocalStorage, isso é complexo de fazer seguro sem backend.
    // Deixamos como placeholder para evitar erro de build.
    return; 
};

// --- LOGGING SYSTEM ---
const createLog = (serviceId: string, action: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'RESTAURACAO', changes: any = {}) => {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    
    const newLog: ServiceLog = {
        id: crypto.randomUUID(),
        serviceId,
        userName: getUserName(),
        action,
        changes,
        createdAt: new Date().toISOString()
    };

    logs.push(newLog);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const getServiceLogs = async (serviceId: string): Promise<ServiceLog[]> => {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    // Retorna os logs deste serviço, do mais recente para o mais antigo
    return logs
        .filter((l: ServiceLog) => l.serviceId === serviceId)
        .sort((a: ServiceLog, b: ServiceLog) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// --- USERS MANAGEMENT ---
export const getUsers = async (): Promise<User[]> => {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
};

export const saveUser = async (user: User): Promise<void> => {
  const users = await getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  return getSessionUser();
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

// --- CLIENTS ---
export const getClients = async (): Promise<Client[]> => {
  return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
};

export const saveClient = async (client: Client): Promise<void> => {
  const clients = await getClients();
  const index = clients.findIndex(c => c.id === client.id);
  
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
};

export const deleteClient = async (id: string): Promise<void> => {
    const clients = await getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index >= 0) {
        // Soft delete
        clients[index].deletedAt = new Date().toISOString();
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    }
};

export const restoreClient = async (id: string): Promise<void> => {
    const clients = await getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index >= 0) {
        clients[index].deletedAt = undefined;
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    }
};

// --- SERVICES ---
export const getServices = async (startStr?: string, endStr?: string): Promise<ServiceRecord[]>
