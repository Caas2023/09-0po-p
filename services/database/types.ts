import { Client, ServiceRecord, ExpenseRecord, User } from '../../types';

export interface DatabaseAdapter {
    // User
    getUsers(): Promise<User[]>;
    saveUser(user: User): Promise<void>;
    updateUser(user: User): Promise<void>;
    deleteUser(id: string): Promise<void>;

    // Clients
    getClients(ownerId: string): Promise<Client[]>;
    saveClient(client: Client): Promise<void>;
    deleteClient(id: string): Promise<void>;

    // Services
    getServices(ownerId: string): Promise<ServiceRecord[]>;
    saveService(service: ServiceRecord): Promise<void>;
    updateService(service: ServiceRecord): Promise<void>;
    deleteService(id: string): Promise<void>;

    // Expenses (ADICIONADO AGORA)
    getExpenses(ownerId: string): Promise<ExpenseRecord[]>;
    saveExpense(expense: ExpenseRecord): Promise<void>;
    deleteExpense(id: string): Promise<void>;

    // Connections
    initialize(): Promise<void>;
}
