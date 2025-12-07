
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, User } from '../../types';

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

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const { data, error } = await this.supabase.from('clients').select('*').eq('owner_id', ownerId); // Note: Assuming SQL map is snake_case
        if (error) return [];

        // Map back to camelCase if needed, or assume data matches type (ideal)
        // For simplicity in this demo, strict mapping might be needed in prod
        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id,
            createdAt: d.created_at
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

    // --- Services ---
    async getServices(ownerId: string): Promise<ServiceRecord[]> {
        // This might require a join in SQL or filtering by owner_id on service if denormalized
        // Optimized: Service should have owner_id
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
            paymentMethod: d.payment_method
        })) as ServiceRecord[];
    }

    async saveService(service: ServiceRecord): Promise<void> {
        const payload = {
            id: service.id,
            owner_id: service.ownerId,
            client_id: service.clientId,
            cost: service.cost,
            status: service.status,
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
            status: service.status,
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
}
