import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
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

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Comprovante de Serviço',
                    text: `Segue o comprovante da ordem #${service.id.slice(0, 8)} - ${client.name}`,
                });
            } else {
                pdf.save(`Ordem_${service.id.slice(0, 8)}.pdf`);
                const message = `Segue o comprovante da ordem #${service.id.slice(0, 8)}. (O arquivo PDF foi baixado no seu dispositivo)`;
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
                            <span className="font-mono text-xl font-bold text-slate-900">#{service.id.slice(0, 8).toUpperCase()}</span>
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
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mb-3 pb-1">Pagamento</h2>
                            <div className="flex justify-end">
                                <div className="w-1/2">
                                    <div className="flex justify-between py-4">
                                        <span className="text-lg font-bold text-slate-900">Total</span>
                                        <span className="text-2xl font-bold text-slate-900">R$ {service.cost.toFixed(2)}</span>
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
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    
    // Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
        setRequester(service.requesterName);
        setPaymentMethod(service.paymentMethod || 'PIX');
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

        const serviceData: ServiceRecord = {
            id: editingServiceId || crypto.randomUUID(),
            ownerId: '',
            clientId: client.id,
            pickupAddresses: cleanPickups,
            deliveryAddresses: cleanDeliveries,
            cost: parseFloat(cost),
            driverFee: parseFloat(driverFee) || 0,
            requesterName: requester,
            date: serviceDate,
            paid: originalService ? originalService.paid : false,
            paymentMethod: paymentMethod,
            status: originalService ? originalService.status : 'PENDING'
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
        if (statusFilter === 'PAID') filtered = filtered.filter(s => s.paid === true);
        else if (statusFilter === 'PENDING') filtered = filtered.filter(s => s.paid === false);

        return filtered.sort((a, b) => {
            const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return 0;
        });
    };

    const filteredServices = getFilteredServices();

    const stats = useMemo(() => {
        const totalPaid = filteredServices.filter(s => s.paid).reduce((sum, s) => sum + s.cost, 0);
        const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost, 0);
        const revenueByMethod = filteredServices.reduce((acc, curr) => {
            const method = curr.paymentMethod || 'PIX';
            acc[method] = (acc[method] || 0) + curr.cost;
            return acc;
        }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);
        return { totalPaid, totalPending, revenueByMethod };
    }, [filteredServices]);

    useEffect(() => { setSelectedIds(new Set()); }, [startDate, endDate, statusFilter, services]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredServices.length && filteredServices.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredServices.map(s => s.id)));
    };
    const toggleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };
    const handleBulkStatusChange = async (newStatus: boolean) => {
        if (selectedIds.size === 0) return;
        const updates = services.filter(s => selectedIds.has(s.id)).map(s => ({ ...s, paid: newStatus }));
        await bulkUpdateServices(updates);
        const updatedList = await getServicesByClient(client.id);
        setServices(updatedList);
        setSelectedIds(new Set());
    };

    // --- PDF EXPORT FUNCTION CORRIGIDA (SEM STATUS) ---
    const handleExportPDF = () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        setShowExportMenu(false);

        setTimeout(() => {
            try {
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const marginX = 10;
                
                const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost, 0);

                // --- HEADER ---
                doc.setFillColor(0, 51, 102); 
                doc.rect(0, 0, pageWidth, 28, 'F');

                doc.setFontSize(16);
                doc.setTextColor(255, 255, 255);
                doc.setFont(undefined, 'bold');
                doc.text("RELATÓRIO DE SERVIÇOS OPERACIONAIS", marginX, 12);
                
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.text(`LogiTrack CRM | ${client.name}`, marginX, 18);

                // --- INFO SECTION ---
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                
                let currentY = 36;
                doc.text(`Cliente/Empresa:`, marginX, currentY);
                doc.setFont(undefined, 'normal');
                doc.text(client.name, marginX + 25, currentY);
                currentY += 4;

                doc.setFont(undefined, 'bold');
                doc.text(`Responsável:`, marginX, currentY);
                doc.setFont(undefined, 'normal');
                doc.text(currentUser.name, marginX + 25, currentY);
                currentY += 4;

                doc.setFont(undefined, 'bold');
                doc.text(`Período:`, marginX, currentY);
                doc.setFont(undefined, 'normal');
                
                let periodText = "Todo o histórico";
                if (startDate && endDate) {
                    periodText = `${new Date(startDate + 'T00:00:00').toLocaleDateString()} a ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
                }
                doc.text(periodText, marginX + 25, currentY);

                const rightX = pageWidth - marginX;
                doc.setFont(undefined, 'bold');
                doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, rightX, 36, { align: 'right' });
                doc.text(`Status do Relatório: Gerado`, rightX, 40, { align: 'right' });

                // --- SUMMARY CARDS ---
                const cardY = 50;
                const cardWidth = (pageWidth - (marginX * 2) - 10) / 2;

                // Card 1
                doc.setFillColor(230, 230, 230); 
                doc.rect(marginX, cardY, cardWidth, 6, 'F');
                doc.setFillColor(245, 245, 245);
                doc.rect(marginX, cardY + 6, cardWidth, 12, 'F');
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text("TOTAL DE SERVIÇOS", marginX + 2, cardY + 4);
                doc.setFontSize(12);
                doc.setFont(undefined, 'normal');
                doc.text(filteredServices.length.toString(), marginX + (cardWidth / 2), cardY + 13, { align: 'center' });

                // Card 2
                const card2X = marginX + cardWidth + 10;
                doc.setFillColor(230, 230, 230);
                doc.rect(card2X, cardY, cardWidth, 6, 'F');
                doc.setFillColor(245, 245, 245);
                doc.rect(card2X, cardY + 6, cardWidth, 12, 'F');
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text("TOTAL FATURADO", card2X + 2, cardY + 4);
                doc.setFontSize(12);
                doc.setFont(undefined, 'normal');
                doc.text(`R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, card2X + (cardWidth / 2), cardY + 13, { align: 'center' });

                // --- TABLE ---
                const tableData = filteredServices.map(s => {
                    // Combine route addresses
                    const route = `R: ${s.pickupAddresses.join(', ')}\nE: ${s.deliveryAddresses.join(', ')}`;
                    
                    return [
                        new Date(s.date + 'T00:00:00').toLocaleDateString(),
                        s.requesterName,
                        route,
                        s.paid ? 'PAGO' : 'PEND',
                        `R$ ${s.cost.toFixed(2).replace('.', ',')}`
                    ];
                });

                autoTable(doc, {
                    startY: 75,
                    head: [['DATA', 'SOLICITANTE', 'ROTA (RETIRADA / ENTREGA)', 'PAGAMENTO', 'VALOR']],
                    body: tableData,
                    theme: 'plain',
                    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top', textColor: 0 },
                    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'left' },
                    columnStyles: {
                        0: { cellWidth: 20 }, // Date
                        1: { cellWidth: 25 }, // Solicitante
                        2: { cellWidth: 'auto' }, // Rota
                        3: { cellWidth: 22, fontStyle: 'bold' }, // Pagamento (index 3)
                        4: { cellWidth: 20, halign: 'right' }  // Valor (index 4)
                    },
                    didParseCell: function(data: any) {
                        // Custom styling for Payment Status column (Index 3 now)
                        if (data.section === 'body' && data.column.index === 3) {
                            if (data.cell.raw === 'PAGO') {
                                data.cell.styles.textColor = [22, 163, 74];
                            } else {
                                data.cell.styles.textColor = [234, 88, 12];
                            }
                        }
                        // Right align value header
                        if (data.section === 'head' && data.column.index === 4) {
                            data.cell.styles.halign = 'right';
                        }
                    },
                    didDrawCell: function(data: any) {
                        if (data.section === 'body' && data.row.index < tableData.length - 1) {
                             const doc = data.doc;
                             doc.setDrawColor(230, 230, 230);
                             doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                        }
                    }
                });

                // Footer
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    const footerY = doc.internal.pageSize.getHeight() - 12;
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.setFillColor(30, 30, 30);
                    doc.roundedRect((pageWidth/2) - 15, footerY - 2, 30, 6, 3, 3, 'F');
                    doc.setTextColor(255);
                    doc.text(`${i} / ${pageCount}`, pageWidth/2, footerY + 2, { align: 'center' });
                }

                doc.save(`Relatorio_${client.name.replace(/\s+/g, '_')}.pdf`);

            } catch (error) {
                console.error("Error generating PDF", error);
                alert("Erro ao gerar PDF.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 100);
    };

    const exportExcel = (type: 'client' | 'internal') => { /* Implementação existente... */ };
    const downloadCSV = () => { /* Implementação existente... */ };

    const isAllSelected = filteredServices.length > 0 && selectedIds.size === filteredServices.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredServices.length;

    return (
        <div className="space-y-6 animate-fade-in relative">

            {/* --- MODAL DE EXCLUSÃO --- */}
            {serviceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up">
                        <div className="p-6 text-center">
