import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User, ServiceLog } from '../types';
import { 
    saveService, 
    updateService, 
    getServicesByClient, 
    bulkUpdateServices, 
    deleteService, 
    restoreService, 
    getServiceLogs,
    saveClient
} from '../services/storageService';
import { 
    ArrowLeft, Plus, Calendar, MapPin, Filter, FileSpreadsheet, X, Bike, ChevronDown, 
    FileText, ShieldCheck, Pencil, DollarSign, CheckCircle, AlertCircle, PieChart, List, 
    CheckSquare, Square, MoreHorizontal, User as UserIcon, Building, MinusSquare, Share2, 
    Phone, Mail, Banknote, QrCode, CreditCard, MessageCircle, Loader2, Download, Table, 
    FileDown, Package, Clock, XCircle, Activity, Trash2, AlertTriangle, FileCheck, Timer, 
    Hash, Copy, RotateCcw, Archive, History, UserPlus, Users
} from 'lucide-react';
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

// --- MODAL DE HISTÓRICO ---
const ServiceHistoryModal = ({ service, onClose }: { service: ServiceRecord; onClose: () => void }) => {
    const [logs, setLogs] = useState<ServiceLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getServiceLogs(service.id).then(data => {
            setLogs(data);
            setLoading(false);
        });
    }, [service.id]);

    const formatChangeValue = (val: any) => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'number') return `R$ ${val.toFixed(2)}`;
        if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
        return String(val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-up">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History size={20} className="text-blue-600" />
                        Histórico de Alterações
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="text-center p-8 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">Nenhum registro de alteração encontrado.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-slate-200 dark:border-slate-700 last:border-0">
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                                    log.action === 'CRIACAO' ? 'bg-emerald-500' :
                                    log.action === 'EXCLUSAO' ? 'bg-red-500' :
                                    log.action === 'RESTAURACAO' ? 'bg-blue-500' :
                                    'bg-amber-500'
                                }`}></div>
                                
                                <div className="text-xs text-slate-400 mb-1">
                                    {new Date(log.createdAt).toLocaleString()} por <strong>{log.userName}</strong>
                                </div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                                    {log.action === 'CRIACAO' ? 'Serviço Criado' :
                                     log.action === 'EXCLUSAO' ? 'Serviço Excluído' :
                                     log.action === 'RESTAURACAO' ? 'Serviço Restaurado' :
                                     'Alteração Realizada'}
                                </div>
                                
                                {log.changes && Object.keys(log.changes).length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-xs space-y-1">
                                            {Object.entries(log.changes).map(([field, vals]: any) => (
                                                field !== 'info' && (
                                                    <div key={field} className="flex gap-2">
                                                        <span className="font-semibold text-slate-600 dark:text-slate-300">{field}:</span>
                                                        <span className="text-red-500 line-through">{formatChangeValue(vals.old)}</span>
                                                        <span className="text-slate-400">&rarr;</span>
                                                        <span className="text-emerald-600 font-bold">{formatChangeValue(vals.new)}</span>
                                                    </div>
                                                )
                                            ))}
                                            {log.changes.info && <div className="italic text-slate-500">{log.changes.info}</div>}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODAL DE GESTÃO DE SOLICITANTES ---
const RequestersModal = ({ client, onClose, onUpdate }: { client: Client; onClose: () => void; onUpdate: (c: Client) => void }) => {
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newName.trim()) return;
        
        const currentList = client.requesters || [];
        if(currentList.includes(newName.trim())) {
            toast.error("Nome já existe na lista.");
            return;
        }

        setLoading(true);
        const updatedClient = { ...client, requesters: [...currentList, newName.trim()] };
        await saveClient(updatedClient);
        onUpdate(updatedClient);
        setNewName('');
        setLoading(false);
        toast.success("Adicionado!");
    };

    const handleRemove = async (name: string) => {
        if(!confirm(`Remover "${name}"?`)) return;
        setLoading(true);
        const updatedClient = { ...client, requesters: (client.requesters || []).filter(r => r !== name) };
        await saveClient(updatedClient);
        onUpdate(updatedClient);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users size={20} className="text-blue-600" />
                        Gerenciar Solicitantes
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Adicione nomes de pessoas autorizadas a solicitar serviços para esta empresa.
                    </p>
                    
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input 
                            className="flex-1 p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nome do solicitante..."
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {/* Responsável Principal (Fixo) */}
                        {client.contactPerson && (
                            <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">{client.contactPerson} <span className="text-[10px] opacity-70">(Principal)</span></span>
                            </div>
                        )}
                        {/* Lista Adicional */}
                        {client.requesters?.map((req, i) => (
                            req !== client.contactPerson && (
                                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-600">
                                    <span className="text-sm text-slate-700 dark:text-slate-200">{req}</span>
                                    <button onClick={() => handleRemove(req)} className="text-red-500 hover:bg-red-100 p-1 rounded" disabled={loading}><Trash2 size={14} /></button>
                                </div>
                            )
                        ))}
                        {(!client.requesters || client.requesters.length === 0) && !client.contactPerson && (
                            <p className="text-center text-sm text-slate-400 py-4">Nenhum solicitante cadastrado.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODAL DE DOCUMENTO ---
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
            if (pdf) {
                const fileId = service.manualOrderId || 'sem_id';
                pdf.save(`Ordem_${fileId}.pdf`);
            }
        } catch (error) { alert("Erro ao gerar PDF."); } finally { setIsGeneratingPdf(false); }
    };

    const handleShareWhatsApp = async () => {
        if (isSharing || isGeneratingPdf) return;
        setIsSharing(true);
        try {
            const pdf = await generatePDF();
            if (!pdf) throw new Error("PDF generation failed");
            const fileId = service.manualOrderId || 'sem_id';
            const fileName = `Ordem_${fileId}.pdf`;
            const file = new File([pdf.output('blob')], fileName, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Comprovante', text: `Ordem ${service.manualOrderId}` });
            } else {
                pdf.save(fileName);
                const message = `Segue o comprovante da ordem ${service.manualOrderId}. (Baixado no dispositivo)`;
                let phone = client.phone.replace(/\D/g, '');
                if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
                const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            }
        } catch (error) { alert("Erro ao compartilhar."); } finally { setIsSharing(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:rounded-none print:w-full">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 print:hidden">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" /> Visualizar Documento
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadPDF} disabled={isGeneratingPdf || isSharing} className="px-3 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 text-xs font-bold">{isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF</button>
                        <button onClick={handleShareWhatsApp} disabled={isSharing || isGeneratingPdf} className="px-3 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 text-xs font-bold">{isSharing ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Zap</button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-900 print:bg-white print:p-0">
                    <div ref={invoiceRef} className="bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] p-12 text-slate-900 print:shadow-none print:m-0 print:w-full box-border relative">
                        <div className="flex justify-between border-b-2 border-slate-800 pb-6 mb-6">
                            <div><h1 className="text-3xl font-bold uppercase">{myCompany.name}</h1><p>CNPJ: {myCompany.cnpj}</p></div>
                            <div className="text-right"><p>{new Date(service.date).toLocaleDateString()}</p></div>
                        </div>
                        <div className="bg-slate-100 border-l-4 border-slate-800 p-3 mb-8"><span className="font-bold text-lg">ORDEM: #{service.manualOrderId}</span></div>
                        <div className="space-y-4 mb-8">
                            <p><strong>Solicitante:</strong> {service.requesterName}</p>
                            <div className="pl-4 border-l-2 border-blue-200">{service.pickupAddresses.map((a,i)=><p key={i}>Retirada: {a}</p>)}</div>
                            <div className="pl-4 border-l-2 border-emerald-200">{service.deliveryAddresses.map((a,i)=><p key={i}>Entrega: {a}</p>)}</div>
                        </div>
                        <div className="text-right text-xl font-bold mt-12">Total: R$ {(service.cost + (service.waitingTime||0) + (service.extraFee||0)).toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ClientDetails: React.FC<ClientDetailsProps> = ({ client: initialClient, currentUser, onBack }) => {
    const [client, setClient] = useState(initialClient);
    
    const topRef = useRef<HTMLDivElement>(null);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    
    // Estados Especiais
    const [showTrash, setShowTrash] = useState(false);
    const [viewingHistoryService, setViewingHistoryService] = useState<ServiceRecord | null>(null);
    const [showRequestersModal, setShowRequestersModal] = useState(false);

    useEffect(() => {
        getServicesByClient(client.id).then((data) => setServices(data));
    }, [client.id, showTrash]);

    const [activeTab, setActiveTab] = useState<'services' | 'financial'>('services');
    const [showForm, setShowForm] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [serviceDate, setServiceDate] = useState(getLocalDateStr(new Date()));
    const [manualOrderId, setManualOrderId] = useState('');
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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleAddAddress = (type: 'pickup' | 'delivery') => type === 'pickup' ? setPickupAddresses([...pickupAddresses, '']) : setDeliveryAddresses([...deliveryAddresses, '']);
    const handleRemoveAddress = (type: 'pickup' | 'delivery', index: number) => type === 'pickup' ? setPickupAddresses(pickupAddresses.filter((_, i) => i !== index)) : setDeliveryAddresses(deliveryAddresses.filter((_, i) => i !== index));
    const handleAddressChange = (type: 'pickup' | 'delivery', index: number, value: string) => {
        if (type === 'pickup') { const n = [...pickupAddresses]; n[index] = value; setPickupAddresses(n); } 
        else { const n = [...deliveryAddresses]; n[index] = value; setDeliveryAddresses(n); }
    };

    const handleEditService = (service: ServiceRecord) => {
        setEditingServiceId(service.id);
        setServiceDate(service.date.includes('T') ? service.date.split('T')[0] : service.date);
        setManualOrderId(service.manualOrderId || ''); 
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
        setTimeout(() => { if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    };

    const handleDuplicateService = async (originalService: ServiceRecord) => {
        if(!window.confirm(`Deseja repetir o serviço de "${originalService.requesterName}" para a data de HOJE?`)) return;
        try {
            const newService: ServiceRecord = { ...originalService, id: crypto.randomUUID(), date: getLocalDateStr(new Date()), paid: false, status: 'PENDING', manualOrderId: '' };
            await saveService(newService);
            toast.success('Serviço copiado para hoje!');
            setServices(await getServicesByClient(client.id));
        } catch (error) { toast.error('Erro ao copiar.'); }
    };

    const handleRestoreService = async (service: ServiceRecord) => {
        if (confirm("Restaurar serviço?")) {
             await restoreService(service.id);
             toast.success("Serviço restaurado.");
             setServices(await getServicesByClient(client.id));
        }
    };

    const confirmDeleteService = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast.success('Serviço movido para lixeira.');
            setServices(await getServicesByClient(client.id));
        } catch (error) { toast.error('Erro ao remover.'); } 
        finally { setIsDeleting(false); setServiceToDelete(null); }
    };

    const handleTogglePayment = async (service: ServiceRecord) => {
        await updateService({ ...service, paid: !service.paid });
        setServices(await getServicesByClient(client.id));
    };

    const resetForm = () => {
        setPickupAddresses(['']); setDeliveryAddresses(['']); setCost(''); setDriverFee(''); setWaitingTime(''); setExtraFee('');
        setRequester(''); setPaymentMethod('PIX'); setIsPaid(false); setManualOrderId(''); 
        setServiceDate(getLocalDateStr(new Date())); setEditingServiceId(null); setShowForm(false);
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPickups = pickupAddresses.filter(a => a.trim());
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim());
        if (!cleanPickups.length || !cleanDeliveries.length) { alert('Preencha os endereços.'); return; }

        const serviceData: any = {
            id: editingServiceId || crypto.randomUUID(),
            ownerId: '', clientId: client.id,
            pickupAddresses: cleanPickups, deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost), driverFee: parseFloat(driverFee) || 0,
            waitingTime: parseFloat(waitingTime) || 0, extraFee: parseFloat(extraFee) || 0,
            manualOrderId: manualOrderId.trim(), requesterName: requester,
            date: serviceDate, paid: isPaid, paymentMethod: paymentMethod, status: 'PENDING'
        };

        editingServiceId ? await updateService(serviceData) : await saveService(serviceData);
        setServices(await getServicesByClient(client.id));
        resetForm();
    };

    // Filters & Helpers
    const setDateRange = (t: any) => {
        const now = new Date(); const end = getLocalDateStr(now); let start = end;
        if(t==='week') { const d=new Date(); d.setDate(d.getDate()-d.getDay()); start=getLocalDateStr(d); }
        if(t==='month') { const d=new Date(); d.setDate(1); start=getLocalDateStr(d); }
        setStartDate(start); setEndDate(end);
    };

    const filteredServices = useMemo(() => {
        let f = services;
        f = showTrash ? f.filter(s => !!s.deletedAt) : f.filter(s => !s.deletedAt);
        if (startDate && endDate) f = f.filter(s => { const d = s.date.split('T')[0]; return d >= startDate && d <= endDate; });
        if (statusFilter === 'PAID') f = f.filter(s => s.paid);
        if (statusFilter === 'PENDING') f = f.filter(s => !s.paid);
        return f.sort((a, b) => b.date.localeCompare(a.date));
    }, [services, showTrash, startDate, endDate, statusFilter]);

    useEffect(() => { setSelectedIds(new Set()); }, [filteredServices]);
    const toggleSelectAll = () => setSelectedIds(new Set(selectedIds.size === filteredServices.length ? [] : filteredServices.map(s => s.id)));
    const toggleSelectRow = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
    
    const handleBulkStatusChange = async (newStatus: boolean) => {
        if (!selectedIds.size) return;
        await bulkUpdateServices(services.filter(s => selectedIds.has(s.id)).map(s => ({ ...s, paid: newStatus })));
        setServices(await getServicesByClient(client.id)); setSelectedIds(new Set());
    };

    const stats = useMemo(() => ({
        totalPaid: filteredServices.filter(s => s.paid).reduce((s, c) => s + c.cost + (c.waitingTime||0), 0),
        totalPending: filteredServices.filter(s => !s.paid).reduce((s, c) => s + c.cost + (c.waitingTime||0), 0),
        revenueByMethod: filteredServices.reduce((a, c) => { const m = c.paymentMethod||'PIX'; a[m]=(a[m]||0)+c.cost+(c.waitingTime||0); return a; }, {} as any)
    }), [filteredServices]);

    // --- FUNÇÃO DE RELATÓRIO (PDF LISTA) ---
    const handleExportListPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18); doc.setTextColor(40);
        doc.text(currentUser.companyName || 'Extrato de Serviços', 14, 20);
        doc.setFontSize(10); doc.setTextColor(100);
        const subtitle = `Cliente: ${client.name} | Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        doc.text(subtitle, 14, 28);
        doc.setDrawColor(200); doc.line(14, 32, 196, 32);
        doc.text(`Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`, 14, 40);
        doc.text(`Total Pago: R$ ${stats.totalPaid.toFixed(2)}`, 14, 46);
        doc.text(`Total Pendente: R$ ${stats.totalPending.toFixed(2)}`, 14, 52);

        const tableColumn = ["Data", "Rota", "Solicitante", "Status", "Valor (R$)"];
        const tableRows = filteredServices.map(s => {
            const internalTotal = s.cost + (s.waitingTime || 0);
            const route = `${s.pickupAddresses[0]?.split(',')[0]} -> ${s.deliveryAddresses[0]?.split(',')[0]}`;
            return [ new Date(s.date + 'T00:00:00').toLocaleDateString(), route.substring(0, 35), s.requesterName, s.paid ? 'PAGO' : 'PENDENTE', `R$ ${internalTotal.toFixed(2)}` ];
        });

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 60, styles: { fontSize: 8 }, headStyles: { fillColor: [41, 128, 185] } });
        doc.save(`extrato_${client.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    };

    const isAllSelected = filteredServices.length > 0 && selectedIds.size === filteredServices.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredServices.length;
    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    return (
        <div ref={topRef} className="space-y-6 animate-fade-in relative">
            {serviceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
                    <div className="bg-white p-6 rounded-lg text-center">
                        <p>Excluir serviço?</p>
                        <div className="flex gap-2 justify-center mt-4">
                            <button onClick={confirmDeleteService} className="bg-red-500 text-white px-4 py-2 rounded">Sim</button>
                            <button onClick={() => setServiceToDelete(null)} className="bg-slate-200 px-4 py-2 rounded">Não</button>
                        </div>
                    </div>
                </div>
            )}

            {viewingService && <ServiceDocumentModal service={viewingService} client={client} currentUser={currentUser} onClose={() => setViewingService(null)} />}
            {viewingHistoryService && <ServiceHistoryModal service={viewingHistoryService} onClose={() => setViewingHistoryService(null)} />}
            {showRequestersModal && <RequestersModal client={client} onClose={() => setShowRequestersModal(false)} onUpdate={setClient} />}

            {/* Header */}
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2"><ArrowLeft /> Voltar</button>
                {currentUser.role === 'ADMIN' && (
                    <button onClick={() => setShowTrash(!showTrash)} className={`px-3 py-1 rounded border transition-colors ${showTrash ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-slate-700 border-slate-200'}`}>
                        {showTrash ? 'Ver Ativos' : 'Ver Lixeira'}
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {client.name}
                            {showTrash && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md border border-red-200 uppercase">Lixeira</span>}
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-600">{client.category}</span>
                            
                            {/* BOTÃO PARA ABRIR MODAL DE SOLICITANTES (DISCRETO) */}
                            <button onClick={() => setShowRequestersModal(true)} className="ml-2 text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors" title="Gerenciar Solicitantes">
                                <UserPlus size={20} />
                            </button>
                        </h1>
                        {client.cnpj && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2"><Building size={14} /> CNPJ: {client.cnpj}</p>
                        )}
                        <div className="flex flex-col gap-2 mt-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                            <div className="flex flex-wrap gap-4 md:gap-6">
                                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>{client.email}</span>
                                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>{client.phone}</span>
                            </div>
                            {(client.address || client.contactPerson) && (
                                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                                    {client.contactPerson && (
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><UserIcon size={14} className="text-blue-500" /><span className="font-bold">Responsável Principal:</span> {client.contactPerson}</div>
                                    )}
                                    {client.address && (
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><MapPin size={14} className="text-emerald-500" /><span className="font-bold">Endereço:</span> {client.address}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 mt-6 border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('services')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'services' ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        <div className="flex items-center gap-2"><List size={16} /> Serviços & Cadastro</div>
                    </button>
                    <button onClick={() => setActiveTab('financial')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'financial' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700 dark:border-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        <div className="flex items-center gap-2"><PieChart size={16} /> Relatório Financeiro</div>
                    </button>
                </div>
            </div>

            {activeTab === 'services' && (
                <>
                    <div className="flex justify-end">
                        <button onClick={() => { if(showForm) resetForm(); else setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold shadow-sm">
                            {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Cancelar' : 'Nova Corrida'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleSaveService} className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-700 space-y-6 animate-slide-down">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-700 pb-4 gap-4">
                                <h3 className="font-bold text-white text-lg">{editingServiceId ? 'Editar Corrida' : 'Registrar Nova Corrida'}</h3>
                                <div className="flex gap-4 w-full sm:w-auto">
                                    <div className="w-1/2 sm:w-32">
                                        <label className="text-xs text-slate-400 block mb-1 font-bold">Nº Pedido (Op.)</label>
                                        <div className="relative">
                                            <Hash size={14} className="absolute left-2 top-2 text-slate-500" />
                                            <input type="text" className="w-full pl-7 p-1 bg-slate-800 text-white border border-slate-600 rounded text-sm focus:border-blue-500 outline-none uppercase" value={manualOrderId} onChange={e => setManualOrderId(e.target.value)} placeholder="1234..." />
                                        </div>
                                    </div>
                                    <div className="w-1/2 sm:w-auto text-right">
                                        <label className="text-xs text-slate-400 block mb-1 font-bold">Data</label>
                                        <div className="relative"><input type="date" className="p-1 bg-slate-800 text-white border border-slate-600 rounded text-sm" value={serviceDate} onChange={e => setServiceDate(e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2 p-3 bg-blue-900/10 rounded border border-blue-900/30">
                                    <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta</h3>
                                    {pickupAddresses.map((addr, i) => (
                                        <div key={i} className="relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                            <input className="w-full pl-9 pr-32 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm focus:border-blue-500 outline-none" value={addr} onChange={e=>handleAddressChange('pickup', i, e.target.value)} placeholder="Endereço" />
                                            {client.address && (
                                                <button type="button" onClick={() => handleAddressChange('pickup', i, client.address||'')} className="absolute right-8 top-1.5 text-xs bg-blue-600 px-2 py-1 rounded flex items-center gap-1 text-white border border-blue-400 hover:bg-blue-500" title="Usar endereço do cadastro">
                                                    <Building size={12} /> Endereço Cliente
                                                </button>
                                            )}
                                            {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', i)} className="absolute right-2 top-2.5"><X size={16} className="text-red-400" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs font-bold text-blue-400 flex items-center gap-1 mt-1"><Plus size={14} /> Adicionar Parada</button>
                                </div>
                                <div className="space-y-2 p-3 bg-emerald-900/10 rounded border border-emerald-900/30">
                                    <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrega</h3>
                                    {deliveryAddresses.map((addr, i) => (
                                        <div key={i} className="relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                                            <input className="w-full pl-9 pr-32 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm focus:border-emerald-500 outline-none" value={addr} onChange={e=>handleAddressChange('delivery', i, e.target.value)} placeholder="Endereço" />
                                            {client.address && (
                                                <button type="button" onClick={() => handleAddressChange('delivery', i, client.address||'')} className="absolute right-8 top-1.5 text-xs bg-emerald-600 px-2 py-1 rounded flex items-center gap-1 text-white border border-emerald-400 hover:bg-emerald-500" title="Usar endereço do cadastro">
                                                    <Building size={12} /> Endereço Cliente
                                                </button>
                                            )}
                                            {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', i)} className="absolute right-2 top-2.5"><X size={16} className="text-red-400" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1"><Plus size={14} /> Adicionar Parada</button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-700">
                                <h3 className="font-bold text-white mb-4 text-sm border-b border-slate-700 pb-2">Financeiro e Adicionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                                        <input required type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-emerald-500 outline-none" value={cost} onChange={e => setCost(e.target.value)} placeholder="Valor (R$)" />
                                    </div>
                                    <div className="relative">
                                        <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                        <input required type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-red-500 outline-none" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="Motoboy (R$)" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="relative"><Timer size={14} className="absolute left-3 top-3 text-slate-500" /><input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="Espera (R$)" /></div>
                                    <div className="relative"><DollarSign size={14} className="absolute left-3 top-3 text-slate-500" /><input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="Taxa Extra (R$)" /></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Solicitante</label>
                                    <input required className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome" />
                                    {/* --- PREENCHIMENTO RÁPIDO --- */}
                                    {(client.requesters && client.requesters.length > 0) && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="text-[10px] text-slate-400 w-full">Preencher rápido:</span>
                                            {client.requesters.map((req, i) => (
                                                <button 
                                                    key={i} 
                                                    type="button" 
                                                    onClick={() => setRequester(req)}
                                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-600 transition-colors"
                                                >
                                                    {req}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border border-slate-700 rounded-xl"><div className="grid grid-cols-3 gap-2">{(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(m => (<button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex items-center justify-center py-2 rounded-lg border text-xs font-bold ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}>{m}</button>))}</div></div>
                            </div>
                            
                            <div className="p-4 border border-slate-700 rounded-xl flex items-center justify-center">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>{isPaid && <CheckCircle size={14} className="text-white" />}</div>
                                    <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                    <span className="text-sm font-bold text-slate-300">Status: {isPaid ? 'Pago' : 'Pendente'}</span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button type="button" onClick={resetForm} className="px-4 py-2 font-bold text-slate-600 hover:text-white">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    )}
                </>
            )}

            {/* Filter Bar (Shared) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-1 w-full sm:w-auto items-center">
                        <div className="flex gap-1">
                            <button onClick={() => setDateRange('today')} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold">Hoje</button>
                            <button onClick={() => setDateRange('month')} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold">Mês</button>
                        </div>
                        {/* BOTÃO EXPORTAR */}
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
                        <button 
                            onClick={handleExportListPDF} 
                            disabled={isGeneratingPdf}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-70"
                        >
                            {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} 
                            Exportar Relatório
                        </button>
                    </div>
                </div>

                {/* TAB 2: FINANCIAL */}
                {activeTab === 'financial' && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-l-4 border-l-emerald-500">
                                <p className="text-xs font-bold uppercase text-slate-500">Recebido</p>
                                <p className="text-2xl font-bold text-emerald-600">R$ {stats.totalPaid.toFixed(2)}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-l-4 border-l-amber-500">
                                <p className="text-xs font-bold uppercase text-slate-500">Pendente</p>
                                <p className="text-2xl font-bold text-amber-600">R$ {stats.totalPending.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabela de Serviços */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 w-12"><button onClick={toggleSelectAll} className="text-slate-400">{isAllSelected ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}</button></th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white">Data</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white">Rota</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white">Solicitante</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white text-right">Cobrado (Int)</th>
                                {activeTab === 'services' && <><th className="p-4 font-bold text-slate-800 dark:text-white text-right">Motoboy</th><th className="p-4 font-bold text-slate-800 dark:text-white text-right">Lucro</th></>}
                                <th className="p-4 font-bold text-slate-800 dark:text-white text-center">Método</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white text-center">Pagamento</th>
                                <th className="p-4 text-center w-24 font-bold text-slate-800 dark:text-white">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredServices.length === 0 ? (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-500">Nada encontrado.</td></tr>
                            ) : (
                                filteredServices.map(s => {
                                    const internalTotal = s.cost + (s.waitingTime || 0);
                                    const profit = internalTotal - (s.driverFee || 0);
                                    const isSelected = selectedIds.has(s.id);
                                    return (
                                        <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/70 dark:bg-blue-900/10' : ''}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return; setViewingService(s); }}>
                                            <td className="p-4 align-top"><button onClick={(e) => { e.stopPropagation(); toggleSelectRow(s.id); }} className="text-slate-400 hover:text-blue-600">{isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}</button></td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" />{new Date(s.date + 'T00:00:00').toLocaleDateString()}</div>
                                                {s.manualOrderId && <span className="text-[10px] text-blue-500 font-bold mt-1 uppercase">#{s.manualOrderId}</span>}
                                            </td>
                                            <td className="p-4 max-w-xs align-top">
                                                <div className="flex flex-col gap-2">
                                                    {s.pickupAddresses.map((a, i) => <div key={i} className="flex items-start gap-2 text-slate-800 dark:text-white font-medium"><div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div><span className="text-xs">{a}</span></div>)}
                                                    {s.deliveryAddresses.map((a, i) => <div key={i} className="flex items-start gap-2 text-slate-800 dark:text-white font-medium"><div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div><span className="text-xs">{a}</span></div>)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{s.requesterName}</td>
                                            <td className="p-4 text-right font-bold text-emerald-700 dark:text-emerald-400">R$ {internalTotal.toFixed(2)}</td>
                                            {activeTab === 'services' && (
                                                <>
                                                    <td className="p-4 text-right font-bold text-red-600 dark:text-red-400">R$ {s.driverFee?.toFixed(2) || '0.00'}</td>
                                                    <td className={`p-4 text-right font-bold ${profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>R$ {profit.toFixed(2)}</td>
                                                </>
                                            )}
                                            <td className="p-4 text-center"><div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300">{getPaymentIcon(s.paymentMethod)}{getPaymentMethodLabel(s.paymentMethod)}</div></td>
                                            <td className="p-4 text-center">
                                                <button onClick={(e) => { e.stopPropagation(); handleTogglePayment(s); }} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${s.paid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'}`}>
                                                    {s.paid ? 'PAGO' : 'PENDENTE'}
                                                </button>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex gap-1 justify-end">
                                                    {showTrash ? (
                                                        <button onClick={(e) => { e.stopPropagation(); handleRestoreService(s); }} className="text-emerald-500 hover:bg-emerald-50 p-2 rounded"><RotateCcw size={18} /></button>
                                                    ) : (
                                                        <>
                                                            {currentUser.role === 'ADMIN' && (
                                                                <button onClick={(e) => { e.stopPropagation(); setViewingHistoryService(s); }} className="text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 p-2 rounded-lg transition-colors" title="Histórico"><History size={18} /></button>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicateService(s); }} className="text-slate-500 hover:text-emerald-600 p-2 rounded"><Copy size={18} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); setViewingService(s); }} className="text-slate-500 hover:text-blue-600 p-2 rounded"><FileText size={18} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleEditService(s); }} className="text-slate-500 hover:text-blue-600 p-2 rounded"><Pencil size={18} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); setServiceToDelete(s); }} className="text-slate-500 hover:text-red-600 p-2 rounded"><Trash2 size={18} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
