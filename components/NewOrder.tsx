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

    const handleAddAddress = (t: 'pickup' | 'delivery') => t === 'pickup' ? setPickupAddresses([...pickupAddresses, '']) : setDeliveryAddresses([...deliveryAddresses, '']);
    const handleRemoveAddress = (t: 'pickup' | 'delivery', i: number) => {
        if (t === 'pickup' && pickupAddresses.length > 1) setPickupAddresses(pickupAddresses.filter((_, idx) => idx !== i));
        else if (t === 'delivery' && deliveryAddresses.length > 1) setDeliveryAddresses(deliveryAddresses.filter((_, idx) => idx !== i));
    };
    const handleAddressChange = (t: 'pickup' | 'delivery', i: number, v: string) => {
        if (t === 'pickup') { const n = [...pickupAddresses]; n[i] = v; setPickupAddresses(n); }
        else { const n = [...deliveryAddresses]; n[i] = v; setDeliveryAddresses(n); }
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
            cost: parseFloat(cost) || 0,
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
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"><ArrowLeft size={24} /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nova Corrida</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Preencha os dados do serviço</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-[#0f172a] rounded-xl shadow-2xl border border-slate-700 overflow-hidden text-slate-100">
                <div className="p-6 border-b border-slate-700 bg-[#1e293b]">
                    <label className="block text-sm font-bold text-white mb-2">Selecione o Cliente</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-3 text-slate-500" />
                        <select required className="w-full pl-10 p-3 border border-slate-700 rounded-xl bg-[#0f172a] text-white focus:ring-2 focus:ring-blue-600 outline-none" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                            <option value="" disabled>Escolha uma empresa...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Linha Data & Solicitante */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Data</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-3 text-slate-500" />
                                <input required type="date" className="w-full pl-10 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white focus:ring-2 focus:ring-blue-600 outline-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Solicitado Por</label>
                            <input required className="w-full p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white focus:ring-2 focus:ring-blue-600 outline-none placeholder-slate-500" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome do funcionário" />
                        </div>
                    </div>

                    {/* Endereços */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3 p-4 bg-blue-900/10 rounded-xl border border-blue-900/30">
                            <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2 text-sm"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta</h3>
                            {pickupAddresses.map((addr, idx) => (
                                <div key={`p-${idx}`} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                    <input required className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white text-sm" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
                                    {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="p-2 text-red-400 hover:bg-slate-700 rounded-lg"><X size={16} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                        <div className="space-y-3 p-4 bg-emerald-900/10 rounded-xl border border-emerald-900/30">
                            <h3 className="font-bold text-emerald-400 flex items-center gap-2 mb-2 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrega</h3>
                            {deliveryAddresses.map((addr, idx) => (
                                <div key={`d-${idx}`} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                                    <input required className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white text-sm" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                    {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-2 text-red-400 hover:bg-slate-700 rounded-lg"><X size={16} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                    </div>

                    {/* Financeiro Completo (Layout Exato) */}
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="font-bold text-white mb-4 text-sm">Financeiro e Adicionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-400 mb-1">Valor da Corrida (R$)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-lg font-bold text-emerald-400 focus:border-emerald-500 outline-none" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                <div className="relative">
                                    <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-lg font-bold text-red-400 focus:border-red-500 outline-none" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">VALOR ESPERA (R$)</label>
                                <div className="relative">
                                    <Timer size={14} className="absolute left-3 top-3 text-slate-500" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-sm text-white focus:border-blue-500 outline-none" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Soma no total do sistema</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">TAXA EXTRA (R$)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-3 text-slate-500" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-sm text-white focus:border-blue-500 outline-none" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Soma apenas no PDF do Cliente</p>
                            </div>
                        </div>

                        {/* BOX TOTAIS - PADRONIZADO */}
                        <div className="p-4 bg-[#1e293b] rounded-lg flex justify-between items-center border border-slate-700 shadow-inner">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">TOTAL INTERNO (BASE + ESPERA)</span>
                                <span className="text-xl font-bold text-white">R$ {currentTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">TOTAL NO PDF CLIENTE (+ TAXA)</span>
                                <span className="text-sm font-bold text-slate-300">R$ {pdfTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pagamento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div className="p-3 border border-slate-700 rounded-xl">
                            <label className="block text-xs font-bold text-slate-300 mb-2">Forma de Pagamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(m => (
                                    <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex items-center justify-center py-2 rounded-lg border text-xs font-bold ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}>
                                        {m === 'PIX' ? 'Pix' : m === 'CASH' ? 'Din' : 'Card'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 border border-slate-700 rounded-xl flex items-center justify-center">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                    {isPaid && <CheckCircle size={14} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                <div>
                                    <span className="block font-bold text-slate-200 text-sm">Status do Pagamento</span>
                                    <span className="text-xs text-slate-500">{isPaid ? 'Pago' : 'Aguardando pagamento'}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </form>
                
                <div className="p-4 border-t border-slate-700 bg-[#1e293b] flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"><CheckCircle size={20} /> Registrar Corrida</button>
                </div>
            </form>
        </div>
    );
};
