import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User, ServiceLog } from '../../types';

export class SupabaseAdapter implements DatabaseAdapter {
    private supabase: SupabaseClient;

    constructor(url: string, key: string) {
        this.supabase = createClient(url, key);
    }

    async initialize() {
        console.log('🔌 Supabase Adapter Ativo');
    }

    // --- Users ---
    async getUsers(): Promise<User[]> {
        const { data, error } = await this.supabase.from('users').select('*');
        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
        return data as User[];
    }

    async saveUser(user: User): Promise<void> {
        const { error } = await this.supabase.from('users').upsert(user);
        if (error) throw new Error(`Erro ao salvar usuário: ${error.message}`);
    }

    async updateUser(user: User): Promise<void> {
        const { error } = await this.supabase.from('users').update(user).eq('id', user.id);
        if (error) throw new Error(`Erro ao atualizar usuário: ${error.message}`);
        
        if (user.password) {
            try { await this.supabase.auth.updateUser({ password: user.password }); } catch (e) {}
        }
    }

    async deleteUser(id: string): Promise<void> {
        const { error } = await this.supabase.from('users').delete().eq('id', id);
        if (error) throw new Error(`Erro ao deletar usuário: ${error.message}`);
    }

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const { data, error } = await this.supabase.from('clients').select('*').eq('owner_id', ownerId);
        if (error) {
            console.error('Erro ao buscar clientes:', error);
            return [];
        }

        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id,
            createdAt: d.created_at,
            contactPerson: d.contact_person,
            deletedAt: d.deleted_at 
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
            created_at: client.createdAt,
            deleted_at: client.deletedAt || null 
        };
        const { error } = await this.supabase.from('clients').upsert(payload);
        if (error) {
            throw new Error(`Falha ao salvar cliente: ${error.message}`);
        }
    }

    async deleteClient(id: string): Promise<void> {
        const { error } = await this.supabase.from('clients').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // --- LOGS HELPER ---
    private async logAction(serviceId: string, action: string, changes: any, user?: User) {
        if (!user) return; 
        // Log não deve travar a operação principal, então usamos catch silencioso no console
        await this.supabase.from('service_logs').insert({
            service_id: serviceId,
            user_name: user.name || user.email,
            action: action,
            changes: changes,
            created_at: new Date().toISOString()
        }).catch(err => console.warn("Erro ao salvar log:", err));
    }

    // --- Services ---
    async getServices(ownerId: string, start?: string, end?: string, clientId?: string): Promise<ServiceRecord[]> {
        let query = this.supabase.from('services').select('*').eq('owner_id', ownerId);
        if (start && end) query = query.gte('date', start).lte('date', end);
        if (clientId) query = query.eq('client_id', clientId);

        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar serviços:', error);
            return [];
        }
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
            status: d.status,
            waitingTime: d.waiting_time, 
            extraFee: d.extra_fee,
            manualOrderId: d.manual_order_id,
            deletedAt: d.deleted_at
        })) as ServiceRecord[];
    }

    async saveService(service: ServiceRecord, user?: User): Promise<void> {
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
            payment_method: service.paymentMethod,
            waiting_time: service.waitingTime,
            extra_fee: service.extraFee,
            manual_order_id: service.manualOrderId,
            deleted_at: service.deletedAt || null
        };

        // Verifica existência para log
        const { data: existing } = await this.supabase.from('services').select('id').eq('id', service.id).single();
        
        // AQUI ESTÁ A CORREÇÃO: VERIFICAÇÃO DE ERRO NO UPSERT
        const { error } = await this.supabase.from('services').upsert(payload);
        
        if (error) {
            console.error("ERRO CRÍTICO AO SALVAR SERVIÇO:", error);
            throw new Error(`Erro no Banco de Dados: ${error.message}`);
        }
        
        // Só grava log se salvou com sucesso
        if (user && !existing) {
            await this.logAction(service.id, 'CRIACAO', { info: 'Serviço criado' }, user);
        }
    }

    async updateService(service: ServiceRecord, user?: User): Promise<void> {
        // 1. Busca dado antigo para log (Leve - busca apenas UM registro)
        const { data: oldDataRaw } = await this.supabase.from('services').select('*').eq('id', service.id).single();
        
        const payload = {
            cost: service.cost,
            status: service.status,
            date: service.date,
            pickup_addresses: service.pickupAddresses,
            delivery_addresses: service.deliveryAddresses,
            driver_fee: service.driverFee,
            requester_name: service.requesterName,
            paid: service.paid,
            payment_method: service.paymentMethod,
            waiting_time: service.waitingTime,
            extra_fee: service.extraFee,
            manual_order_id: service.manualOrderId,
            deleted_at: service.deletedAt || null
        };

        const { error } = await this.supabase.from('services').update(payload).eq('id', service.id);

        if (error) {
            throw new Error(`Erro ao atualizar: ${error.message}`);
        }

        // Lógica de Log (Só executa se não houve erro)
        if (user && oldDataRaw) {
            const oldService: ServiceRecord = {
                id: oldDataRaw.id,
                ownerId: oldDataRaw.owner_id,
                clientId: oldDataRaw.client_id,
                cost: oldDataRaw.cost,
                status: oldDataRaw.status,
                date: oldDataRaw.date,
                pickupAddresses: oldDataRaw.pickup_addresses,
                deliveryAddresses: oldDataRaw.delivery_addresses,
                driverFee: oldDataRaw.driver_fee,
                requesterName: oldDataRaw.requester_name,
                paid: oldDataRaw.paid,
                paymentMethod: oldDataRaw.payment_method,
                waitingTime: oldDataRaw.waiting_time,
                extraFee: oldDataRaw.extra_fee,
                manualOrderId: oldDataRaw.manual_order_id,
                deletedAt: oldDataRaw.deleted_at
            };

            const changes: Record<string, { old: any, new: any }> = {};
            
            // Comparações de campos
            if (oldService.cost !== service.cost) changes['Valor'] = { old: oldService.cost, new: service.cost };
            if (oldService.paid !== service.paid) changes['Status Pagto'] = { old: oldService.paid ? 'Pago' : 'Pendente', new: service.paid ? 'Pago' : 'Pendente' };
            
            // Log de Lixeira
            if (!oldService.deletedAt && service.deletedAt) {
                 await this.logAction(service.id, 'EXCLUSAO', { info: 'Movido para lixeira' }, user);
                 return;
            }
            if (oldService.deletedAt && !service.deletedAt) {
                 await this.logAction(service.id, 'RESTAURACAO', { info: 'Restaurado da lixeira' }, user);
                 return;
            }

            if (Object.keys(changes).length > 0) {
                await this.logAction(service.id, 'EDICAO', changes, user);
            }
        }
    }

    async deleteService(id: string, user?: User): Promise<void> {
        const { error } = await this.supabase.from('services').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    async getServiceLogs(serviceId: string): Promise<ServiceLog[]> {
        const { data, error } = await this.supabase
            .from('service_logs')
            .select('*')
            .eq('service_id', serviceId)
            .order('created_at', { ascending: false });

        if (error) return [];
        
        return data.map((l: any) => ({
            id: l.id,
            serviceId: l.service_id,
            userName: l.user_name,
            action: l.action,
            changes: l.changes,
            createdAt: l.created_at
        })) as ServiceLog[];
    }

    // --- Expenses ---
    async getExpenses(ownerId: string, start?: string, end?: string): Promise<ExpenseRecord[]> {
        let query = this.supabase.from('expenses').select('*').eq('owner_id', ownerId);
        if (start && end) query = query.gte('date', start).lte('date', end);
        const { data, error } = await query;
        if(error) return [];
        return (data || []).map((d: any) => ({ ...d, ownerId: d.owner_id })) as ExpenseRecord[];
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
        const { error } = await this.supabase.from('expenses').upsert(payload);
        if(error) throw new Error(error.message);
    }

    async deleteExpense(id: string): Promise<void> {
        const { error } = await this.supabase.from('expenses').delete().eq('id', id);
        if(error) throw new Error(error.message);
    }

    // --- Password Reset ---
    async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
        const { error } = await this.supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
        if (error) return { success: false, message: error.message };
        return { success: true };
    }

    async completePasswordReset(email: string, code: string, newPass: string): Promise<{ success: boolean; message?: string }> {
        const { data, error } = await this.supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) return { success: false, message: 'Código inválido.' };
        if (data.user) {
            await this.supabase.auth.updateUser({ password: newPass });
            await this.supabase.from('users').update({ password: newPass }).eq('email', email);
            return { success: true };
        }
        return { success: false, message: 'Erro de sessão.' };
    }
}
