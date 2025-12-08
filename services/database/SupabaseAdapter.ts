import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User } from '../../types';

export class SupabaseAdapter implements DatabaseAdapter {
    private supabase: SupabaseClient;

    constructor(url: string, key: string) {
        this.supabase = createClient(url, key);
    }

    async initialize() {
        console.log('Supabase initialized');
    }

    // --- Users ---
    async getUsers(): Promise<User[]> {
        const { data, error } = await this.supabase.from('users').select('*');
        if (error) {
            console.error('Supabase error:', error);
            return [];
        }
        return data as User[];
    }

    async saveUser(user: User): Promise<void> {
        const { error } = await this.supabase.from('users').insert(user);
        if (error) console.error('Supabase insert error (user):', error);
    }

    async updateUser(user: User): Promise<void> {
        const { error } = await this.supabase.from('users').update(user).eq('id', user.id);
        if (error) console.error('Supabase update error (user):', error);
    }

    async deleteUser(id: string): Promise<void> {
        const { error } = await this.supabase.from('users').delete().eq('id', id);
        if (error) {
            console.error('Supabase delete user error:', error);
            throw new Error('Falha ao excluir usuário');
        }
    }

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const { data, error } = await this.supabase.from('clients').select('*').eq('owner_id', ownerId);
        if (error) return [];

        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id,
            createdAt: d.created_at,
            contactPerson: d.contact_person
        })) as Client[];
    }

    async saveClient(client: Client): Promise<void> {
        const payload = {
            id: client.id,
            owner_id: client.ownerId,
            name: client.name,
            email: client.email,
            phone: client.phone,
            category: client.category,
            address: client.address,
            contact_person: client.contactPerson,
            cnpj: client.cnpj,
            created_at: client.createdAt
        };
        const { error } = await this.supabase.from('clients').insert(payload);
        if (error) console.error('Supabase insert error (client):', error);
    }

    async deleteClient(id: string): Promise<void> {
        const { error } = await this.supabase.from('clients').delete().eq('id', id);
        if (error) {
            console.error('Supabase delete error:', error);
            throw new Error('Falha ao excluir cliente no Supabase');
        }
    }

    // --- Services ---
    async getServices(ownerId: string): Promise<ServiceRecord[]> {
        const { data, error } = await this.supabase.from('services').select('*').eq('owner_id', ownerId);
        if (error) return [];
        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id,
            clientId: d.client_id,
            pickupAddresses: d.pickup_addresses,
            deliveryAddresses: d.delivery_addresses,
            driverFee: d.driver_fee,
            requesterName: d.requester_name,
            paymentMethod: d.payment_method,
            paid: d.paid,
            status: d.status // IMPORTANTE: Recuperar o status do banco
        })) as ServiceRecord[];
    }

    async saveService(service: ServiceRecord): Promise<void> {
        const payload = {
            id: service.id,
            owner_id: service.ownerId,
            client_id: service.clientId,
            cost: service.cost,
            status: service.status, // RESTAURADO: Envia o status (mesmo que seja sempre 'PENDING' na criação)
            date: service.date,
            pickup_addresses: service.pickupAddresses,
            delivery_addresses: service.deliveryAddresses,
            driver_fee: service.driverFee,
            requester_name: service.requesterName,
            paid: service.paid,
            payment_method: service.paymentMethod
        };
        const { error } = await this.supabase.from('services').insert(payload);
        if (error) console.error('Supabase insert error (service):', error);
    }

    async updateService(service: ServiceRecord): Promise<void> {
        const payload = {
            cost: service.cost,
            status: service.status, // RESTAURADO
            date: service.date,
            pickup_addresses: service.pickupAddresses,
            delivery_addresses: service.deliveryAddresses,
            driver_fee: service.driverFee,
            requester_name: service.requesterName,
            paid: service.paid,
            payment_method: service.paymentMethod
        };
        const { error } = await this.supabase.from('services').update(payload).eq('id', service.id);
        if (error) console.error('Supabase update error (service):', error);
    }

    async deleteService(id: string): Promise<void> {
        const { error } = await this.supabase.from('services').delete().eq('id', id);
        if (error) {
            console.error('Supabase delete error (service):', error);
            throw new Error('Falha ao excluir serviço no Supabase');
        }
    }

    // --- Expenses ---
    async getExpenses(ownerId: string): Promise<ExpenseRecord[]> {
        const { data, error } = await this.supabase.from('expenses').select('*').eq('owner_id', ownerId);
        if (error) return [];
        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id
        })) as ExpenseRecord[];
    }

    async saveExpense(expense: ExpenseRecord): Promise<void> {
        const payload = {
            id: expense.id,
            owner_id: expense.ownerId,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            description: expense.description
        };
        const { error } = await this.supabase.from('expenses').insert(payload);
        if (error) console.error('Supabase insert error (expense):', error);
    }

    async deleteExpense(id: string): Promise<void> {
        const { error } = await this.supabase.from('expenses').delete().eq('id', id);
        if (error) throw new Error('Falha ao excluir despesa');
    }
}
