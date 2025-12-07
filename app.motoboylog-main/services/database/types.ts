
import { Client, ServiceRecord, ExpenseRecord, User } from '../../types';

export interface DatabaseAdapter {
    // User
    getUsers(): Promise<User[]>;
    saveUser(user: User): Promise<void>;
    updateUser(user: User): Promise<void>;

    // Clients
    getClients(ownerId: string): Promise<Client[]>;
    saveClient(client: Client): Promise<void>;

    // Services
    getServices(ownerId: string): Promise<ServiceRecord[]>;
    saveService(service: ServiceRecord): Promise<void>;
    updateService(service: ServiceRecord): Promise<void>;

    // Connections (for backups - optional in cloud)
    initialize(): Promise<void>;
}
