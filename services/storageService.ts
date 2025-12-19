import { User, Client, ServiceRecord, ExpenseRecord, ServiceLog } from '../types';

const USERS_KEY = 'logitrack_users';
const CLIENTS_KEY = 'logitrack_clients';
const SERVICES_KEY = 'logitrack_services';
const EXPENSES_KEY = 'logitrack_expenses';
const LOGS_KEY = 'logitrack_logs';
const SESSION_KEY = 'logitrack_session';

// --- HELPERS ---
const getSessionUser = () => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

const getUserName = () => {
    const user = getSessionUser();
    return user ? user.name : 'Sistema';
};

// --- AUTHENTICATION ---

export const registerUser = async (user: User) => {
  const users = await getUsers();
  if (users.some(u => u.email === user.email)) {
    throw new Error("Email já cadastrado.");
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const loginUser = async (email: string, password: string) => {
  const users = await getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    throw new Error("Email ou senha incorretos.");
  }
  
  if (user.status === 'BLOCKED') {
    throw new Error("Sua conta está bloqueada. Contate o administrador.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const requestPasswordReset = async (email: string) => {
    const users = await getUsers();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error("Email não encontrado.");
};

export const completePasswordReset = async (password: string) => {
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

export const getServiceLogs = async (serviceId: string) => {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    return logs
        .filter((l: ServiceLog) => l.serviceId === serviceId)
        .sort((a: ServiceLog, b: ServiceLog) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// --- USERS MANAGEMENT ---
export const getUsers = async () => {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
};

export const saveUser = async (user: User) => {
  const users = await getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUser = () => {
  return getSessionUser();
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

// --- CLIENTS ---
export const getClients = async () => {
  return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
};

export const saveClient = async (client: Client) => {
  const clients = await getClients();
  const index = clients.findIndex(c => c.id === client.id);
  
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
};

export const deleteClient = async (id: string) => {
    const clients = await getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index >= 0) {
        clients[index].deletedAt = new Date().toISOString();
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    }
};

export const restoreClient = async (id: string) => {
    const clients = await getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index >= 0) {
        clients[index].deletedAt = undefined;
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    }
};

// --- SERVICES ---
// AQUI ESTAVA O ERRO: Removi a tipagem explícita ": Promise<ServiceRecord[]>"
export const getServices = async (startStr?: string, endStr?: string) => {
  const allServices = JSON.parse(localStorage.getItem(SERVICES_KEY) || '[]');
  
  if (!startStr || !endStr) {
      return allServices;
  }

  return allServices.filter((s: ServiceRecord) => {
      const datePart = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      return datePart >= startStr && datePart <= endStr;
  });
};

export const getServicesByClient = async (clientId: string) => {
  const services = await getServices();
  return services.filter((s: ServiceRecord) => s.clientId === clientId);
};

export const saveService = async (service: ServiceRecord) => {
  const services = await getServices();
  services.push(service);
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  
  createLog(service.id, 'CRIACAO', { info: 'Serviço criado inicialmente' });
};

export const updateService = async (updatedService: ServiceRecord) => {
  const services = await getServices();
  const index = services.findIndex((s: ServiceRecord) => s.id === updatedService.id);
  
  if (index >= 0) {
    const oldService = services[index];
    
    const changes: any = {};
    
    if (oldService.cost !== updatedService.cost) {
        changes['Valor'] = { old: oldService.cost, new: updatedService.cost };
    }
    if (oldService.driverFee !== updatedService.driverFee) {
        changes['Motoboy'] = { old: oldService.driverFee, new: updatedService.driverFee };
    }
    if (oldService.waitingTime !== updatedService.waitingTime) {
        changes['Espera'] = { old: oldService.waitingTime || 0, new: updatedService.waitingTime || 0 };
    }
    if (oldService.extraFee !== updatedService.extraFee) {
        changes['Taxa Extra'] = { old: oldService.extraFee || 0, new: updatedService.extraFee || 0 };
    }
    if (oldService.paid !== updatedService.paid) {
        changes['Pagamento'] = { old: oldService.paid ? 'Pago' : 'Pendente', new: updatedService.paid ? 'Pago' : 'Pendente' };
    }
    if (JSON.stringify(oldService.pickupAddresses) !== JSON.stringify(updatedService.pickupAddresses)) {
        changes['Coleta'] = { old: oldService.pickupAddresses.join(', '), new: updatedService.pickupAddresses.join(', ') };
    }
    if (JSON.stringify(oldService.deliveryAddresses) !== JSON.stringify(updatedService.deliveryAddresses)) {
        changes['Entrega'] = { old: oldService.deliveryAddresses.join(', '), new: updatedService.deliveryAddresses.join(', ') };
    }

    if (Object.keys(changes).length > 0) {
        createLog(updatedService.id, 'EDICAO', changes);
    }

    services[index] = updatedService;
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  }
};

export const bulkUpdateServices = async (updates: ServiceRecord[]) => {
    const services = await getServices();
    updates.forEach(updated => {
        const index = services.findIndex((s: ServiceRecord) => s.id === updated.id);
        if (index >= 0) {
            if (services[index].paid !== updated.paid) {
                createLog(updated.id, 'EDICAO', { 'Pagamento': { old: services[index].paid, new: updated.paid } });
            }
            services[index] = updated;
        }
    });
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
};

export const deleteService = async (id: string) => {
    const services = await getServices();
    const index = services.findIndex((s: ServiceRecord) => s.id === id);
    if (index >= 0) {
        services[index].deletedAt = new Date().toISOString();
        localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
        createLog(id, 'EXCLUSAO');
    }
};

export const restoreService = async (id: string) => {
    const services = await getServices();
    const index = services.findIndex((s: ServiceRecord) => s.id === id);
    if (index >= 0) {
        services[index].deletedAt = undefined;
        localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
        createLog(id, 'RESTAURACAO');
    }
};

// --- EXPENSES ---
export const getExpenses = async (startStr?: string, endStr?: string) => {
  const allExpenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
  
  if (!startStr || !endStr) {
      return allExpenses;
  }

  return allExpenses.filter((e: ExpenseRecord) => {
      const datePart = e.date.includes('T') ? e.date.split('T')[0] : e.date;
      return datePart >= startStr && datePart <= endStr;
  });
};

export const saveExpense = async (expense: ExpenseRecord) => {
  const expenses = await getExpenses();
  expenses.push(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

export const deleteExpense = async (id: string) => {
    let expenses = await getExpenses();
    expenses = expenses.filter((e: ExpenseRecord) => e.id !== id);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};
