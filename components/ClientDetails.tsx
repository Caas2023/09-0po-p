import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User, ServiceStatus } from '../types';
// ADICIONE: deleteService na importação
import { saveService, updateService, getServicesByClient, bulkUpdateServices, deleteService } from '../services/storageService';
import { ArrowLeft, Plus, Calendar, MapPin, Filter, FileSpreadsheet, X, Bike, ChevronDown, FileText, ShieldCheck, Pencil, DollarSign, CheckCircle, AlertCircle, PieChart, List, CheckSquare, Square, MoreHorizontal, User as UserIcon, Building, MinusSquare, Share2, Phone, Mail, Banknote, QrCode, CreditCard, MessageCircle, Loader2, Download, Table, FileDown, Package, Clock, XCircle, Activity, Trash2, AlertTriangle } from 'lucide-react';
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

// Helper to translate payment method
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

const getStatusLabel = (status: ServiceStatus) => {
    switch (status) {
        case 'PENDING': return 'Pendente';
        case 'IN_PROGRESS': return 'Em Rota';
        case 'DONE': return 'Concluído';
        case 'CANCELLED': return 'Cancelado';
        default: return 'Desconhecido';
    }
};

const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
        case 'PENDING': return 'bg-slate-100 text-slate-700 border-slate-200';
        case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'DONE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-slate-100 text-slate-500';
    }
};

const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
        case 'PENDING': return <Clock size={14} />;
        case 'IN_PROGRESS': return <Bike size={14} />;
        case 'DONE': return <CheckCircle size={14} />;
        case 'CANCELLED': return <XCircle size={14} />;
        default: return <Package size={14} />;
    }
};

