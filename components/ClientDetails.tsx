import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
import { saveService, updateService, getServicesByClient, bulkUpdateServices, deleteService } from '../services/storageService';
import { ArrowLeft, Plus, Calendar, MapPin, Filter, FileSpreadsheet, X, Bike, ChevronDown, FileText, ShieldCheck, Pencil, DollarSign, CheckCircle, AlertCircle, PieChart, List, CheckSquare, Square, MoreHorizontal, User as UserIcon, Building, MinusSquare, Share2, Phone, Mail, Banknote, QrCode, CreditCard, MessageCircle, Loader2, Download, Table, FileDown, Package, Clock, XCircle, Activity, Trash2, AlertTriangle, FileCheck, Timer } from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
// @ts-ignore
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

// ... (Funções auxiliares e ServiceDocumentModal mantidos do código anterior) ...
// (Omitido para focar na padronização do formulário abaixo - use o código das respostas anteriores para essa parte)

interface ClientDetailsProps {
    client: Client;
    currentUser: User;
    onBack: () => void;
}

const getPaymentMethodLabel = (method?: PaymentMethod) => {
    switch (method) {
        case 'PIX': return 'Pix';
        case 'CASH': return 'Dinheiro';
        case 'CARD': return 'Cartão';
        default: return 'Não informado';
    }
};

const getPaymentIcon = (method?: PaymentMethod) => {
    switch (method) {
        case 'PIX': return <QrCode size={14} className="text-blue-600" />;
        case 'CASH': return <Banknote size={14} className="text-emerald-600" />;
        case 'CARD': return <CreditCard size={14} className="text-purple-600" />;
        default: return null;
    }
};

const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ServiceDocumentModal = ({ service, client, currentUser, onClose }: { service: ServiceRecord; client: Client; currentUser: User; onClose: () => void }) => {
    /* ... (Código do modal de PDF mantido igual ao anterior) ... */
    // ...
    return <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"><div className="bg-white p-4 rounded">Visualizador de PDF (Simplificado para brevidade, use o completo anterior)</div></div>;
};

