import React, { useState } from 'react';
import { Client, ServiceRecord, PaymentMethod, ServiceStatus } from '../types';
import { saveService } from '../services/storageService';
import { ArrowLeft, MapPin, Plus, X, User, Calendar, DollarSign, Bike, CheckCircle, Clock, Timer } from 'lucide-react';

interface NewOrderProps {
    clients: Client[];
    onSave: () => void;
    onCancel: () => void;
    currentUserId?: string;
}

export const NewOrder: React.FC<NewOrderProps> = ({ clients, onSave, onCancel }) => {
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    
    // Financeiro
    const [cost, setCost] = useState('');
    const [driverFee, setDriverFee] = useState('');
    const [waitingTime, setWaitingTime] = useState('');
    const [extraFee, setExtraFee] = useState('');
    
    const [requester, setRequester] = useState('');
    const [paid, setPaid] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [status, setStatus] = useState<ServiceStatus>('PENDING');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;

        const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');
        if (cleanPickups.length === 0 || cleanDeliveries.length === 0) return;

        const serviceData: ServiceRecord = {
            id: crypto.randomUUID(),
            ownerId: '', 
            clientId: selectedClientId,
            pickupAddresses: cleanPickups,
            deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost),
            driverFee: parseFloat(driverFee) || 0,
            waitingTime: parseFloat(waitingTime) || 0,
            extraFee: parseFloat(extraFee) || 0,
            requesterName: requester,
            date: serviceDate,
            paid: paid,
            paymentMethod: paymentMethod,
            status: status
        };

        await saveService(serviceData);
        onSave();
    };

    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    return (
        <div className="max-w-4xl mx-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nova Corrida</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Preencha os dados para registrar um novo serviço</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <label className="block text-sm font-bold text-slate-800 dark:text-white mb-2">Selecione o Cliente</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-3 text-slate-500 dark:text-slate-400" />
                        <select required className="w-full pl-10 p-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 text-lg font-semibold text-slate-900 dark:text-white shadow-sm" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                            <option value="" disabled>Escolha uma empresa...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Data do Serviço</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-2.5 text-slate-500 dark:text-slate-400" />
                                <input required type="date" className="w-full pl-10 p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Solicitado Por</label>
                            <input required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome do funcionário" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
                            <h3 className="font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2 text-sm"><div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></div> Coleta</h3>
                            {pickupAddresses.map((addr, idx) => (
                                <div key={idx} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-2.5 text-blue-500" />
                                    <input required className="w-full pl-9 p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
                                    {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><X size={18} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('pickup')} className="text-sm text-blue-700 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                        <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-2 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></div> Entrega</h3>
                            {deliveryAddresses.map((addr, idx) => (
                                <div key={idx} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-2.5 text-emerald-500" />
                                    <input required className="w-full pl-9 p-2 border border-emerald-200 dark:border-emerald-800/50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                    {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><X size={18} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('delivery')} className="text-sm text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                    </div>

                    {/* FINANCIAL SECTION - EXACT MATCH */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Financeiro e Adicionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">Valor da Corrida (R$)</label>
                                <div className="relative">
                                    <DollarSign size={18} className="absolute left-3 top-2.5 text-emerald-600" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-10 p-2 border border-emerald-300 dark:border-emerald-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder-slate-400" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                <div className="relative">
                                    <Bike size={18} className="absolute left-3 top-2.5 text-red-600" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-10 p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-lg font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder-slate-400" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Valor Espera (R$)</label>
                                <div className="relative">
                                    <Timer size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Soma no total do sistema</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Taxa Extra (R$)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Soma apenas no PDF do Cliente</p>
                            </div>
                        </div>

                        {/* PREVIEW BOX */}
                        <div className="p-4 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700 shadow-inner mb-6">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Interno (Base + Espera)</span>
                                <span className="text-xl font-bold text-white">R$ {currentTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Total no PDF Cliente (+ Taxa)</span>
                                <span className="text-sm font-bold text-slate-300">R$ {pdfTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Forma de Pagamento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(method => (
                                        <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`flex items-center justify-center p-2 rounded-lg border transition-all font-bold text-xs ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}>
                                            {method === 'PIX' ? 'Pix' : method === 'CASH' ? 'Dinheiro' : 'Cartão'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${paid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                        {paid && <CheckCircle size={16} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={paid} onChange={e => setPaid(e.target.checked)} />
                                    <div>
                                        <span className="block font-bold text-slate-200 text-sm">Status do Pagamento</span>
                                        <span className="text-xs text-slate-500">{paid ? 'Pago' : 'Aguardando pagamento'}</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="px-6 py-3 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"><CheckCircle size={20} /> Registrar Corrida</button>
                </div>
            </form>
        </div>
    );
};
