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

export const ServiceDocumentModal = ({ service, client, currentUser, onClose }: { service: ServiceRecord; client: Client; currentUser: User; onClose: () => void }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const myCompany = {
        name: currentUser.companyName || currentUser.name || "LogiTrack Express",
        cnpj: currentUser.companyCnpj || "",
        address: currentUser.companyAddress || "",
        phone: currentUser.phone || "",
        email: currentUser.email,
        website: ""
    };

    const generatePDF = async () => {
        if (!invoiceRef.current) return null;
        const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        return pdf;
    };

    const handleDownloadPDF = async () => {
        if (isGeneratingPdf || isSharing) return;
        setIsGeneratingPdf(true);
        try {
            const pdf = await generatePDF();
            if (pdf) pdf.save(`Ordem_${service.id.slice(0, 8)}.pdf`);
        } catch (error) { console.error(error); alert("Erro ao gerar PDF."); } finally { setIsGeneratingPdf(false); }
    };

    const handleShareWhatsApp = async () => {
        if (isSharing || isGeneratingPdf) return;
        setIsSharing(true);
        try {
            const pdf = await generatePDF();
            if (!pdf) throw new Error("PDF failed");
            const file = new File([pdf.output('blob')], `Ordem_${service.id.slice(0, 8)}.pdf`, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Comprovante', text: `Ordem #${service.id.slice(0, 8)}` });
            } else {
                pdf.save(`Ordem_${service.id.slice(0, 8)}.pdf`);
                const message = `Segue o comprovante da ordem #${service.id.slice(0, 8)}. (Arquivo baixado)`;
                let phone = client.phone.replace(/\D/g, '');
                if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
                const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            }
        } catch (error) { console.error(error); alert("Erro ao compartilhar."); } finally { setIsSharing(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:rounded-none print:w-full">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 print:hidden">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText size={20} className="text-blue-600" /> Visualizar Documento</h3>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadPDF} disabled={isGeneratingPdf || isSharing} className="px-3 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 text-xs font-bold">{isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Baixar</button>
                        <button onClick={handleShareWhatsApp} disabled={isSharing || isGeneratingPdf} className="px-3 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 text-xs font-bold">{isSharing ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} WhatsApp</button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><X size={20} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-900 print:bg-white print:p-0">
                    <div ref={invoiceRef} className="bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] p-12 text-slate-900 print:shadow-none print:m-0 print:w-full box-border relative">
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 uppercase">{myCompany.name}</h1>
                                <div className="text-xs text-slate-600 mt-2">{myCompany.cnpj && <p>CNPJ: {myCompany.cnpj}</p>}{myCompany.address && <p>{myCompany.address}</p>}</div>
                            </div>
                            <div className="text-right text-xs text-slate-600">
                                {myCompany.email && <p><Mail size={10} className="inline mr-1"/>{myCompany.email}</p>}
                                {myCompany.phone && <p><Phone size={10} className="inline mr-1"/>{myCompany.phone}</p>}
                                <div className="mt-4 font-bold text-lg">{new Date(service.date).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="bg-slate-100 border-l-4 border-slate-800 p-3 mb-8 flex justify-between items-center">
                            <span className="font-bold text-lg text-slate-800 uppercase">Ordem de Serviço</span>
                            <span className="font-mono text-xl font-bold text-slate-900">#{service.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="mb-8 space-y-6">
                            <div className="flex justify-between text-sm bg-slate-50 p-3 border border-slate-200">
                                <div><span className="text-slate-600 font-medium">Solicitante:</span> <span className="font-bold text-slate-900">{service.requesterName}</span></div>
                                <div><span className="text-slate-600 font-medium">Status:</span> <span className="font-bold uppercase">{service.paid ? 'Pago' : 'Pendente'}</span></div>
                            </div>
                            <div className="space-y-4">
                                <div><p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><MapPin size={12}/> Retirada</p><div className="pl-4 border-l-2 border-blue-200">{service.pickupAddresses.map((a,i)=><p key={i} className="text-sm font-medium">{a}</p>)}</div></div>
                                <div><p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1"><MapPin size={12}/> Entrega</p><div className="pl-4 border-l-2 border-emerald-200">{service.deliveryAddresses.map((a,i)=><p key={i} className="text-sm font-medium">{a}</p>)}</div></div>
                            </div>
                        </div>
                        <div className="mb-12 border-t border-slate-200 pt-4">
                            <div className="flex justify-end"><div className="w-1/2 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-slate-600">Serviço Base</span><span className="font-bold">R$ {service.cost.toFixed(2)}</span></div>
                                {(service.waitingTime || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Espera</span><span className="font-bold">R$ {service.waitingTime?.toFixed(2)}</span></div>}
                                {(service.extraFee || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Taxa Extra</span><span className="font-bold">R$ {service.extraFee?.toFixed(2)}</span></div>}
                                <div className="flex justify-between py-4 border-t border-slate-200 mt-2"><span className="text-lg font-bold">Total</span><span className="text-2xl font-bold">R$ {(service.cost + (service.waitingTime||0) + (service.extraFee||0)).toFixed(2)}</span></div>
                            </div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ClientDetails: React.FC<ClientDetailsProps> = ({ client, currentUser, onBack }) => {
    const [services, setServices] = useState<ServiceRecord[]>([]);

    useEffect(() => {
        getServicesByClient(client.id).then(setServices);
    }, [client.id]);
    const [activeTab, setActiveTab] = useState<'services' | 'financial'>('services');

    const [showForm, setShowForm] = useState(false);
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
    const [waitingTime, setWaitingTime] = useState(''); 
    const [extraFee, setExtraFee] = useState('');       
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [isPaid, setIsPaid] = useState(false);
    
    // Filter & Select
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // ... (Handlers) ...
    const handleAddAddress = (t: 'pickup' | 'delivery') => t === 'pickup' ? setPickupAddresses([...pickupAddresses, '']) : setDeliveryAddresses([...deliveryAddresses, '']);
    const handleRemoveAddress = (t: 'pickup' | 'delivery', i: number) => {
        if (t === 'pickup' && pickupAddresses.length > 1) setPickupAddresses(pickupAddresses.filter((_, idx) => idx !== i));
        else if (t === 'delivery' && deliveryAddresses.length > 1) setDeliveryAddresses(deliveryAddresses.filter((_, idx) => idx !== i));
    };
    const handleAddressChange = (t: 'pickup' | 'delivery', i: number, v: string) => {
        if (t === 'pickup') { const n = [...pickupAddresses]; n[i] = v; setPickupAddresses(n); }
        else { const n = [...deliveryAddresses]; n[i] = v; setDeliveryAddresses(n); }
    };
    
    const resetForm = () => {
        setPickupAddresses(['']); setDeliveryAddresses(['']); setCost(''); setDriverFee(''); setWaitingTime(''); setExtraFee(''); setRequester(''); setPaymentMethod('PIX'); setIsPaid(false); setServiceDate(getLocalDateStr(new Date())); setEditingServiceId(null); setShowForm(false);
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

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');
        if (cleanPickups.length === 0 || cleanDeliveries.length === 0) return toast.error("Preencha os endereços");

        const originalService = services.find(s => s.id === editingServiceId);
        const serviceData: ServiceRecord = {
            id: editingServiceId || crypto.randomUUID(),
            ownerId: '', clientId: client.id,
            pickupAddresses: cleanPickups, deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost) || 0, driverFee: parseFloat(driverFee) || 0,
            waitingTime: parseFloat(waitingTime) || 0, extraFee: parseFloat(extraFee) || 0,
            requesterName: requester, date: serviceDate,
            paid: isPaid, paymentMethod: paymentMethod,
            status: originalService ? originalService.status : 'PENDING'
        };

        if (editingServiceId) await updateService(serviceData);
        else await saveService(serviceData);

        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList);
        resetForm();
        toast.success(editingServiceId ? 'Atualizado!' : 'Criado!');
    };

    const confirmDeleteService = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast.success('Removido!');
            setServices(await getServicesByClient(client.id));
        } catch (e) { toast.error('Erro ao remover'); }
        finally { setIsDeleting(false); setServiceToDelete(null); }
    };

    const toggleSelectAll = () => setSelectedIds(selectedIds.size === services.length ? new Set() : new Set(services.map(s => s.id)));
    const toggleSelectRow = (id: string) => { const n = new Set(selectedIds); if(n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); };
    const handleTogglePayment = async (service: ServiceRecord) => {
        const updatedService = { ...service, paid: !service.paid };
        await updateService(updatedService);
        setServices(await getServicesByClient(client.id));
    };

    const handleBulkStatusChange = async (newStatus: boolean) => {
        const updates = services.filter(s => selectedIds.has(s.id)).map(s => ({ ...s, paid: newStatus }));
        await bulkUpdateServices(updates);
        setServices(await getServicesByClient(client.id));
        setSelectedIds(new Set());
    };

    // Filter Logic
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

    const isAllSelected = filteredServices.length > 0 && selectedIds.size === filteredServices.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredServices.length;

    // Export Logic placeholders
    const handleExportBoleto = () => toast.info('Exportar Boleto');
    const downloadCSV = () => toast.info('Baixar CSV');
    const exportExcel = (type: string) => toast.info('Exportar Excel');

    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {viewingService && <ServiceDocumentModal service={viewingService} client={client} currentUser={currentUser} onClose={() => setViewingService(null)} />}

            {serviceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm text-center">
                        <h3 className="font-bold text-lg mb-2 dark:text-white">Excluir Serviço?</h3>
                        <p className="text-sm text-slate-500 mb-6">Ação irreversível.</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setServiceToDelete(null)} className="px-4 py-2 border rounded-lg dark:text-white">Cancelar</button>
                            <button onClick={confirmDeleteService} className="px-4 py-2 bg-red-600 text-white rounded-lg">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium gap-1"><ArrowLeft size={20}/> Voltar</button>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{client.name}</h1>
                    <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                        {client.email && <span>{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                    </div>
                    <div className="flex gap-6 mt-6 border-b border-slate-200 dark:border-slate-700">
                        <button onClick={() => setActiveTab('services')} className={`pb-3 text-sm font-bold ${activeTab === 'services' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Serviços</button>
                        <button onClick={() => setActiveTab('financial')} className={`pb-3 text-sm font-bold ${activeTab === 'financial' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Financeiro</button>
                    </div>
                </div>
            </div>

            {activeTab === 'services' && (
                <>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Cancelar' : 'Nova Corrida'}
                        </button>
                    </div>

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
    
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="p-4 w-12"><button onClick={toggleSelectAll}>{isAllSelected ? <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" /> : <Square size={20} />}</button></th>
                        <th className="p-4 font-bold">Data</th>
                        <th className="p-4 font-bold">Rota</th>
                        <th className="p-4 font-bold">Solicitante</th>
                        <th className="p-4 font-bold text-right">Cobrado (Int)</th>
                        <th className="p-4 font-bold text-center">Status</th>
                        <th className="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredServices.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <td className="p-4"><button onClick={() => toggleSelectRow(s.id)}>{selectedIds.has(s.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}</button></td>
                            <td className="p-4">{new Date(s.date).toLocaleDateString()}</td>
                            <td className="p-4 max-w-xs truncate">{s.pickupAddresses[0]} {'->'} {s.deliveryAddresses[0]}</td>
                            <td className="p-4">{s.requesterName}</td>
                            <td className="p-4 text-right font-bold text-emerald-600">R$ {(s.cost + (s.waitingTime || 0)).toFixed(2)}</td>
                            <td className="p-4 text-center">{s.paid ? 'Pago' : 'Pendente'}</td>
                            <td className="p-4 text-center flex justify-center gap-2">
                                <button onClick={() => setViewingService(s)} className="text-slate-500 hover:text-blue-600"><FileText size={16}/></button>
                                <button onClick={() => handleEditService(s)} className="text-blue-500"><Pencil size={16}/></button>
                                <button onClick={() => setServiceToDelete(s)} className="text-red-500"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    </>
    )}
    </div>
  );
};