// Helper for local date string YYYY-MM-DD
const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Service Document Modal Component ---
export const ServiceDocumentModal = ({ service, client, currentUser, onClose }: { service: ServiceRecord; client: Client; currentUser: User; onClose: () => void }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Use company data from user settings if available, otherwise default or fallback
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
            scale: 2, // Higher scale for better quality
            backgroundColor: '#ffffff',
            useCORS: true, // Important for external images if any
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');

        // Create PDF (A4 size)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Add image to PDF (top aligned)
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

        return pdf;
    };

    const handleDownloadPDF = async () => {
        if (isGeneratingPdf || isSharing) return;
        setIsGeneratingPdf(true);

        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Ordem_${service.id.slice(0, 8)}.pdf`);
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

            const file = new File([pdf.output('blob')], `Ordem_${service.id.slice(0, 8)}.pdf`, { type: 'application/pdf' });

            // Check for Web Share API support with files (Mobile/Modern Browsers)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Comprovante de Serviço',
                    text: `Segue o comprovante da ordem #${service.id.slice(0, 8)} - ${client.name}`,
                });
            } else {
                // Fallback for Desktop: Download file + WhatsApp Web Link
                pdf.save(`Ordem_${service.id.slice(0, 8)}.pdf`);

                const message = `Segue o comprovante da ordem #${service.id.slice(0, 8)}. (O arquivo PDF foi baixado no seu dispositivo)`;

                // Format phone number
                let phone = client.phone.replace(/\D/g, '');
                // Add Brazil code if missing (heuristic: 10 or 11 digits usually local w/ area code)
                if (phone.length >= 10 && phone.length <= 11) {
                    phone = `55${phone}`;
                }

                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                let url = '';
                if (isMobile) {
                    // Use api.whatsapp.com for mobile to trigger app
                    url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
                } else {
                    // Use web.whatsapp.com for desktop to skip landing page
                    url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
                }

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

                {/* Modal Header (No Print) */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 print:hidden">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Visualizar Documento
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf || isSharing}
                            className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 text-xs sm:text-sm font-bold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            <span className="hidden sm:inline">Baixar PDF</span>
                        </button>
                        <button
                            onClick={handleShareWhatsApp}
                            disabled={isSharing || isGeneratingPdf}
                            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-xs sm:text-sm font-bold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isSharing ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Document Content (Scrollable) */}
                <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-900 print:bg-white print:p-0 print:overflow-visible">

                    {/* The Paper - TARGET FOR PDF GENERATION - Always White for PDF purposes */}
                    {/* Enforce Fixed Width 210mm (A4) and Fixed Padding p-12 to prevent mobile reflow issues */}
                    <div ref={invoiceRef} className="bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] p-12 text-slate-900 print:shadow-none print:m-0 print:w-full box-border relative">

                        {/* Document Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight mb-2">{myCompany.name}</h1>
                                <div className="text-xs text-slate-600 space-y-1 font-medium">
                                    {myCompany.cnpj && (
                                        <p className="font-mono tracking-wide">CNPJ: {myCompany.cnpj}</p>
                                    )}
                                    {myCompany.address && <p>{myCompany.address}</p>}
                                </div>
                            </div>
                            <div className="text-right text-xs text-slate-600 space-y-1">
                                {myCompany.email && (
                                    <div className="flex items-center justify-end gap-2">
                                        <Mail size={12} /> {myCompany.email}
                                    </div>
                                )}
                                {myCompany.phone && (
                                    <div className="flex items-center justify-end gap-2">
                                        <Phone size={12} /> {myCompany.phone}
                                    </div>
                                )}
                                {myCompany.website && (
                                    <div className="flex items-center justify-end gap-2">
                                        <Building size={12} /> {myCompany.website}
                                    </div>
                                )}
                                <div className="mt-4 font-bold text-slate-900 text-lg">
                                    {new Date(service.date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Order Number Strip */}
                        <div className="bg-slate-100 border-l-4 border-slate-800 p-3 mb-8 flex justify-between items-center">
                            <span className="font-bold text-lg text-slate-800 uppercase">Ordem de Serviço</span>
                            <span className="font-mono text-xl font-bold text-slate-900">#{service.id.slice(0, 8).toUpperCase()}</span>
                        </div>

                        {/* Client Section */}
                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mb-3 pb-1">Dados do Cliente</h2>
                            {/* Force 2 columns (grid-cols-2) regardless of screen size to maintain PDF layout */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-bold text-slate-900 text-lg">{client.name}</p>
                                    <p className="text-slate-700">{client.category}</p>
                                    {client.cnpj && <p className="text-slate-500 text-xs mt-1">CNPJ: {client.cnpj}</p>}
                                </div>
                                <div className="text-slate-700 space-y-1">
                                    {client.contactPerson && (
                                        <p className="flex items-center gap-2">
                                            <UserIcon size={14} className="text-slate-500" />
                                            <span className="font-medium">Resp:</span> {client.contactPerson}
                                        </p>
                                    )}
                                    {client.address && (
                                        <p className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-500" />
                                            {client.address}
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <Phone size={14} className="text-slate-500" />
                                        {client.phone}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Service Details */}
                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mb-3 pb-1">Detalhes do Serviço</h2>

                            <div className="space-y-6">
                                {/* Request Info */}
                                <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-md print:bg-transparent print:p-0 border border-slate-200 print:border-none">
                                    <div>
                                        <span className="text-slate-600 font-medium">Solicitado por:</span>
                                        <span className="ml-2 font-bold text-slate-900">{service.requesterName}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600 font-medium">Status Operacional:</span>
                                        <span className="ml-2 font-bold uppercase text-slate-900">{getStatusLabel(service.status)}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600 font-medium">Pagamento:</span>
                                        <span className={`ml-2 font-bold uppercase ${service.paid ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {service.paid ? 'Pago' : 'Pendente'}
                                        </span>
                                    </div>
                                </div>

                                {/* Route */}
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1">
                                            <MapPin size={12} /> Retirada(s)
                                        </p>
                                        <div className="pl-4 border-l-2 border-blue-200 space-y-2">
                                            {service.pickupAddresses.map((addr, i) => (
                                                <p key={i} className="text-sm text-slate-800 font-medium">{addr}</p>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1">
                                            <MapPin size={12} /> Entrega(s)
                                        </p>
                                        <div className="pl-4 border-l-2 border-emerald-200 space-y-2">
                                            {service.deliveryAddresses.map((addr, i) => (
                                                <p key={i} className="text-sm text-slate-800 font-medium">{addr}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="mb-12">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mb-3 pb-1">Pagamento</h2>
                            <div className="flex justify-end">
                                <div className="w-1/2">
                                    <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600">Valor do Serviço</span>
                                        <span className="font-bold text-slate-900">R$ {service.cost.toFixed(2)}</span>
                                    </div>
                                    {service.paymentMethod && (
                                        <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                                            <span className="text-slate-600">Método de Pagamento</span>
                                            <span className="font-bold text-slate-900">{getPaymentMethodLabel(service.paymentMethod)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-4">
                                        <span className="text-lg font-bold text-slate-900">Total</span>
                                        <span className="text-2xl font-bold text-slate-900">R$ {service.cost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-600 print:bg-transparent print:border print:border-slate-200">
                                <p className="font-bold text-slate-800 mb-1">Dados para Pagamento:</p>
                                <p>PIX: {myCompany.email} / {myCompany.phone}</p>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="mt-20 grid grid-cols-2 gap-12">
                            <div className="border-t border-slate-400 pt-2">
                                <p className="text-xs font-bold text-slate-800 uppercase">{myCompany.name}</p>
                                <p className="text-xs text-slate-500">Assinatura do Responsável</p>
                            </div>
                            <div className="border-t border-slate-400 pt-2">
                                <p className="text-xs font-bold text-slate-800 uppercase">{client.name}</p>
                                <p className="text-xs text-slate-500">Assinatura do Cliente</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center border-t border-slate-100 pt-4">
                            <p className="text-[10px] text-slate-400">Gerado eletronicamente por LogiTrack CRM em {new Date().toLocaleString()}</p>
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
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);

    // Editing state
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

    // Deleting state
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [serviceDate, setServiceDate] = useState(getLocalDateStr(new Date()));
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    const [cost, setCost] = useState(''); // Client Charge
    const [driverFee, setDriverFee] = useState(''); // Motoboy Pay
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('PENDING');

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

    const handleEditService = (service: ServiceRecord) => {
        setEditingServiceId(service.id);
        setServiceDate(service.date.includes('T') ? service.date.split('T')[0] : service.date);
        setPickupAddresses([...service.pickupAddresses]);
        setDeliveryAddresses([...service.deliveryAddresses]);
        setCost(service.cost.toString());
        setDriverFee(service.driverFee.toString());
        setRequester(service.requesterName);
        setPaymentMethod(service.paymentMethod || 'PIX');
        setServiceStatus(service.status || 'DONE');
        setShowForm(true);
        setActiveTab('services'); // Ensure we are on the form tab
    };

    // --- NOVA FUNÇÃO DE EXCLUSÃO ---
    const confirmDeleteService = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast.success('Serviço removido com sucesso.');
            // Atualiza a lista
            const updatedList = await getServicesByClient(client.id);
            setServices(updatedList);
        } catch (error) {
            toast.error('Erro ao remover serviço.');
            console.error(error);
        } finally {
            setIsDeleting(false);
            setServiceToDelete(null);
        }
    };

    const handleTogglePayment = async (service: ServiceRecord) => {
        const updatedService = { ...service, paid: !service.paid };
        await updateService(updatedService);
        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList);
    };

    const resetForm = () => {
        setPickupAddresses(['']);
        setDeliveryAddresses(['']);
        setCost('');
        setDriverFee('');
        setRequester('');
        setPaymentMethod('PIX');
        setServiceStatus('PENDING');
        setServiceDate(getLocalDateStr(new Date()));
        setEditingServiceId(null);
        setShowForm(false);
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();

        // Filter out empty addresses
        const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
        const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');

        if (cleanPickups.length === 0 || cleanDeliveries.length === 0) {
            alert('Por favor, insira pelo menos um endereço de coleta e um de entrega.');
            return;
        }

        // If editing, preserve the original paid status, else default to false
        const originalService = services.find(s => s.id === editingServiceId);

        const serviceData: ServiceRecord = {
            id: editingServiceId || crypto.randomUUID(),
            ownerId: '', // Placeholder, handled by storageService
            clientId: client.id,
            pickupAddresses: cleanPickups,
            deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost),
            driverFee: parseFloat(driverFee) || 0,
            requesterName: requester,
            date: serviceDate,
            paid: originalService ? originalService.paid : false,
            paymentMethod: paymentMethod,
            status: serviceStatus
        };

        if (editingServiceId) {
            await updateService(serviceData);
        } else {
            await saveService(serviceData);
        }

        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList);
        resetForm();
    };

    const setDateRange = (type: 'today' | 'week' | 'month') => {
        const today = new Date();
        const end = getLocalDateStr(today);
        let start = '';

        if (type === 'today') {
            start = end;
        } else if (type === 'week') {
            // Find last Sunday
            const d = new Date(today);
            const day = d.getDay(); // 0 is Sunday
            const diff = d.getDate() - day; // adjust when day is sunday
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

        // Date Filter using string comparison for robustness
        if (startDate && endDate) {
            filtered = filtered.filter(s => {
                const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
                return dateStr >= startDate && dateStr <= endDate;
            });
        }

        // Status Filter
        if (statusFilter === 'PAID') {
            filtered = filtered.filter(s => s.paid === true);
        } else if (statusFilter === 'PENDING') {
            filtered = filtered.filter(s => s.paid === false);
        }

        // Sort by date descending
        return filtered.sort((a, b) => {
            const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return 0;
        });
    };

    const filteredServices = getFilteredServices();

    // Counts for summary
    const statusCounts = useMemo(() => {
        const counts = {
            TOTAL: filteredServices.length,
            DONE: 0,
            IN_PROGRESS: 0,
            PENDING: 0,
            CANCELLED: 0
        };
        filteredServices.forEach(s => {
            const st = s.status || 'DONE';
            if (st === 'DONE') counts.DONE++;
            else if (st === 'IN_PROGRESS') counts.IN_PROGRESS++;
            else if (st === 'PENDING') counts.PENDING++;
            else if (st === 'CANCELLED') counts.CANCELLED++;
        });
        return counts;
    }, [filteredServices]);

    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [startDate, endDate, statusFilter, services]);

    // Selection Logic
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
        setServices(updatedList);
        setSelectedIds(new Set()); // Clear selection after action
    };

    const stats = useMemo(() => {
        const totalPaid = filteredServices.filter(s => s.paid).reduce((sum, s) => sum + s.cost, 0);
        const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost, 0);

        // Calculate revenue by method
        const revenueByMethod = filteredServices.reduce((acc, curr) => {
            const method = curr.paymentMethod || 'PIX';
            acc[method] = (acc[method] || 0) + curr.cost;
            return acc;
        }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

        return { totalPaid, totalPending, revenueByMethod };
    }, [filteredServices]);

    const handleExportPDF = (type: 'client' | 'internal' = 'client') => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        setShowExportMenu(false);

        setTimeout(() => {
            try {
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
                const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
                const marginX = 14;
                const contentWidth = pageWidth - (marginX * 2);

                const myCompany = {
                    name: currentUser.companyName || currentUser.name || "LogiTrack CRM",
                    email: currentUser.email,
                };

                // -- Header --
                doc.setFillColor(30, 41, 59); // Slate 800
                doc.rect(0, 0, pageWidth, 40, 'F');

                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.text(type === 'internal' ? "Relatório Interno" : "Relatório de Serviços", marginX, 20);

                doc.setFontSize(10);
                doc.setTextColor(203, 213, 225); // Slate 300
                doc.text(myCompany.name, marginX, 28);
                doc.text(`Gerado por: ${currentUser.name}`, marginX, 33);

                // Dates on the right
                doc.text(`Emissão: ${new Date().toLocaleDateString()}`, pageWidth - marginX, 20, { align: 'right' });
                if (startDate && endDate) {
                    const startD = new Date(startDate + 'T00:00:00').toLocaleDateString();
                    const endD = new Date(endDate + 'T00:00:00').toLocaleDateString();
                    doc.text(`Período: ${startD} a ${endD}`, pageWidth - marginX, 28, { align: 'right' });
                } else {
                    doc.text(`Período: Todo o histórico`, pageWidth - marginX, 28, { align: 'right' });
                }

                // -- Client Info Section --
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`Cliente: ${client.name}`, marginX, 55);

                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                let clientInfoY = 60;
                if (client.cnpj) {
                    doc.text(`CNPJ: ${client.cnpj}`, marginX, clientInfoY);
                    clientInfoY += 5;
                }
                if (client.contactPerson) {
                    doc.text(`Responsável: ${client.contactPerson}`, marginX, clientInfoY);
                    clientInfoY += 5;
                }
                doc.text(`Contato: ${client.phone} | ${client.email}`, marginX, clientInfoY);


                // -- Summary Cards --
                const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost, 0);
                const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost, 0);
                const totalCost = filteredServices.reduce((sum, s) => sum + (s.driverFee || 0), 0);
                const totalProfit = totalRevenue - totalCost;

                const cardY = 50;
                const cardHeight = 20;
                const gap = 3; // Reduced gap slightly

                // Calculate dynamic card width to fit perfectly within margins
                // Width = (TotalAvailable - (Gaps)) / Cards
                let numberOfCards = type === 'internal' ? 4 : 3;
                let cardWidth = (contentWidth - (gap * (numberOfCards - 1))) / numberOfCards;

                // Start right after client info, but align to the right side of the page
                // Or center the block on the remaining space? Let's align to the right margin.
                // X = PageWidth - MarginX - (TotalCardWidth)
                let startX = pageWidth - marginX - ((cardWidth * numberOfCards) + (gap * (numberOfCards - 1)));

                let currentX = startX;

                // Card 1: Total
                doc.setFillColor(241, 245, 249);
                doc.setDrawColor(203, 213, 225);
                doc.roundedRect(currentX, cardY, cardWidth, cardHeight, 2, 2, 'FD');
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text("TOTAL SERVIÇOS", currentX + 3, cardY + 6);
                doc.setFontSize(11);
                doc.setTextColor(15, 23, 42);
                doc.text(filteredServices.length.toString(), currentX + 3, cardY + 15);

                // Card 2: Revenue
                currentX += cardWidth + gap;
                doc.setFillColor(240, 253, 244); // Green 50
                doc.setDrawColor(187, 247, 208);
                doc.roundedRect(currentX, cardY, cardWidth, cardHeight, 2, 2, 'FD');
                doc.setFontSize(7);
                doc.setTextColor(22, 101, 52);
                doc.text("TOTAL FATURADO", currentX + 3, cardY + 6);
                doc.setFontSize(11);
                doc.text(`R$ ${totalRevenue.toFixed(2)}`, currentX + 3, cardY + 15);

                // Card 3: Pending
                currentX += cardWidth + gap;
                doc.setFillColor(255, 251, 235); // Amber 50
                doc.setDrawColor(253, 230, 138);
                doc.roundedRect(currentX, cardY, cardWidth, cardHeight, 2, 2, 'FD');
                doc.setFontSize(7);
                doc.setTextColor(180, 83, 9);
                doc.text("A RECEBER", currentX + 3, cardY + 6);
                doc.setFontSize(11);
                doc.text(`R$ ${totalPending.toFixed(2)}`, currentX + 3, cardY + 15);

                // Card 4: Profit (Internal Only)
                if (type === 'internal') {
                    currentX += cardWidth + gap;
                    doc.setFillColor(239, 246, 255); // Blue 50
                    doc.setDrawColor(191, 219, 254);
                    doc.roundedRect(currentX, cardY, cardWidth, cardHeight, 2, 2, 'FD');
                    doc.setFontSize(7);
                    doc.setTextColor(29, 78, 216);
                    doc.text("LUCRO LÍQUIDO", currentX + 3, cardY + 6);
                    doc.setFontSize(11);
                    doc.text(`R$ ${totalProfit.toFixed(2)}`, currentX + 3, cardY + 15);
                }

                // -- Table --
                let head = [['Data', 'Solicitante', 'Rota', 'Valor', 'Status', 'Pgto']];
                if (type === 'internal') {
                    head = [['Data', 'Solicitante', 'Rota', 'Valor', 'Motoboy', 'Lucro', 'Status', 'Pgto']];
                }

                const tableData = filteredServices.map(s => {
                    const commonData = [
                        new Date(s.date + 'T00:00:00').toLocaleDateString(),
                        s.requesterName,
                    ];

                    // Condensed route for table view
                    const route = `R: ${s.pickupAddresses[0]}${s.pickupAddresses.length > 1 ? '...' : ''}\nE: ${s.deliveryAddresses[0]}${s.deliveryAddresses.length > 1 ? '...' : ''}`;

                    if (type === 'internal') {
                        const profit = s.cost - (s.driverFee || 0);
                        return [
                            ...commonData,
                            route,
                            `R$ ${s.cost.toFixed(2)}`,
                            `R$ ${(s.driverFee || 0).toFixed(2)}`,
                            `R$ ${profit.toFixed(2)}`,
                            getStatusLabel(s.status),
                            s.paid ? 'PAGO' : 'PEND'
                        ];
                    } else {
                        return [
                            ...commonData,
                            route,
                            `R$ ${s.cost.toFixed(2)}`,
                            getStatusLabel(s.status),
                            s.paid ? 'PAGO' : 'PEND'
                        ];
                    }
                });

                // Column Styles
                let columnStyles: any = {};

                if (type === 'internal') {
                    columnStyles = {
                        0: { cellWidth: 18 }, // Date
                        1: { cellWidth: 22 }, // Requester
                        2: { cellWidth: 'auto' }, // Route
                        3: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }, // Value
                        4: { cellWidth: 18, halign: 'right', textColor: [185, 28, 28] }, // Motoboy
                        5: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [29, 78, 216] }, // Profit
                        6: { cellWidth: 18 }, // Status
                        7: { cellWidth: 14, halign: 'center' } // Pgto
                    };
                } else {
                    columnStyles = {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 20, halign: 'center' }
                    };
                }

                autoTable(doc, {
                    startY: 85,
                    head: head,
                    body: tableData,
                    theme: 'striped',
                    margin: { left: marginX, right: marginX }, // Explicit margin enforcement
                    tableWidth: contentWidth, // Force table to respect content width
                    headStyles: {
                        fillColor: [30, 41, 59],
                        textColor: 255,
                        fontSize: 8,
                        fontStyle: 'bold',
                    },
                    styles: {
                        fontSize: 7,
                        cellPadding: 2,
                        overflow: 'linebreak',
                        valign: 'middle'
                    },
                    columnStyles: columnStyles,
                    didParseCell: function (data: any) {
                        const statusColIndex = type === 'internal' ? 7 : 5;
                        if (data.section === 'body' && data.column.index === statusColIndex) {
                            if (data.cell.raw === 'PAGO') {
                                data.cell.styles.textColor = [22, 163, 74];
                                data.cell.styles.fontStyle = 'bold';
                            } else {
                                data.cell.styles.textColor = [217, 119, 6];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                });

                // Footer
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`${type === 'internal' ? 'Relatório Interno' : 'Relatório'} ${client.name} - LogiTrack CRM`, marginX, pageHeight - 10);
                    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: 'right' });
                }

                const suffix = type === 'internal' ? '_Interno' : '';
                doc.save(`Relatorio_${client.name.replace(/\s+/g, '_')}${suffix}.pdf`);

            } catch (error) {
                console.error("Error generating PDF", error);
                alert("Erro ao gerar PDF.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 100);
    };

    const exportExcel = (type: 'client' | 'internal') => {
        setShowExportMenu(false);
        const isInternal = type === 'internal';

        const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost, 0);
        const totalDriver = filteredServices.reduce((sum, s) => sum + (s.driverFee || 0), 0);
        const totalProfit = totalRevenue - totalDriver;

        // Calculate max columns for pickup and delivery addresses
        const maxPickups = Math.max(...filteredServices.map(s => s.pickupAddresses.length), 1);
        const maxDeliveries = Math.max(...filteredServices.map(s => s.deliveryAddresses.length), 1);

        // Generate header cells
        const pickupHeaders = Array.from({ length: maxPickups }, (_, i) => `<th>Coleta ${i + 1}</th>`).join('');
        const deliveryHeaders = Array.from({ length: maxDeliveries }, (_, i) => `<th>Entrega ${i + 1}</th>`).join('');

        const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subheader { color: #475569; margin-bottom: 20px; font-size: 14px; }
          .money { text-align: right; white-space: nowrap; }
          .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; background-color: #e2e8f0; padding: 5px; }
          .status-paid { color: #16a34a; font-weight: bold; }
          .status-pending { color: #d97706; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">Relatório ${isInternal ? 'Interno' : 'de Serviços'}: ${client.name}</div>
        ${client.cnpj ? `<div class="subheader">CNPJ: ${client.cnpj}</div>` : ''}
        ${client.contactPerson ? `<div class="subheader">Contato: ${client.contactPerson}</div>` : ''}
        <div class="subheader">Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        ${startDate && endDate ? `<div class="subheader">Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString()} a ${new Date(endDate + 'T00:00:00').toLocaleDateString()}</div>` : ''}

        <div class="section-title">RESUMO GERAL</div>
        <table>
          <thead>
            <tr>
              <th>Total de Corridas</th>
              <th class="money">Faturamento Total</th>
              ${isInternal ? `
              <th class="money">Custo Motoboy</th>
              <th class="money">Lucro Líquido</th>
              ` : ''}
              <th>Pago</th>
              <th>A Receber</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${filteredServices.length}</td>
              <td class="money">R$ ${totalRevenue.toFixed(2)}</td>
              ${isInternal ? `
              <td class="money">R$ ${totalDriver.toFixed(2)}</td>
              <td class="money" style="color: ${totalProfit >= 0 ? '#16a34a' : '#dc2626'}">R$ ${totalProfit.toFixed(2)}</td>
              ` : ''}
              <td class="money status-paid">R$ ${stats.totalPaid.toFixed(2)}</td>
              <td class="money status-pending">R$ ${stats.totalPending.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">DETALHAMENTO DE SERVIÇOS</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Solicitante</th>
              ${pickupHeaders}
              ${deliveryHeaders}
              <th class="money">Valor Cobrado</th>
              <th>Status Serviço</th>
              <th>Método</th>
              <th>Status Pagamento</th>
              ${isInternal ? `
              <th class="money">Pago Motoboy</th>
              <th class="money">Lucro</th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${filteredServices.map(s => {
            const profit = s.cost - (s.driverFee || 0);
            const paymentLabel = getPaymentMethodLabel(s.paymentMethod);

            const pickupCells = Array.from({ length: maxPickups }, (_, i) => `<td>${s.pickupAddresses[i] || ''}</td>`).join('');
            const deliveryCells = Array.from({ length: maxDeliveries }, (_, i) => `<td>${s.deliveryAddresses[i] || ''}</td>`).join('');

            return `
                <tr>
                  <td>${new Date(s.date + 'T00:00:00').toLocaleDateString()}</td>
                  <td>${s.requesterName}</td>
                  ${pickupCells}
                  ${deliveryCells}
                  <td class="money">R$ ${s.cost.toFixed(2)}</td>
                  <td>${getStatusLabel(s.status)}</td>
                  <td>${paymentLabel}</td>
                  <td class="${s.paid ? 'status-paid' : 'status-pending'}">${s.paid ? 'PAGO' : 'PENDENTE'}</td>
                  ${isInternal ? `
                  <td class="money">R$ ${(s.driverFee || 0).toFixed(2)}</td>
                  <td class="money" style="color: ${profit >= 0 ? '#16a34a' : '#dc2626'}">R$ ${profit.toFixed(2)}</td>
                  ` : ''}
                </tr>
              `;
        }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const fileName = isInternal
            ? `Relatorio_Interno_${client.name.replace(/\s+/g, '_')}.xls`
            : `Relatorio_Cliente_${client.name.replace(/\s+/g, '_')}.xls`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadCSV = () => {
        setShowExportMenu(false);

        // Calculate max columns
        const maxPickups = Math.max(...filteredServices.map(s => s.pickupAddresses.length), 1);
        const maxDeliveries = Math.max(...filteredServices.map(s => s.deliveryAddresses.length), 1);

        const pickupHeaders = Array.from({ length: maxPickups }, (_, i) => `Coleta ${i + 1}`);
        const deliveryHeaders = Array.from({ length: maxDeliveries }, (_, i) => `Entrega ${i + 1}`);

        const headers = ['Data', 'Solicitante', ...pickupHeaders, ...deliveryHeaders, 'Valor (R$)', 'Status Serviço', 'Método', 'Pagamento'];

        const rows = filteredServices.map(s => {
            // Helper to escape quotes in strings for CSV
            const safeString = (str: string) => `"${str.replace(/"/g, '""')}"`;

            const pickupCols = Array.from({ length: maxPickups }, (_, i) => safeString(s.pickupAddresses[i] || ''));
            const deliveryCols = Array.from({ length: maxDeliveries }, (_, i) => safeString(s.deliveryAddresses[i] || ''));

            return [
                new Date(s.date + 'T00:00:00').toLocaleDateString(),
                safeString(s.requesterName),
                ...pickupCols,
                ...deliveryCols,
                s.cost.toFixed(2).replace('.', ','),
                getStatusLabel(s.status),
                getPaymentMethodLabel(s.paymentMethod),
                s.paid ? 'PAGO' : 'PENDENTE'
            ].join(';'); // Use semicolon for better compatibility with BR locale (Excel/Sheets)
        });

        // Add BOM for UTF-8 recognition in Excel
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

    const isAllSelected = filteredServices.length > 0 && selectedIds.size === filteredServices.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredServices.length;

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
                    {/* Status Summary Bar - NEW FEATURE */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-slide-down">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><List size={12} /> Total</div>
                            <div className="text-xl font-bold text-slate-800 dark:text-white">{statusCounts.TOTAL}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 shadow-sm flex flex-col justify-between">
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1"><CheckCircle size={12} /> Concluídos</div>
                            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{statusCounts.DONE}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 shadow-sm flex flex-col justify-between">
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1 flex items-center gap-1"><Bike size={12} /> Em Rota</div>
                            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{statusCounts.IN_PROGRESS}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Clock size={12} /> Pendentes</div>
                            <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{statusCounts.PENDING}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm flex flex-col justify-between">
                            <div className="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1 flex items-center gap-1"><XCircle size={12} /> Cancelados</div>
                            <div className="text-xl font-bold text-red-700 dark:text-red-300">{statusCounts.CANCELLED}</div>
                        </div>
                    </div>

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
                        <form onSubmit={handleSaveService} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 space-y-6 animate-slide-down">
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                                    {editingServiceId ? 'Editar Corrida' : 'Registrar Nova Corrida'}
                                </h3>
                                <div className="flex flex-col items-end">
                                    <label className="text-xs text-slate-600 dark:text-slate-300 font-bold mb-1">Data do Serviço</label>
                                    <input
                                        required
                                        type="date"
                                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                                        value={serviceDate}
                                        onChange={e => setServiceDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pickup Addresses */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Endereço(s) de Coleta</label>
                                    {pickupAddresses.map((addr, idx) => (
                                        <div key={`pickup-${idx}`} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-2.5 text-blue-600">
                                                    <MapPin size={16} />
                                                </div>
                                                <input
                                                    required
                                                    className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400"
                                                    value={addr}
                                                    onChange={e => handleAddressChange('pickup', idx, e.target.value)}
                                                    placeholder="Endereço de coleta"
                                                />
                                            </div>
                                            {pickupAddresses.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('pickup')} className="text-sm text-blue-700 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Adicionar Coleta Extra
                                    </button>
                                </div>

                                {/* Delivery Addresses */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Endereço(s) de Entrega</label>
                                    {deliveryAddresses.map((addr, idx) => (
                                        <div key={`delivery-${idx}`} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-2.5 text-emerald-600">
                                                    <MapPin size={16} />
                                                </div>
                                                <input
                                                    required
                                                    className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400"
                                                    value={addr}
                                                    onChange={e => handleAddressChange('delivery', idx, e.target.value)}
                                                    placeholder="Endereço de entrega"
                                                />
                                            </div>
                                            {deliveryAddresses.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('delivery')} className="text-sm text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Adicionar Entrega Extra
                                    </button>
                                </div>

                                {/* Financials */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">Valor Cobrado (R$)</label>
                                        <input required type="number" min="0" step="0.01" className="w-full p-2 border border-emerald-300 dark:border-emerald-600 rounded-lg focus:ring-emerald-500 outline-none font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder-slate-400" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                        <input required type="number" min="0" step="0.01" className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-red-500 outline-none font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder-slate-400" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Solicitado Por</label>
                                        <input required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome do funcionário" />
                                    </div>
                                </div>

                                <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status da Entrega</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={serviceStatus}
                                            onChange={e => setServiceStatus(e.target.value as ServiceStatus)}
                                        >
                                            <option value="PENDING">Pendente (Aguardando Coleta)</option>
                                            <option value="IN_PROGRESS">Em Rota (Motoboy Saiu)</option>
                                            <option value="DONE">Concluído (Entregue)</option>
                                            <option value="CANCELLED">Cancelado</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Método de Pagamento</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(method => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method)}
                                                    className={`flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-bold transition-all ${paymentMethod === method
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-600 text-blue-800 dark:text-blue-400'
                                                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                        }`}
                                                >
                                                    {getPaymentMethodLabel(method)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={resetForm} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-4 py-2.5 font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg hover:bg-emerald-700 font-bold shadow-sm hover:shadow-md transition-all">
                                    {editingServiceId ? 'Atualizar Registro' : 'Salvar Registro'}
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}

            {/* Filter Bar (Shared) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white whitespace-nowrap hidden sm:block">
                        {activeTab === 'services' ? 'Histórico de Corridas' : 'Detalhes Financeiros'}
                    </h3>

                    {selectedIds.size > 0 ? (
                        <div className="flex items-center gap-3 w-full lg:w-auto animate-fade-in bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800/50">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap px-2">{selectedIds.size} selecionado(s)</span>
                            <div className="h-6 w-px bg-blue-200 dark:bg-blue-800/50"></div>
                            <button
                                onClick={() => handleBulkStatusChange(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
                            >
                                <CheckCircle size={14} />
                                Marcar PAGO
                            </button>
                            <button
                                onClick={() => handleBulkStatusChange(false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
                            >
                                <AlertCircle size={14} />
                                Marcar PENDENTE
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 items-center text-sm flex-wrap">
                            {/* Status Filter Buttons */}
                            <div className="flex bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden p-1 gap-1 w-full sm:w-auto">
                                <button
                                    onClick={() => setStatusFilter('ALL')}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-slate-100 dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setStatusFilter('PAID')}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'PAID' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                >
                                    Pagos
                                </button>
                                <button
                                    onClick={() => setStatusFilter('PENDING')}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                >
                                    Pendentes
                                </button>
                            </div>

                            <div className="flex gap-1 w-full sm:w-auto">
                                <button onClick={() => setDateRange('today')} className="flex-1 sm:flex-none px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors">Hoje</button>
                                <button onClick={() => setDateRange('week')} className="flex-1 sm:flex-none px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors">Semana</button>
                                <button onClick={() => setDateRange('month')} className="flex-1 sm:flex-none px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors">Mês</button>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 w-full sm:w-auto">
                                <Filter size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                <input
                                    type="date"
                                    className="outline-none text-slate-700 dark:text-slate-200 font-medium bg-white dark:bg-slate-700 w-full sm:w-auto text-xs sm:text-sm"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="text-slate-400 font-bold">-</span>
                                <input
                                    type="date"
                                    className="outline-none text-slate-700 dark:text-slate-200 font-medium bg-white dark:bg-slate-700 w-full sm:w-auto text-xs sm:text-sm"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {/* Quick PDF Button */}
                            <button
                                onClick={() => handleExportPDF('client')}
                                disabled={isGeneratingPdf}
                                className="w-full sm:w-auto text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                title="Baixar Relatório em PDF"
                            >
                                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                PDF
                            </button>

                            {/* Export Button (Available in both tabs) */}
                            <div className="relative w-full sm:w-auto">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="w-full sm:w-auto text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-1 border border-emerald-300 dark:border-emerald-700 whitespace-nowrap"
                                >
                                    <FileSpreadsheet size={16} />
                                    Exportar
                                    <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                                </button>
                                {showExportMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden animate-fade-in">
                                            <button
                                                onClick={() => handleExportPDF('client')}
                                                disabled={isGeneratingPdf}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                                            >
                                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                                                    {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">Baixar Relatório PDF</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Formato profissional para impressão</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={downloadCSV}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                                            >
                                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                                                    <Table size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">Baixar Planilha CSV</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Compatível com Excel e Google Sheets</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => exportExcel('client')}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                                            >
                                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">Para o Cliente (.xls)</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sem custos internos</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => exportExcel('internal')}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                                            >
                                                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">Interno (.xls)</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completa com lucros</p>
                                                </div>
                                            </button>

                                            {/* NEW: Internal PDF Button */}
                                            <button
                                                onClick={() => handleExportPDF('internal')}
                                                disabled={isGeneratingPdf}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3"
                                            >
                                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                                                    {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">Relatório Interno (PDF)</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Inclui custos e lucros</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* TAB 2: FINANCIAL DASHBOARD CONTENT (Only visible in 'financial' tab) */}
                {activeTab === 'financial' && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 space-y-6">
                        {/* Main Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 border-l-4 border-l-emerald-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">Valor Recebido (Pago)</p>
                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">R$ {stats.totalPaid.toFixed(2)}</p>
                                    </div>
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                                        <CheckCircle size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 border-l-4 border-l-amber-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">Valor a Receber (Pendente)</p>
                                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">R$ {stats.totalPending.toFixed(2)}</p>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full">
                                        <AlertCircle size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Breakdown */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase mb-4">Entradas por Método</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                    <div className="flex items-center gap-2">
                                        <Banknote size={18} className="text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-slate-700 dark:text-slate-300 font-bold">Dinheiro</span>
                                    </div>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">R$ {stats.revenueByMethod['CASH'].toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                    <div className="flex items-center gap-2">
                                        <QrCode size={18} className="text-blue-600 dark:text-blue-400" />
                                        <span className="text-slate-700 dark:text-slate-300 font-bold">Pix</span>
                                    </div>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">R$ {stats.revenueByMethod['PIX'].toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/50">
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
                                        <span className="text-slate-700 dark:text-slate-300 font-bold">Cartão</span>
                                    </div>
                                    <span className="font-bold text-purple-700 dark:text-purple-400">R$ {stats.revenueByMethod['CARD'].toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DATA TABLE (Shared but with different columns based on tab) */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {/* Checkbox Header */}
                                <th className="p-4 w-12">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        disabled={filteredServices.length === 0}
                                    >
                                        {isAllSelected ? <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" /> :
                                            isSomeSelected ? <MinusSquare size={20} className="text-blue-600 dark:text-blue-400" /> :
                                                <Square size={20} />}
                                    </button>
                                </th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white">Data</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white">Rota</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white">Solicitante</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white text-right">Cobrado</th>

                                {/* Conditional Columns */}
                                {activeTab === 'services' && (
                                    <>
                                        <th className="p-4 font-bold text-slate-800 dark:text-white text-center">Status Serviço</th>
                                        <th className="p-4 font-bold text-slate-800 dark:text-white text-right">Motoboy</th>
                                        <th className="p-4 font-bold text-slate-800 dark:text-white text-right">Lucro</th>
                                    </>
                                )}

                                {/* Financial Tab Columns */}
                                <th className="p-4 font-bold text-slate-800 dark:text-white text-center">Método</th>
                                <th className="p-4 font-bold text-slate-800 dark:text-white text-center">Pagamento</th>

                                <th className="p-4 text-center w-24 font-bold text-slate-800 dark:text-white">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                                        {startDate ? 'Nenhuma corrida encontrada no período selecionado.' : 'Nenhuma corrida registrada.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredServices.map(service => {
                                    const profit = service.cost - (service.driverFee || 0);
                                    const isSelected = selectedIds.has(service.id);

                                    return (
                                        <tr
                                            key={service.id}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${isSelected ? 'bg-blue-50/70 dark:bg-blue-900/10' : ''} cursor-pointer`}
                                            onClick={(e) => {
                                                // If clicking a button or input, don't trigger document view
                                                if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                                                setViewingService(service);
                                            }}
                                        >
                                            <td className="p-4 align-top">
                                                <button onClick={(e) => { e.stopPropagation(); toggleSelectRow(service.id); }} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                    {isSelected ? <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" /> : <Square size={20} />}
                                                </button>
                                            </td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300 whitespace-nowrap align-top font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    {new Date(service.date + 'T00:00:00').toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-4 max-w-xs align-top">
                                                <div className="flex flex-col gap-2">
                                                    {service.pickupAddresses.map((addr, i) => (
                                                        <div key={i} className="flex items-start gap-2 text-slate-800 dark:text-white font-medium">
                                                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                                            <span className="text-xs">{addr}</span>
                                                        </div>
                                                    ))}
                                                    {service.deliveryAddresses.map((addr, i) => (
                                                        <div key={i} className="flex items-start gap-2 text-slate-800 dark:text-white font-medium">
                                                            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                                            <span className="text-xs">{addr}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300 align-top font-medium">
                                                {service.requesterName}
                                            </td>
                                            <td className="p-4 text-right font-bold text-emerald-700 dark:text-emerald-400 align-top">
                                                R$ {service.cost.toFixed(2)}
                                            </td>

                                            {activeTab === 'services' && (
                                                <>
                                                    <td className="p-4 align-top text-center">
                                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(service.status)}`}>
                                                            {getStatusIcon(service.status)}
                                                            {getStatusLabel(service.status)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-red-600 dark:text-red-400 align-top">
                                                        R$ {service.driverFee?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className={`p-4 text-right font-bold align-top ${profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                                                        R$ {profit.toFixed(2)}
                                                    </td>
                                                </>
                                            )}

                                            {/* Payment Method Column */}
                                            <td className="p-4 align-top text-center">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {getPaymentIcon(service.paymentMethod)}
                                                    {getPaymentMethodLabel(service.paymentMethod)}
                                                </div>
                                            </td>

                                            {/* Payment Status Column - Interactive */}
                                            <td className="p-4 align-top text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleTogglePayment(service); }}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${service.paid
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50'
                                                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/50'
                                                        }`}
                                                    title={service.paid ? "Marcar como Pendente" : "Marcar como Pago"}
                                                >
                                                    {service.paid ? (
                                                        <>
                                                            <CheckCircle size={14} />
                                                            PAGO
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertCircle size={14} />
                                                            PENDENTE
                                                        </>
                                                    )}
                                                </button>
                                            </td>

                                            <td className="p-4 align-top">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingService(service); }}
                                                        className="text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                        title="Visualizar Documento"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditService(service); }}
                                                        className="text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                        title="Editar Corrida"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    {/* --- BOTÃO DE EXCLUIR SERVIÇO --- */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setServiceToDelete(service); }}
                                                        className="text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Excluir Corrida"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
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
