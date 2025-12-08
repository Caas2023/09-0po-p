import React, { useState, useMemo } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
import { saveService, updateService, deleteService } from '../services/storageService';
import { HandCoins, Users, Bike, AlertCircle, CheckCircle, Calendar, ArrowUpRight, ArrowDownRight, Filter, Plus, X, MapPin, User as UserIcon, DollarSign, CreditCard, Banknote, QrCode, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
    clients: Client[];
    services: ServiceRecord[];
    currentUser: User;
    onRefresh: () => void;
}

export function Dashboard({ clients, services, currentUser, onRefresh }: DashboardProps) {
    const [filter, setFilter] = useState<'TODOS' | 'PENDENTE' | 'PAGO'>('TODOS');
    const [showNewServiceModal, setShowNewServiceModal] = useState(false);

    // New Service Form State
    const [selectedClientId, setSelectedClientId] = useState('');
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    const [cost, setCost] = useState('');
    const [driverFee, setDriverFee] = useState('');
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [isPaid, setIsPaid] = useState(false);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const stats = useMemo(() => {
        const totalServices = services.length;
        const totalClients = clients.length;
        // ATUALIZADO: Removemos a contagem baseada em status
        const activeServices = services.filter(s => !s.paid).length; 
        const pendingPayment = services.filter(s => !s.paid).reduce((acc, curr) => acc + curr.cost, 0);

        // Mock percentage change
        const revenueChange = +12.5;
        const clientsChange = +5.2;
        const activeChange = -2.1;
        const pendingChange = +8.4;

        return {
            totalServices,
            totalClients,
            activeServices,
            pendingPayment,
            revenueChange,
            clientsChange,
            activeChange,
            pendingChange
        };
    }, [services, clients]);

    const filteredServices = useMemo(() => {
        let filtered = [...services];
        if (filter === 'PENDENTE') {
            filtered = filtered.filter(s => !s.paid);
        } else if (filter === 'PAGO') {
            filtered = filtered.filter(s => s.paid);
        }
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    }, [services, filter]);

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Cliente Desconhecido';
    };

    const handleAddAddress = (type: 'pickup' | 'delivery') => {
        if (type === 'pickup') setPickupAddresses([...pickupAddresses, '']);
        else setDeliveryAddresses([...deliveryAddresses, '']);
    };

    const handleRemoveAddress = (type: 'pickup' | 'delivery', index: number) => {
        if (type === 'pickup') {
            if (pickupAddresses.length > 1) setPickupAddresses(pickupAddresses.filter((_, i) => i !== index));
        } else {
            if (deliveryAddresses.length > 1) setDeliveryAddresses(deliveryAddresses.filter((_, i) => i !== index));
        }
    };

    const handleAddressChange = (type: 'pickup' | 'delivery', index: number, value: string) => {
        if (type === 'pickup') {
            const newAddresses = [...pickupAddresses];
            newAddresses[index] = value;
            setPickupAddresses(newAddresses);
        } else {
            const newAddresses = [...deliveryAddresses];
            newAddresses[index] = value;
            setDeliveryAddresses(newAddresses);
        }
    };

    const resetForm = () => {
        setSelectedClientId('');
        setServiceDate(new Date().toISOString().split('T')[0]);
        setPickupAddresses(['']);
        setDeliveryAddresses(['']);
        setCost('');
        setDriverFee('');
        setRequester('');
        setPaymentMethod('PIX');
        setIsPaid(false);
        setShowNewServiceModal(false);
    };

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) {
            toast.error('Selecione um cliente.');
            return;
        }

        const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');

        if (cleanPickups.length === 0 || cleanDeliveries.length === 0) {
            toast.error('Insira os endereços de coleta e entrega.');
            return;
        }

        const newService: ServiceRecord = {
            id: crypto.randomUUID(),
            ownerId: currentUser.id,
            clientId: selectedClientId,
            date: serviceDate,
            pickupAddresses: cleanPickups,
            deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost) || 0,
            driverFee: parseFloat(driverFee) || 0,
            requesterName: requester,
            paymentMethod: paymentMethod,
            paid: isPaid,
            // status removido
        };

        await saveService(newService);
        toast.success('Corrida registrada com sucesso!');
        resetForm();
        onRefresh();
    };

    const handleTogglePayment = async (service: ServiceRecord) => {
        const updatedService = { ...service, paid: !service.paid };
        await updateService(updatedService);
        toast.success(`Pagamento ${updatedService.paid ? 'marcado como PAGO' : 'marcado como PENDENTE'}`);
        onRefresh();
        setOpenMenuId(null);
    };

    const handleDeleteService = async (serviceId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta corrida?')) {
            await deleteService(serviceId);
            toast.success('Corrida excluída com sucesso.');
            onRefresh();
            setOpenMenuId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400">Visão geral da sua operação logística</p>
                </div>
                <button
                    onClick={() => setShowNewServiceModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                    <Plus size={20} />
                    Nova Corrida Rápida
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:border-blue-500 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <HandCoins size={24} />
                        </div>
                        <span className={`flex items-center text-xs font-bold ${stats.revenueChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {stats.revenueChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {Math.abs(stats.revenueChange)}%
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{stats.totalServices}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total de Serviços</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:border-emerald-500 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Users size={24} />
                        </div>
                        <span className={`flex items-center text-xs font-bold ${stats.clientsChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {stats.clientsChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {Math.abs(stats.clientsChange)}%
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{stats.totalClients}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Clientes Ativos</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:border-amber-500 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Bike size={24} />
                        </div>
                        <span className={`flex items-center text-xs font-bold ${stats.activeChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {stats.activeChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {Math.abs(stats.activeChange)}%
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{stats.activeServices}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Corridas Pendentes</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:border-red-500 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <AlertCircle size={24} />
                        </div>
                        <span className={`flex items-center text-xs font-bold ${stats.pendingChange >= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {stats.pendingChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {Math.abs(stats.pendingChange)}%
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">R$ {stats.pendingPayment.toFixed(2)}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pendente de Recebimento</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Calendar size={20} className="text-slate-400" />
                            Atividade Recente
                        </h2>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        <button
                            onClick={() => setFilter('TODOS')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'TODOS' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('PENDENTE')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'PENDENTE' ? 'bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'}`}
                        >
                            Pendentes
                        </button>
                        <button
                            onClick={() => setFilter('PAGO')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'PAGO' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                        >
                            Pagos
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-bold">Data</th>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Rota Resumida</th>
                                <th className="p-4 font-bold text-right">Valor</th>
                                {/* COLUNA STATUS REMOVIDA DAQUI */}
                                <th className="p-4 font-bold text-center">Status Pag.</th>
                                <th className="p-4 font-bold text-center w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Nenhuma atividade recente encontrada.</td>
                                </tr>
                            ) : (
                                filteredServices.map(service => {
                                    const pickup = service.pickupAddresses[0] || 'N/A';
                                    const delivery = service.deliveryAddresses[service.deliveryAddresses.length - 1] || 'N/A';
                                    const routeSummary = `${pickup.split(',')[0]} \u2192 ${delivery.split(',')[0]}`;
                                    const isOpen = openMenuId === service.id;

                                    return (
                                        <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors relative">
                                            <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{new Date(service.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{getClientName(service.clientId)}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300 truncate max-w-xs" title={routeSummary}>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                                    {routeSummary}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-800 dark:text-white">R$ {service.cost.toFixed(2)}</td>
                                            
                                            {/* COLUNA STATUS REMOVIDA DAQUI */}
                                            
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${service.paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {service.paid ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                    {service.paid ? 'PAGO' : 'PENDENTE'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center relative">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : service.id); }}
                                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                {isOpen && (
                                                    <div className="absolute right-4 top-14 z-10 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-2 animate-fade-in">
                                                        <button 
                                                            onClick={() => handleTogglePayment(service)}
                                                            className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                                                        >
                                                            <DollarSign size={16} className={service.paid ? "text-amber-500" : "text-emerald-500"} />
                                                            Marcar como {service.paid ? 'Pendente' : 'Pago'}
                                                        </button>
                                                        <button 
                                                            onClick={() => { toast.info("Edite através da tela de clientes."); setOpenMenuId(null); }}
                                                            className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors"
                                                        >
                                                            <Pencil size={16} />
                                                            Editar Corrida
                                                        </button>
                                                        <div className="my-1 border-b border-slate-100 dark:border-slate-700"></div>
                                                        <button 
                                                            onClick={() => handleDeleteService(service.id)}
                                                            className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                            Excluir Corrida
                                                        </button>
                                                    </div>
                                                )}
                                                {isOpen && (
                                                    <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)}></div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* NEW SERVICE MODAL (QUICK ADD) */}
            {showNewServiceModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-0 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up sm:animate-slide-up max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Bike size={20} className="text-blue-600" />
                                Nova Corrida Rápida
                            </h3>
                            <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateService} className="overflow-y-auto p-6 space-y-6 flex-1">
                            {/* Client & Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente *</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400"><UserIcon size={18} /></div>
                                        <select required className="w-full pl-10 p-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none font-medium" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                            <option value="" disabled>Selecione...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data *</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400"><Calendar size={18} /></div>
                                        <input required type="date" className="w-full pl-10 p-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium appearance-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Route */}
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Retirada(s)</label>
                                    {pickupAddresses.map((addr, idx) => (
                                        <div key={`p-${idx}`} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-3 text-blue-500"><MapPin size={18} /></div>
                                                <input required className="w-full pl-10 p-3 border border-blue-200 dark:border-blue-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de coleta" />
                                            </div>
                                            {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 size={18} /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('pickup')} className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"><Plus size={16} /> Adicionar Parada</button>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Entrega(s)</label>
                                    {deliveryAddresses.map((addr, idx) => (
                                        <div key={`d-${idx}`} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-3 text-emerald-500"><MapPin size={18} /></div>
                                                <input required className="w-full pl-10 p-3 border border-emerald-200 dark:border-emerald-900/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de entrega" />
                                            </div>
                                            {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 size={18} /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('delivery')} className="text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"><Plus size={16} /> Adicionar Parada</button>
                                </div>
                            </div>

                            {/* Financials & Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div>
                                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">Valor Cobrado (R$)</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-emerald-500"><DollarSign size={18} /></div>
                                        <input required type="number" min="0" step="0.01" className="w-full pl-10 p-3 border border-emerald-200 dark:border-emerald-900/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold placeholder-slate-400" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-red-500"><Bike size={18} /></div>
                                        <input required type="number" min="0" step="0.01" className="w-full pl-10 p-3 border border-red-200 dark:border-red-900/50 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold placeholder-slate-400" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solicitante</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400"><UserIcon size={18} /></div>
                                        <input required className="w-full pl-10 p-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome" />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Toggle (No Status Dropdown) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Forma de Pagamento</label>
                                    <div className="flex gap-2">
                                        {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setPaymentMethod(method)}
                                                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === method
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400 font-bold shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {method === 'PIX' && <QrCode size={20} className="mb-1" />}
                                                {method === 'CASH' && <Banknote size={20} className="mb-1" />}
                                                {method === 'CARD' && <CreditCard size={20} className="mb-1" />}
                                                <span className="text-xs">{method === 'PIX' ? 'Pix' : method === 'CASH' ? 'Dinheiro' : 'Cartão'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center">
                                     <label className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isPaid ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-400 shadow-sm'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                 {isPaid ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">Pagamento {isPaid ? 'Realizado' : 'Pendente'}</span>
                                                <span className="text-xs opacity-80">{isPaid ? 'Já recebido' : 'Aguardando'}</span>
                                            </div>
                                        </div>
                                        <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                         <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isPaid ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isPaid ? 'translate-x-6' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </form>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
                            <button type="button" onClick={resetForm} className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" onClick={handleCreateService} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all">
                                <CheckCircle size={20} />
                                Confirmar Corrida
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
