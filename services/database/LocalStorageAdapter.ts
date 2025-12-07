
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, User } from '../../types';

const STORAGE_KEYS = {
    CLIENTS: 'logitrack_clients',
    SERVICES: 'logitrack_services',
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

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const all = this.getList<Client>(STORAGE_KEYS.CLIENTS);
        // Assuming Admin check is done in service layer, but Adapter should filter by query
        // Here we simulate the DB filtering
        return all.filter(c => c.ownerId === ownerId);
    }

    async saveClient(client: Client): Promise<void> {
        const list = this.getList<Client>(STORAGE_KEYS.CLIENTS);
        list.push(client);
        this.saveList(STORAGE_KEYS.CLIENTS, list);
    }

    // --- Services ---
    async getServices(ownerId: string): Promise<ServiceRecord[]> {
        const all = this.getList<ServiceRecord>(STORAGE_KEYS.SERVICES);
        // In a real DB, we would join or filter by Owner. 
        // Here, we filter services whose client belongs to owner? 
        // Or just assume service has ownerId (which we added to type earlier).
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
}
