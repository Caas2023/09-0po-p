import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
import { saveService, updateService, getServicesByClient, bulkUpdateServices, deleteService } from '../services/storageService';
import { ArrowLeft, Plus, Calendar, MapPin, Filter, FileSpreadsheet, X, Bike, ChevronDown, FileText, ShieldCheck, Pencil, DollarSign, CheckCircle, AlertCircle, PieChart, List, CheckSquare, Square, MoreHorizontal, User as UserIcon, Building, MinusSquare, Share2, Phone, Mail, Banknote, QrCode, CreditCard, MessageCircle, Loader2, Download, Table, FileDown, Package, Clock, XCircle, Activity, Trash2, AlertTriangle, FileCheck, Timer, Hash } from 'lucide-react';
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

// Interface estendida localmente
interface ExtendedServiceRecord extends ServiceRecord {
    manualOrderId?: string;
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

// --- Service Document Modal Component ---
export const ServiceDocumentModal = ({ service, client, currentUser, onClose }: { service: ExtendedServiceRecord; client: Client; currentUser: User; onClose: () => void }) => {
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

        const canvas = await html2canvas(invoiceRef.current, {
            scale: 2, 
            backgroundColor: '#ffffff',
            useCORS: true, 
            logging: false,
        });

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
                // Nome do arquivo usando o ID manual se existir
                const fileId = service.manualOrderId || 'sem_id';
                pdf.save(`Ordem_${fileId}.pdf`);
            }
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Erro ao gerar o PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
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
                await navigator.share({
                    files: [file],
                    title: 'Comprovante de Serviço',
                    text: `Segue o comprovante da ordem ${service.manualOrderId ? '#' + service.manualOrderId : ''} - ${client.name}`,
                });
            } else {
                pdf.save(fileName);
                const message = `Segue o comprovante da ordem ${service.manualOrderId ? '#' + service.manualOrderId : '(Sem ID)'}. (O arquivo PDF foi baixado no seu dispositivo)`;
                let phone = client.phone.replace(/\D/g, '');
                if (phone.length >= 10 && phone.length <= 11) {
                    phone = `55${phone}`;
                }

                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                let url = isMobile 
                    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
                    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

                window.open(url, '_blank');
            }
        } catch (error) {
            console.error("Error generating or sharing PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:rounded-none print:w-full">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 print:hidden">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Visualizar Documento
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadPDF} disabled={isGeneratingPdf || isSharing} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 text-xs sm:text-sm font-bold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait">
                            {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            <span className="hidden sm:inline">Baixar PDF</span>
                        </button>
                        <button onClick={handleShareWhatsApp} disabled={isSharing || isGeneratingPdf} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-xs sm:text-sm font-bold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait">
                            {isSharing ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-900 print:bg-white print:p-0 print:overflow-visible">
                    <div ref={invoiceRef} className="bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] p-12 text-slate-900 print:shadow-none print:m-0 print:w-full box-border relative">
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight mb-2">{myCompany.name}</h1>
                                <div className="text-xs text-slate-600 space-y-1 font-medium">
                                    {myCompany.cnpj && <p className="font-mono tracking-wide">CNPJ: {myCompany.cnpj}</p>}
                                    {myCompany.address && <p>{myCompany.address}</p>}
                                </div>
                            </div>
                            <div className="text-right text-xs text-slate-600 space-y-1">
                                {myCompany.email && <div className="flex items-center justify-end gap-2"><Mail size={12} /> {myCompany.email}</div>}
                                {myCompany.phone && <div className="flex items-center justify-end gap-2"><Phone size={12} /> {myCompany.phone}</div>}
                                <div className="mt-4 font-bold text-slate-900 text-lg">{new Date(service.date).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="bg-slate-100 border-l-4 border-slate-800 p-3 mb-8 flex justify-between items-center">
                            <span className="font-bold text-lg text-slate-800 uppercase">Ordem de Serviço</span>
                            {/* CORREÇÃO: Removido fallback automático */}
                            <span className="font-mono text-xl font-bold text-slate-900">
                                {service.manualOrderId ? `#${service.manualOrderId.toUpperCase()}` : ''}
                            </span>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mb-3 pb-1">Detalhes do Serviço</h2>
                            <div className="space-y-6">
                                <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-md print:bg-transparent print:p-0 border border-slate-200 print:border-none">
                                    <div><span className="text-slate-600 font-medium">Solicitado por:</span><span className="ml-2 font-bold text-slate-900">{service.requesterName}</span></div>
                                    <div><span className="text-slate-600 font-medium">Pagamento:</span><span className={`ml-2 font-bold uppercase ${service.paid ? 'text-emerald-700' : 'text-amber-700'}`}>{service.paid ? 'Pago' : 'Pendente'}</span></div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><MapPin size={12} /> Retirada(s)</p>
                                        <div className="pl-4 border-l-2 border-blue-200 space-y-2">
                                            {service.pickupAddresses.map((addr, i) => <p key={i} className="text-sm text-slate-800 font-medium">{addr}</p>)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1"><MapPin size={12} /> Entrega(s)</p>
                                        <div className="pl-4 border-l-2 border-emerald-200 space-y-2">
                                            {service.deliveryAddresses.map((addr, i) => <p key={i} className="text-sm text-slate-800 font-medium">{addr}</p>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="mb-12">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mb-3 pb-1">Valores</h2>
                            <div className="flex justify-end">
                                <div className="w-1/2 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Serviço</span>
                                        <span className="text-sm font-bold text-slate-900">R$ {service.cost.toFixed(2)}</span>
                                    </div>
                                    {service.waitingTime && service.waitingTime > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-600">Espera</span>
                                            <span className="text-sm font-bold text-slate-900">R$ {service.waitingTime.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {service.extraFee && service.extraFee > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-600">Taxa Extra</span>
                                            <span className="text-sm font-bold text-slate-900">R$ {service.extraFee.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-4 border-t border-slate-200 mt-2">
                                        <span className="text-lg font-bold text-slate-900">Total</span>
                                        <span className="text-2xl font-bold text-slate-900">
                                            R$ {(service.cost + (service.waitingTime || 0) + (service.extraFee || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const ClientDetails: React.FC<ClientDetailsProps> = ({ client, currentUser, onBack }) => {
    // Cast para ExtendedServiceRecord para usar o novo campo na lista
    const [services, setServices] = useState<ExtendedServiceRecord[]>([]);

    useEffect(() => {
        getServicesByClient(client.id).then((data: ServiceRecord[]) => setServices(data as ExtendedServiceRecord[]));
    }, [client.id]);
    const [activeTab, setActiveTab] = useState<'services' | 'financial'>('services');

    const [showForm, setShowForm] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [viewingService, setViewingService] = useState<ExtendedServiceRecord | null>(null);

    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<ExtendedServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [serviceDate, setServiceDate] = useState(getLocalDateStr(new Date()));
    const [manualOrderId, setManualOrderId] = useState(''); // Estado para o ID manual
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    
    // Financeiro
    const [cost, setCost] = useState(''); 
    const [driverFee, setDriverFee] = useState(''); 
    const [waitingTime, setWaitingTime] = useState(''); 
    const [extraFee, setExtraFee] = useState('');       
    
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [isPaid, setIsPaid] = useState(false);
    
    // Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleAddAddress = (type: 'pickup' | 'delivery') => {
        if (type === 'pickup') {
            setPickupAddresses([...pickupAddresses, '']);
        } else {
            setDeliveryAddresses([...deliveryAddresses, '']);
        }
    };

    const handleRemoveAddress = (type: 'pickup' | 'delivery', index: number) => {
        if (type === 'pickup') {
            if (pickupAddresses.length > 1) {
                setPickupAddresses(pickupAddresses.filter((_, i) => i !== index));
            }
        } else {
            if (deliveryAddresses.length > 1) {
                setDeliveryAddresses(deliveryAddresses.filter((_, i) => i !== index));
            }
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

    const handleEditService = (service: ExtendedServiceRecord) => {
        setEditingServiceId(service.id);
        setServiceDate(service.date.includes('T') ? service.date.split('T')[0] : service.date);
        
        // --- AQUI CARREGAMOS O VALOR EXISTENTE DO BANCO ---
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
    };

    const confirmDeleteService = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast.success('Serviço removido com sucesso.');
            const updatedList = await getServicesByClient(client.id);
            setServices(updatedList as ExtendedServiceRecord[]);
        } catch (error) {
            toast.error('Erro ao remover serviço.');
            console.error(error);
        } finally {
            setIsDeleting(false);
            setServiceToDelete(null);
        }
    };

    const handleTogglePayment = async (service: ExtendedServiceRecord) => {
        const updatedService = { ...service, paid: !service.paid };
        await updateService(updatedService);
        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList as ExtendedServiceRecord[]);
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
        setIsPaid(false);
        setManualOrderId(''); // Resetar
        setServiceDate(getLocalDateStr(new Date()));
        setEditingServiceId(null);
        setShowForm(false);
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');

        if (cleanPickups.length === 0 || cleanDeliveries.length === 0) {
            alert('Por favor, insira pelo menos um endereço de coleta e um de entrega.');
            return;
        }

        const originalService = services.find(s => s.id === editingServiceId);

        // Cast 'any' para permitir a propriedade manualOrderId
        const serviceData: any = {
            id: editingServiceId || crypto.randomUUID(),
            ownerId: '', 
            clientId: client.id,
            pickupAddresses: cleanPickups,
            deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost),
            driverFee: parseFloat(driverFee) || 0,
            
            // Novos campos
            waitingTime: parseFloat(waitingTime) || 0,
            extraFee: parseFloat(extraFee) || 0,
            
            // --- SALVANDO O ID MANUAL (SEM FALLBACK AUTOMÁTICO) ---
            manualOrderId: manualOrderId.trim(), 

            requesterName: requester,
            date: serviceDate,
            paid: editingServiceId ? isPaid : isPaid,
            paymentMethod: paymentMethod,
            status: originalService ? originalService.status : 'PENDING'
        };

        if (editingServiceId) {
            await updateService(serviceData);
        } else {
            await saveService(serviceData);
        }

        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList as ExtendedServiceRecord[]);
        resetForm();
    };

    const setDateRange = (type: 'today' | 'week' | 'month') => {
        const today = new Date();
        const end = getLocalDateStr(today);
        let start = '';

        if (type === 'today') {
            start = end;
        } else if (type === 'week') {
            const d = new Date(today);
            const day = d.getDay();
            const diff = d.getDate() - day;
            d.setDate(diff);
            start = getLocalDateStr(d);
        } else if (type === 'month') {
            const d = new Date(today.getFullYear(), today.getMonth(), 1);
            start = getLocalDateStr(d);
        }

        setStartDate(start);
        setEndDate(end);
    };

    const getFilteredServices = () => {
        let filtered = services;

        if (startDate && endDate) {
            filtered = filtered.filter(s => {
                const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
                return dateStr >= startDate && dateStr <= endDate;
            });
        }

        if (statusFilter === 'PAID') {
            filtered = filtered.filter(s => s.paid === true);
        } else if (statusFilter === 'PENDING') {
            filtered = filtered.filter(s => s.paid === false);
        }

        return filtered.sort((a, b) => {
            const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return 0;
        });
    };

    const filteredServices = getFilteredServices();

    useEffect(() => {
        setSelectedIds(new Set());
    }, [startDate, endDate, statusFilter, services]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredServices.length && filteredServices.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredServices.map(s => s.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkStatusChange = async (newStatus: boolean) => {
        if (selectedIds.size === 0) return;

        const updates = services
            .filter(s => selectedIds.has(s.id))
            .map(s => ({ ...s, paid: newStatus }));

        await bulkUpdateServices(updates);
        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList as ExtendedServiceRecord[]);
        setSelectedIds(new Set()); 
    };

    const stats = useMemo(() => {
        // Soma Base + Espera
        const totalPaid = filteredServices.filter(s => s.paid).reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
        const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);

        const revenueByMethod = filteredServices.reduce((acc, curr) => {
            const method = curr.paymentMethod || 'PIX';
            acc[method] = (acc[method] || 0) + curr.cost + (curr.waitingTime || 0);
            return acc;
        }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

        return { totalPaid, totalPending, revenueByMethod };
    }, [filteredServices]);

    // --- PDF GENERATION LOGIC ---
    const handleExportBoleto = () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        setShowExportMenu(false);

        setTimeout(() => {
            try {
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth(); 
                const marginX = 10;
                let currentY = 15;

                // Title
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text("RELATÓRIO DE SERVIÇOS PRESTADOS", pageWidth / 2, currentY, { align: 'center' });
                currentY += 10;

                // Header Box
                const boxHeight = 25; 
                const midPage = pageWidth / 2;

                doc.setDrawColor(200);
                doc.setLineWidth(0.1);
                doc.line(marginX, currentY, pageWidth - marginX, currentY);
                doc.line(marginX, currentY + boxHeight, pageWidth - marginX, currentY + boxHeight);
                doc.line(midPage, currentY, midPage, currentY + boxHeight);

                // Client Info
                doc.setTextColor(0);
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`${client.name.substring(0, 35)}`, marginX + 2, currentY + 6);
                
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.text(`Responsável: ${client.contactPerson || '-'}`, marginX + 2, currentY + 12);
                
                let periodoTxt = "Todo o histórico";
                if(startDate && endDate) {
                    const d1 = new Date(startDate + 'T00:00:00').toLocaleDateString();
                    const d2 = new Date(endDate + 'T00:00:00').toLocaleDateString();
                    periodoTxt = `${d1} a ${d2}`;
                }
                doc.text(`Período: ${periodoTxt}`, marginX + 2, currentY + 17);
                doc.text(`Emissão: ${new Date().toLocaleDateString()}`, marginX + 2, currentY + 22);

                // Provider Info
                const rightX = midPage + 4;
                const myName = currentUser.companyName || currentUser.name || "Sua Empresa";
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`${myName.substring(0, 35)}`, rightX, currentY + 6);
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                const myCnpj = currentUser.companyCnpj || "CNPJ Não informado";
                doc.text(`CNPJ: ${myCnpj}`, rightX, currentY + 12);
                const myPhone = currentUser.phone || "-";
                doc.text(`WhatsApp: ${myPhone}`, rightX, currentY + 17);
                doc.text(`Resp.: ${currentUser.name.split(' ')[0]}`, rightX, currentY + 22);

                currentY += boxHeight + 10;

                // Service Details Title
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`DETALHAMENTO DE SERVIÇOS`, marginX, currentY);
                doc.line(marginX, currentY + 1, pageWidth - marginX, currentY + 1);
                currentY += 5;

                // --- TABELA ATUALIZADA ---
                const tableData = filteredServices.map(s => {
                    const baseCost = s.cost;
                    const waiting = s.waitingTime || 0;
                    const extra = s.extraFee || 0;
                    const lineTotal = baseCost + waiting + extra;
                    
                    // CORREÇÃO: Removido fallback automático
                    const displayOrderId = s.manualOrderId 
                        ? s.manualOrderId 
                        : '';

                    // Formatação profissional dos endereços
                    const formatAddressList = (addresses: string[]) => {
                        if (!addresses || addresses.length === 0) return '-';
                        if (addresses.length === 1) return addresses[0];
                        // Adiciona bullet point para múltiplos endereços
                        return addresses.map(a => `• ${a}`).join('\n');
                    };

                    return [
                        new Date(s.date + 'T00:00:00').toLocaleDateString().substring(0, 5), // DD/MM
                        s.requesterName.substring(0, 15), 
                        formatAddressList(s.pickupAddresses),
                        formatAddressList(s.deliveryAddresses),
                        waiting > 0 ? `R$ ${waiting.toFixed(2)}` : '-',
                        extra > 0 ? `R$ ${extra.toFixed(2)}` : '-',
                        `R$ ${baseCost.toFixed(2)}`, 
                        `R$ ${lineTotal.toFixed(2)}`, 
                        displayOrderId
                    ];
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [['DATA', 'SOLICITANTE', 'ORIGEM', 'DESTINO', 'ESPERA', 'TAXA', 'SERVIÇO', 'TOTAL', 'PEDIDO']],
                    body: tableData,
                    theme: 'plain', 
                    styles: {
                        fontSize: 7, 
                        cellPadding: 2,
                        textColor: 0,
                        lineColor: 200,
                        lineWidth: 0.1,
                        valign: 'middle',
                        overflow: 'linebreak'
                    },
                    headStyles: {
                        fillColor: [240, 240, 240], 
                        textColor: 0,
                        fontStyle: 'bold',
                        lineWidth: 0.1,
                        lineColor: 200
                    },
                    columnStyles: {
                        0: { cellWidth: 12 }, 
                        1: { cellWidth: 20 }, 
                        2: { cellWidth: 30 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 15, halign: 'right' }, 
                        5: { cellWidth: 15, halign: 'right' }, 
                        6: { cellWidth: 18, halign: 'right' }, 
                        7: { cellWidth: 20, halign: 'right' }, 
                        8: { cellWidth: 20, halign: 'center' } 
                    },
                    margin: { left: marginX, right: marginX }
                });

                // Summary Footer
                // @ts-ignore
                let finalY = doc.lastAutoTable.finalY + 10;
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setDrawColor(0);
                doc.setLineWidth(0.1);
                doc.line(marginX, finalY, pageWidth - marginX, finalY);

                const totalValue = filteredServices.reduce((sum, s) => {
                    return sum + s.cost + (s.waitingTime || 0) + (s.extraFee || 0);
                }, 0);

                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                const resumoX = 140; 
                doc.text("TOTAL DE SERVIÇOS:", resumoX, finalY + 7);
                doc.text(filteredServices.length.toString(), pageWidth - marginX, finalY + 7, { align: 'right' });

                doc.text("VALOR TOTAL:", resumoX, finalY + 14);
                doc.setFontSize(12);
                doc.text(`R$ ${totalValue.toFixed(2)}`, pageWidth - marginX, finalY + 14, { align: 'right' });

                const fileName = `Relatorio_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                doc.save(fileName);

            } catch (error) {
                console.error("Error generating PDF", error);
                alert("Erro ao gerar PDF.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 100);
    };

    const downloadCSV = () => {
        setShowExportMenu(false);
        const maxPickups = Math.max(...filteredServices.map(s => s.pickupAddresses.length), 1);
        const maxDeliveries = Math.max(...filteredServices.map(s => s.deliveryAddresses.length), 1);

        const pickupHeaders = Array.from({ length: maxPickups }, (_, i) => `Coleta ${i + 1}`);
        const deliveryHeaders = Array.from({ length: maxDeliveries }, (_, i) => `Entrega ${i + 1}`);

        const headers = ['Data', 'Pedido', 'Solicitante', ...pickupHeaders, ...deliveryHeaders, 'Valor Base (R$)', 'Espera (R$)', 'Taxa Extra (R$)', 'Total (R$)', 'Método', 'Pagamento'];
        
        const rows = filteredServices.map(s => {
            const safeString = (str: string) => `"${str.replace(/"/g, '""')}"`;
            const pickupCols = Array.from({ length: maxPickups }, (_, i) => safeString(s.pickupAddresses[i] || ''));
            const deliveryCols = Array.from({ length: maxDeliveries }, (_, i) => safeString(s.deliveryAddresses[i] || ''));
            
            const total = s.cost + (s.waitingTime || 0) + (s.extraFee || 0);

            return [
                new Date(s.date + 'T00:00:00').toLocaleDateString(),
                safeString(s.manualOrderId || ''),
                safeString(s.requesterName),
                ...pickupCols,
                ...deliveryCols,
                s.cost.toFixed(2).replace('.', ','),
                (s.waitingTime || 0).toFixed(2).replace('.', ','),
                (s.extraFee || 0).toFixed(2).replace('.', ','),
                total.toFixed(2).replace('.', ','),
                getPaymentMethodLabel(s.paymentMethod),
                s.paid ? 'PAGO' : 'PENDENTE'
            ].join(';');
        });

        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Relatorio_${client.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportExcel = (type: 'client' | 'internal') => {
        setShowExportMenu(false);
        alert("Use o PDF para o relatório oficial com taxas extras.");
    };

    const isAllSelected = filteredServices.length > 0 && selectedIds.size === filteredServices.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredServices.length;

    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    return (
        <div className="space-y-6 animate-fade-in relative">

            {/* --- MODAL DE EXCLUSÃO DE SERVIÇO --- */}
            {serviceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Excluir Serviço?</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Tem certeza que deseja remover este serviço?
                                <br />Esta ação não poderá ser desfeita.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setServiceToDelete(null)}
                                    className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteService}
                                    className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewingService && (
                <ServiceDocumentModal
                    service={viewingService}
                    client={client}
                    currentUser={currentUser}
                    onClose={() => setViewingService(null)}
                />
            )}

            {/* Header Area */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
                        <ArrowLeft size={20} className="mr-1" /> Voltar
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                {client.name}
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-600">
                                    {client.category}
                                </span>
                            </h1>
                            {client.cnpj && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                                    <Building size={14} />
                                    CNPJ: {client.cnpj}
                                </p>
                            )}

                            <div className="flex flex-col gap-2 mt-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                                <div className="flex flex-wrap gap-4 md:gap-6">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        {client.email}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        {client.phone}
                                    </span>
                                </div>
                                {(client.address || client.contactPerson) && (
                                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                                        {client.contactPerson && (
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <UserIcon size={14} className="text-blue-500" />
                                                <span className="font-bold">Responsável:</span> {client.contactPerson}
                                            </div>
                                        )}
                                        {client.address && (
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <MapPin size={14} className="text-emerald-500" />
                                                <span className="font-bold">Endereço:</span> {client.address}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 mt-6 border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'services'
                                ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <List size={16} />
                                Serviços & Cadastro
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('financial')}
                            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'financial'
                                ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700 dark:border-emerald-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <PieChart size={16} />
                                Relatório Financeiro
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB 1: SERVICES (Form + Simple List) */}
            {activeTab === 'services' && (
                <>
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                if (showForm) resetForm();
                                else setShowForm(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold shadow-sm"
                        >
                            {showForm ? <X size={18} /> : <Plus size={18} />}
                            {showForm ? 'Cancelar' : 'Nova Corrida'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveService(e); }} className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-700 space-y-6 animate-slide-down">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-700 pb-4 gap-4">
                                <h3 className="font-bold text-white text-lg">{editingServiceId ? 'Editar Corrida' : 'Registrar Nova Corrida'}</h3>
                                
                                <div className="flex gap-4 w-full sm:w-auto">
                                    <div className="w-1/2 sm:w-32">
                                        <label className="text-xs text-slate-400 block mb-1 font-bold">Nº Pedido (Op.)</label>
                                        <div className="relative">
                                            <Hash size={14} className="absolute left-2 top-2 text-slate-500" />
                                            <input 
                                                type="text" 
                                                className="w-full pl-7 p-1 bg-slate-800 text-white border border-slate-600 rounded text-sm focus:border-blue-500 outline-none uppercase" 
                                                value={manualOrderId} 
                                                onChange={e => setManualOrderId(e.target.value)}
                                                placeholder="1234..."
                                            />
                                        </div>
                                    </div>
                                    <div className="w-1/2 sm:w-auto text-right">
                                        <label className="text-xs text-slate-400 block mb-1 font-bold">Data</label>
                                        <div className="relative">
                                            <input type="date" className="p-1 bg-slate-800 text-white border border-slate-600 rounded text-sm" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Endereços - Padronizado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3 p-4 bg-blue-900/10 rounded-xl border border-blue-900/30">
                                    <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta</h3>
                                    {pickupAddresses.map((addr, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                            <input className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm focus:border-blue-500 outline-none" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
                                            {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)}><X size={16} className="text-red-400" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs font-bold text-blue-400 flex items-center gap-1 mt-1"><Plus size={14} /> Adicionar Parada</button>
                                </div>
                                <div className="space-y-3 p-4 bg-emerald-900/10 rounded-xl border border-emerald-900/30">
                                    <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrega</h3>
                                    {deliveryAddresses.map((addr, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                                            <input className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm focus:border-emerald-500 outline-none" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                            {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)}><X size={16} className="text-red-400" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1"><Plus size={14} /> Adicionar Parada</button>
                                </div>
                            </div>

                            {/* Financeiro - Padronizado */}
                            <div className="pt-4 border-t border-slate-700">
                                <h3 className="font-bold text-white mb-4 text-sm border-b border-slate-700 pb-2">Financeiro e Adicionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-400 mb-1">Valor da Corrida (R$)</label>
                                        <div className="relative">
                                            <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                                            <input required type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-emerald-500 outline-none" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                        <div className="relative">
                                            <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                            <input required type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-red-500 outline-none" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">VALOR ESPERA (R$)</label>
                                        <div className="relative">
                                            <Timer size={14} className="absolute left-3 top-3 text-slate-500" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="0.00" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Soma no total do sistema</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">TAXA EXTRA (R$)</label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-3 text-slate-500" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="0.00" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Soma apenas no PDF do Cliente</p>
                                    </div>
                                </div>
                                {/* BOX TOTAIS */}
                                <div className="p-4 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">TOTAL INTERNO (BASE + ESPERA)</span>
                                        <span className="text-xl font-bold text-white">R$ {currentTotal.toFixed(2)}</span>
                                    </div>
