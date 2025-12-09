import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
import { saveService, updateService, getServicesByClient, bulkUpdateServices, deleteService } from '../services/storageService';
import { ArrowLeft, Plus, Calendar, MapPin, Filter, FileSpreadsheet, X, Bike, ChevronDown, FileText, ShieldCheck, Pencil, DollarSign, CheckCircle, AlertCircle, PieChart, List, CheckSquare, Square, MoreHorizontal, User as UserIcon, Building, MinusSquare, Share2, Phone, Mail, Banknote, QrCode, CreditCard, MessageCircle, Loader2, Download, Table, FileDown, Package, Clock, XCircle, Activity, Trash2, AlertTriangle, FileCheck } from 'lucide-react';
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
    const [cost, setCost] = useState(''); // Client Charge
    const [driverFee, setDriverFee] = useState(''); // Motoboy Pay
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    
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
        setShowForm(true);
        setActiveTab('services'); // Ensure we are on the form tab
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
            // Status field is kept internally if needed but not shown
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

        const revenueByMethod = filteredServices.reduce((acc, curr) => {
            const method = curr.paymentMethod || 'PIX';
            acc[method] = (acc[method] || 0) + curr.cost;
            return acc;
        }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

        return { totalPaid, totalPending, revenueByMethod };
    }, [filteredServices]);

    // --- FUNÇÃO DE EXPORTAÇÃO DO BOLETO (AJUSTADA) ---
    const handleExportBoleto = () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        setShowExportMenu(false);

        setTimeout(() => {
            try {
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
                const marginX = 10;
                
                // Configuração das Linhas
                let currentY = 15;

                // --- TÍTULO PRINCIPAL (NOVO) ---
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text("RELATÓRIO DE SERVIÇOS PRESTADOS", pageWidth / 2, currentY, { align: 'center' });
                currentY += 10;

                // --- 1. CABEÇALHO DIVIDIDO ---
                const boxHeight = 35;
                const midPage = pageWidth / 2;

                // Desenhar borda externa do cabeçalho
                doc.setDrawColor(200);
                doc.setLineWidth(0.1);
                // Linha superior
                doc.line(marginX, currentY, pageWidth - marginX, currentY);
                // Linha inferior
                doc.line(marginX, currentY + boxHeight, pageWidth - marginX, currentY + boxHeight);
                // Linha do meio
                doc.line(midPage, currentY, midPage, currentY + boxHeight);

                // LADO ESQUERDO: DADOS DO CLIENTE (SEM TÍTULO "DADOS DO CLIENTE")
                doc.setTextColor(0);
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text(`Empresa: ${client.name.substring(0, 30)}`, marginX + 2, currentY + 8);
                
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.text(`Responsável: ${client.contactPerson || '-'}`, marginX + 2, currentY + 14);
                
                // Período
                let periodoTxt = "Todo o histórico";
                if(startDate && endDate) {
                    const d1 = new Date(startDate + 'T00:00:00').toLocaleDateString();
                    const d2 = new Date(endDate + 'T00:00:00').toLocaleDateString();
                    periodoTxt = `${d1} a ${d2}`;
                }
                doc.text(`Período: ${periodoTxt}`, marginX + 2, currentY + 20);
                doc.text(`Data Emissão: ${new Date().toLocaleDateString()}`, marginX + 2, currentY + 26);

                // LADO DIREITO: DADOS DO PRESTADOR (SEM TÍTULO "DADOS DO PRESTADOR")
                const rightX = midPage + 4;
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                const myName = currentUser.companyName || currentUser.name || "Sua Empresa";
                doc.text(`Empresa: ${myName.substring(0, 30)}`, rightX, currentY + 8);
                
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                const myCnpj = currentUser.companyCnpj || "CNPJ Não informado";
                doc.text(`CNPJ: ${myCnpj}`, rightX, currentY + 14);
                const myPhone = currentUser.phone || "-";
                doc.text(`WhatsApp: ${myPhone}`, rightX, currentY + 20);
                doc.text(`Resp.: ${currentUser.name.split(' ')[0]}`, rightX, currentY + 26);

                currentY += boxHeight + 10;

                // --- 2. TÍTULO E FATURA ---
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`DETALHAMENTO DE SERVIÇOS`, marginX, currentY);
                doc.line(marginX, currentY + 1, pageWidth - marginX, currentY + 1);
                currentY += 5;

                // --- 3. TABELA DE SERVIÇOS ---
                const tableData = filteredServices.map(s => {
                    return [
                        new Date(s.date + 'T00:00:00').toLocaleDateString().substring(0, 5), // DD/MM
                        s.requesterName.substring(0, 15), // Curto
                        s.pickupAddresses[0] || '-',
                        s.deliveryAddresses[0] || '-',
                        `R$ ${s.cost.toFixed(2)}`
                    ];
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [['DATA', 'SOLICITANTE', 'ORIGEM (COLETA)', 'DESTINO (ENTREGA)', 'VALOR']],
                    body: tableData,
                    theme: 'plain', // Minimalista como pedido
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        textColor: 0,
                        lineColor: 200,
                        lineWidth: 0.1,
                    },
                    headStyles: {
                        fillColor: [240, 240, 240], // Cinza claro
                        textColor: 0,
                        fontStyle: 'bold',
                        lineWidth: 0.1,
                        lineColor: 200
                    },
                    columnStyles: {
                        0: { cellWidth: 15 },
                        1: { cellWidth: 25 },
                        2: { cellWidth: 60 },
                        3: { cellWidth: 60 },
                        4: { cellWidth: 20, halign: 'right' }
                    },
                    margin: { left: marginX, right: marginX }
                });

                // --- 4. RESUMO ---
                // @ts-ignore
                let finalY = doc.lastAutoTable.finalY + 10;
                
                // Evitar quebra de página ruim
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setDrawColor(0);
                doc.setLineWidth(0.1);
                doc.line(marginX, finalY, pageWidth - marginX, finalY); // Linha separadora

                const totalValue = filteredServices.reduce((sum, s) => sum + s.cost, 0);

                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                
                // Alinhamento à direita para o resumo
                const resumoX = 140; 
                
                doc.text("TOTAL DE SERVIÇOS:", resumoX, finalY + 7);
                doc.text(filteredServices.length.toString(), pageWidth - marginX, finalY + 7, { align: 'right' });

                doc.text("VALOR TOTAL:", resumoX, finalY + 14);
                doc.setFontSize(12);
                doc.text(`R$ ${totalValue.toFixed(2)}`, pageWidth - marginX, finalY + 14, { align: 'right' });

                finalY += 25;

                // --- 5. DADOS PARA PAGAMENTO ---
                // Caixa de pagamento
                doc.setFillColor(245, 245, 245);
                doc.rect(marginX, finalY, pageWidth - (marginX * 2), 35, 'F');
                doc.setDrawColor(200);
                doc.rect(marginX, finalY, pageWidth - (marginX * 2), 35, 'S');

                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.setFont(undefined, 'bold');
                doc.text("DADOS PARA PAGAMENTO", marginX + 5, finalY + 7);

                // Calcular vencimento (Ex: Hoje + 3 dias, ou final do mês selecionado)
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 3); // Padrão +3 dias
                const vencimentoStr = dueDate.toLocaleDateString();

                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.text(`Vencimento: ${vencimentoStr}`, marginX + 5, finalY + 15);

                // Placeholder para PIX (Usar CNPJ ou Celular do usuário)
                const chavePix = currentUser.companyCnpj || currentUser.phone || "Solicitar Chave";
                doc.text(`Forma de Pagamento: PIX`, marginX + 5, finalY + 22);
                doc.setFont(undefined, 'bold');
                doc.text(`Chave PIX: ${chavePix}`, marginX + 5, finalY + 28);

                const fileName = `Fatura_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                doc.save(fileName);

            } catch (error) {
                console.error("Error generating Boleto PDF", error);
                alert("Erro ao gerar PDF.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 100);
    };

    const handleExportPDF = (type: 'client' | 'internal' = 'client') => {
        if(type === 'client') handleExportBoleto();
        else alert("Use a opção de planilha para relatórios internos detalhados.");
    };

    const downloadCSV = () => {
        setShowExportMenu(false);
        const maxPickups = Math.max(...filteredServices.map(s => s.pickupAddresses.length), 1);
        const maxDeliveries = Math.max(...filteredServices.map(s => s.deliveryAddresses.length), 1);

        const pickupHeaders = Array.from({ length: maxPickups }, (_, i) => `Coleta ${i + 1}`);
        const deliveryHeaders = Array.from({ length: maxDeliveries }, (_, i) => `Entrega ${i + 1}`);

        // Removed Status
        const headers = ['Data', 'Solicitante', ...pickupHeaders, ...deliveryHeaders, 'Valor (R$)', 'Método', 'Pagamento'];
        
        const rows = filteredServices.map(s => {
            const safeString = (str: string) => `"${str.replace(/"/g, '""')}"`;
            const pickupCols = Array.from({ length: maxPickups }, (_, i) => safeString(s.pickupAddresses[i] || ''));
            const deliveryCols = Array.from({ length: maxDeliveries }, (_, i) => safeString(s.deliveryAddresses[i] || ''));

            return [
                new Date(s.date + 'T00:00:00').toLocaleDateString(),
                safeString(s.requesterName),
                ...pickupCols,
                ...deliveryCols,
                s.cost.toFixed(2).replace('.', ','),
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
        const isInternal = type === 'internal';

        const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost, 0);
        const totalDriver = filteredServices.reduce((sum, s) => sum + (s.driverFee || 0), 0);
        const totalProfit = totalRevenue - totalDriver;

        const maxPickups = Math.max(...filteredServices.map(s => s.pickupAddresses.length), 1);
        const maxDeliveries = Math.max(...filteredServices.map(s => s.deliveryAddresses.length), 1);

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
                                    {/* STATUS REMOVED */}

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
                                                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
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

                            {/* Date Filter */}
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
                                onClick={() => handleExportBoleto()}
                                disabled={isGeneratingPdf}
                                className="w-full sm:w-auto text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                title="Baixar Fatura PDF"
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
                                                onClick={() => handleExportBoleto()}
                                                disabled={isGeneratingPdf}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                                            >
                                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                                                    {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">Baixar Fatura PDF</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Modelo Boleto (Completão)</p>
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
