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

// ... (ServiceDocumentModal permanece inalterado para economizar espaço, use a versão anterior) ...
// (A lógica de PDF já está correta lá)

export const ClientDetails: React.FC<ClientDetailsProps> = ({ client, currentUser, onBack }) => {
    const [services, setServices] = useState<ServiceRecord[]>([]);

    useEffect(() => {
        getServicesByClient(client.id).then(setServices);
    }, [client.id]);
    const [activeTab, setActiveTab] = useState<'services' | 'financial'>('services');

    const [showForm, setShowForm] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);

    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [serviceDate, setServiceDate] = useState(getLocalDateStr(new Date()));
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    const [cost, setCost] = useState(''); 
    const [driverFee, setDriverFee] = useState(''); 
    const [waitingTime, setWaitingTime] = useState(''); // NEW
    const [extraFee, setExtraFee] = useState('');       // NEW
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    
    // Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // ... (Add/Remove Address functions - standard) ...
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
        setShowForm(true);
        setActiveTab('services'); 
    };

    const resetForm = () => {
        setPickupAddresses(['']);
        setDeliveryAddresses(['']);
        setCost('');
        setDriverFee('');
        setWaitingTime('');
        setExtraFee('');
        setRequester('');
        setPaymentMethod('PIX');
        setServiceDate(getLocalDateStr(new Date()));
        setEditingServiceId(null);
        setShowForm(false);
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
            cost: parseFloat(cost),
            driverFee: parseFloat(driverFee) || 0,
            waitingTime: parseFloat(waitingTime) || 0,
            extraFee: parseFloat(extraFee) || 0,
            requesterName: requester,
            date: serviceDate,
            paid: originalService ? originalService.paid : false,
            paymentMethod: paymentMethod,
            status: originalService ? originalService.status : 'PENDING'
        };

        if (editingServiceId) await updateService(serviceData);
        else await saveService(serviceData);

        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList);
        resetForm();
    };

    // ... (Filter logic, DateRange, BulkStatus - same as previous) ...
    const getFilteredServices = () => {
        let filtered = services;
        if (startDate && endDate) {
            filtered = filtered.filter(s => {
                const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
                return dateStr >= startDate && dateStr <= endDate;
            });
        }
        if (statusFilter === 'PAID') filtered = filtered.filter(s => s.paid === true);
        else if (statusFilter === 'PENDING') filtered = filtered.filter(s => s.paid === false);
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };
    const filteredServices = getFilteredServices();

    // Stats Calculation
    const stats = useMemo(() => {
        const totalPaid = filteredServices.filter(s => s.paid).reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
        const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
        return { totalPaid, totalPending };
    }, [filteredServices]);

    // PDF Export Logic (handleExportBoleto) - Use code from previous turn for full logic
    const handleExportBoleto = () => { /* ... mesma lógica fornecida anteriormente ... */ };

    // --- FORMULARIO PADRONIZADO AQUI ---
    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* ... Header & Tabs ... */}
            
            {activeTab === 'services' && (
                <>
                    <div className="flex justify-end">
                        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Cancelar' : 'Nova Corrida'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleSaveService} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 space-y-6 animate-slide-down">
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{editingServiceId ? 'Editar Corrida' : 'Registrar Nova Corrida'}</h3>
                                <input type="date" className="p-2 border rounded-lg dark:bg-slate-700 dark:text-white" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                            </div>

                            {/* Addresses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200">
                                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400">Coleta</h3>
                                    {pickupAddresses.map((addr, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            <input className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-white" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço" />
                                            {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)}><X size={16} /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs font-bold text-blue-600"><Plus size={14} /> Adicionar</button>
                                </div>
                                <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200">
                                    <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Entrega</h3>
                                    {deliveryAddresses.map((addr, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            <input className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-white" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço" />
                                            {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)}><X size={16} /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs font-bold text-emerald-600"><Plus size={14} /> Adicionar</button>
                                </div>
                            </div>

                            {/* Financials - Padrão Exato */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm">Financeiro e Adicionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Valor da Corrida (R$)</label>
                                        <div className="relative">
                                            <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                                            <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-emerald-300 rounded-lg bg-transparent text-lg font-bold dark:text-white" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                        <div className="relative">
                                            <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                            <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-red-300 rounded-lg bg-transparent text-lg font-bold dark:text-white" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Valor Espera (R$)</label>
                                        <div className="relative">
                                            <Timer size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm dark:text-white" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="0.00" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Soma no total do sistema</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Taxa Extra (R$)</label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm dark:text-white" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="0.00" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Soma apenas no PDF do Cliente</p>
                                    </div>
                                </div>

                                {/* Total Preview Box */}
                                <div className="p-4 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700 shadow-inner">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Interno (Base + Espera)</span>
                                        <span className="text-xl font-bold text-white">R$ {currentTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-bold text-slate-500 uppercase">Total no PDF Cliente (+ Taxa)</span>
                                        <span className="text-sm font-bold text-slate-300">R$ {pdfTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solicitante</label>
                                <input required className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:text-white" value={requester} onChange={e => setRequester(e.target.value)} />
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button type="button" onClick={resetForm} className="px-4 py-2 font-bold text-slate-600">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    )}
                </>
            )}
            {/* ... (Table and other tabs) ... */}
        </div>
    );
};