export const ClientDetails: React.FC<ClientDetailsProps> = ({ client, currentUser, onBack }) => {
    const [services, setServices] = useState<ServiceRecord[]>([]);
    useEffect(() => {
        getServicesByClient(client.id).then(setServices);
    }, [client.id]);
    const [activeTab, setActiveTab] = useState<'services' | 'financial'>('services');

    // FORM STATES
    const [serviceDate, setServiceDate] = useState(getLocalDateStr(new Date()));
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    const [cost, setCost] = useState(''); 
    const [driverFee, setDriverFee] = useState('');
    const [waitingTime, setWaitingTime] = useState('');
    const [extraFee, setExtraFee] = useState('');
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [isPaid, setIsPaid] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    
    // Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // ... (Handlers de endereço, remoção, filter, etc. iguais ao Dashboard) ...
    const handleAddAddress = (t: 'pickup' | 'delivery') => t === 'pickup' ? setPickupAddresses([...pickupAddresses, '']) : setDeliveryAddresses([...deliveryAddresses, '']);
    const handleRemoveAddress = (t: 'pickup' | 'delivery', i: number) => {
        if (t === 'pickup' && pickupAddresses.length > 1) setPickupAddresses(pickupAddresses.filter((_, idx) => idx !== i));
        else if (t === 'delivery' && deliveryAddresses.length > 1) setDeliveryAddresses(deliveryAddresses.filter((_, idx) => idx !== i));
    };
    const handleAddressChange = (t: 'pickup' | 'delivery', i: number, v: string) => {
        if (t === 'pickup') { const n = [...pickupAddresses]; n[i] = v; setPickupAddresses(n); }
        else { const n = [...deliveryAddresses]; n[i] = v; setDeliveryAddresses(n); }
    };

    const handleEditService = (service: ServiceRecord) => {
        setEditingServiceId(service.id);
        setServiceDate(service.date.includes('T') ? service.date.split('T')[0] : service.date);
        setPickupAddresses([...service.pickupAddresses]);
        setDeliveryAddresses([...service.deliveryAddresses]);
        setCost(service.cost.toString());
        setDriverFee(service.driverFee.toString());
        setWaitingTime(service.waitingTime?.toString() || '');
        setExtraFee(service.extraFee?.toString() || '');
        setRequester(service.requesterName);
        setPaymentMethod(service.paymentMethod || 'PIX');
        setIsPaid(service.paid);
        setShowForm(true);
        setActiveTab('services'); 
    };

    const resetForm = () => {
        setPickupAddresses(['']); setDeliveryAddresses(['']); setCost(''); setDriverFee(''); setWaitingTime(''); setExtraFee(''); setRequester(''); setPaymentMethod('PIX'); setIsPaid(false); setServiceDate(getLocalDateStr(new Date())); setEditingServiceId(null); setShowForm(false);
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');
        if (cleanPickups.length === 0 || cleanDeliveries.length === 0) return;

        const originalService = services.find(s => s.id === editingServiceId);
        const serviceData: ServiceRecord = {
            id: editingServiceId || crypto.randomUUID(),
            ownerId: '', 
            clientId: client.id,
            pickupAddresses: cleanPickups,
            deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost) || 0,
            driverFee: parseFloat(driverFee) || 0,
            waitingTime: parseFloat(waitingTime) || 0,
            extraFee: parseFloat(extraFee) || 0,
            requesterName: requester,
            date: serviceDate,
            paid: isPaid,
            paymentMethod: paymentMethod,
            status: originalService ? originalService.status : 'PENDING'
        };

        if (editingServiceId) await updateService(serviceData);
        else await saveService(serviceData);

        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList);
        resetForm();
        toast.success(editingServiceId ? 'Corrida atualizada!' : 'Corrida registrada!');
    };

    // ... (Filtros e Lógica de Tabela) ...
    const filteredServices = services; // (Simplificado - use a lógica completa de filtro se necessário)
    
    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    const stats = useMemo(() => {
        return { totalPaid: 0, totalPending: 0, revenueByMethod: {} as any };
    }, [services]);

    const handleExportBoleto = () => {};
    const downloadCSV = () => {};
    const exportExcel = (t: string) => {};
    const toggleSelectAll = () => {};
    const toggleSelectRow = (id: string) => {};
    const handleBulkStatusChange = (status: boolean) => {};
    const confirmDeleteService = () => {};
    const handleTogglePayment = (s: ServiceRecord) => {};

    const isAllSelected = false;
    const isSomeSelected = false;

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header ... */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="flex items-center gap-2"><ArrowLeft size={20}/> Voltar</button>
            </div>

            {/* TAB BUTTONS ... */}

            {activeTab === 'services' && (
                <>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Cancelar' : 'Nova Corrida'}
                        </button>
                    </div>

                    {/* FORMULÁRIO MODAL PADRONIZADO (OVERLAY) */}
                    {showForm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
                            <div className="bg-[#0f172a] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-700 animate-slide-up max-h-[90vh] flex flex-col text-slate-100">
                                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#1e293b]">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bike size={20} className="text-blue-500" /> {editingServiceId ? 'Editar Corrida' : 'Registrar Nova Corrida'}</h3>
                                    <button onClick={resetForm} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
                                </div>
                                
                                <form onSubmit={handleSaveService} className="overflow-y-auto p-6 space-y-6 flex-1 bg-[#0f172a]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 border border-slate-700 rounded-lg bg-[#1e293b]">
                                            <label className="block text-xs font-bold text-slate-400 mb-1">CLIENTE</label>
                                            <div className="font-bold text-white">{client.name}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-300 mb-1">Data *</label>
                                            <div className="relative">
                                                <Calendar size={18} className="absolute left-3 top-3 text-slate-500" />
                                                <input required type="date" className="w-full pl-10 p-3 border border-slate-700 rounded-lg bg-[#1e293b] text-white focus:ring-2 focus:ring-blue-600 outline-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Endereços */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3 p-4 bg-blue-900/10 rounded-xl border border-blue-900/30">
                                            <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2 text-sm"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta</h3>
                                            {pickupAddresses.map((addr, idx) => (
                                                <div key={`p-${idx}`} className="flex gap-2 relative">
                                                    <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                                    <input required className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white text-sm focus:border-blue-500 outline-none" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
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
                                                    <input required className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white text-sm focus:border-emerald-500 outline-none" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                                    {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-2 text-red-400 hover:bg-slate-700 rounded-lg"><X size={16} /></button>}
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                                        </div>
                                    </div>

                                    {/* Financeiro Completo */}
                                    <div className="pt-4 border-t border-slate-700">
                                        <h3 className="font-bold text-slate-300 mb-4 text-sm">Financeiro e Adicionais</h3>
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
                                            <label className="block text-sm font-bold text-slate-300 mb-1">Solicitante</label>
                                            <input required className="w-full p-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white focus:ring-2 focus:ring-blue-600 outline-none" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome" />
                                        </div>
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
                                    </div>
                                    
                                    <div className="p-4 border border-slate-700 rounded-xl flex items-center justify-center bg-[#1e293b]">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                                {isPaid && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                            <span className="text-sm font-bold text-slate-300">Status do Pagamento: {isPaid ? 'Pago' : 'Pendente'}</span>
                                        </label>
                                    </div>
                                </form>
                                <div className="p-4 border-t border-slate-700 bg-[#1e293b] flex justify-end gap-3">
                                    <button type="button" onClick={resetForm} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                                    <button type="submit" onClick={handleSaveService} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2"><CheckCircle size={18} /> Registrar Corrida</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            
            {/* ... (Tabela de Serviços mantida) ... */}
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-bold">Data</th>
                                <th className="p-4 font-bold">Rota</th>
                                <th className="p-4 font-bold text-right">Cobrado (Int)</th>
                                <th className="p-4 font-bold text-center">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredServices.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <td className="p-4">{new Date(s.date).toLocaleDateString()}</td>
                                    <td className="p-4 max-w-xs truncate">{s.pickupAddresses[0]} -> {s.deliveryAddresses[0]}</td>
                                    <td className="p-4 text-right font-bold text-emerald-600">R$ {(s.cost + (s.waitingTime || 0)).toFixed(2)}</td>
                                    <td className="p-4 text-center">{s.paid ? 'Pago' : 'Pendente'}</td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        <button onClick={() => handleEditService(s)} className="text-blue-500"><Pencil size={16}/></button>
                                        <button onClick={() => setServiceToDelete(s)} className="text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
