import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User } from '../../types';

const STORAGE_KEYS = {
    CLIENTS: 'logitrack_clients',
    SERVICES: 'logitrack_services',
    EXPENSES: 'logitrack_expenses',
    USERS: 'logitrack_users',
    SESSION: 'logitrack_session'
};

export class LocalStorageAdapter implements DatabaseAdapter {
    async initialize() {
        console.log('LocalStorage initialized');
    }

    private getList<T>(key: string): T[] {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    private saveList<T>(key: string, list: T[]) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    // --- Users ---
    async getUsers(): Promise<User[]> {
        return this.getList<User>(STORAGE_KEYS.USERS);
    }
    async saveUser(user: User): Promise<void> {
        const list = await this.getUsers();
        list.push(user);
        this.saveList(STORAGE_KEYS.USERS, list);
    }
    async updateUser(user: User): Promise<void> {
        const list = await this.getUsers();
        const idx = list.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            list[idx] = user;
            this.saveList(STORAGE_KEYS.USERS, list);
        }
    }
    async deleteUser(id: string): Promise<void> {
        const list = await this.getUsers();
        const newList = list.filter(u => u.id !== id);
        this.saveList(STORAGE_KEYS.USERS, newList);
    }

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const all = this.getList<Client>(STORAGE_KEYS.CLIENTS);
        return all.filter(c => c.ownerId === ownerId);
    }
    async saveClient(client: Client): Promise<void> {
        const list = this.getList<Client>(STORAGE_KEYS.CLIENTS);
        list.push(client);
        this.saveList(STORAGE_KEYS.CLIENTS, list);
    }
    async deleteClient(id: string): Promise<void> {
        const list = this.getList<Client>(STORAGE_KEYS.CLIENTS);
        const newList = list.filter(c => c.id !== id);
        this.saveList(STORAGE_KEYS.CLIENTS, newList);
    }

    // --- Services ---
    async getServices(ownerId: string): Promise<ServiceRecord[]> {
        const all = this.getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
        return all.filter(s => s.ownerId === ownerId);
    }
    async saveService(service: ServiceRecord): Promise<void> {
        const list = this.getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
        list.push(service);
        this.saveList(STORAGE_KEYS.SERVICES, list);
    }
    async updateService(service: ServiceRecord): Promise<void> {
        const list = this.getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
        const idx = list.findIndex(s => s.id === service.id);
        if (idx !== -1) {
            list[idx] = service;
            this.saveList(STORAGE_KEYS.SERVICES, list);
        }
    }
    async deleteService(id: string): Promise<void> {
        const list = this.getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
        const newList = list.filter(s => s.id !== id);
        this.saveList(STORAGE_KEYS.SERVICES, newList);
    }

    // --- Expenses (IMPLEMENTADO) ---
    async getExpenses(ownerId: string): Promise<ExpenseRecord[]> {
        const all = this.getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
        return all.filter(e => e.ownerId === ownerId); // Agora filtra por dono também
    }
    async saveExpense(expense: ExpenseRecord): Promise<void> {
        const list = this.getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
        list.push(expense);
        this.saveList(STORAGE_KEYS.EXPENSES, list);
    }
    async deleteExpense(id: string): Promise<void> {
        const list = this.getList<ExpenseRecord>(STORAGE_KEYS.EXPENSES);
        const newList = list.filter(e => e.id !== id);
        this.saveList(STORAGE_KEYS.EXPENSES, newList);
    }
}
