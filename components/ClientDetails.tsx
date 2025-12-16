import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
import { saveService, updateService, getServicesByClient, bulkUpdateServices, deleteService, restoreService } from '../services/storageService';
import { ArrowLeft, Plus, Calendar, MapPin, Filter, FileSpreadsheet, X, Bike, ChevronDown, FileText, ShieldCheck, Pencil, DollarSign, CheckCircle, AlertCircle, PieChart, List, CheckSquare, Square, MoreHorizontal, User as UserIcon, Building, MinusSquare, Share2, Phone, Mail, Banknote, QrCode, CreditCard, MessageCircle, Loader2, Download, Table, FileDown, Package, Clock, XCircle, Activity, Trash2, AlertTriangle, FileCheck, Timer, Hash, Copy, RotateCcw, Archive } from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
// @ts-ignore
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

// ... (O Restante das importações e componentes auxiliares ServiceDocumentModal permanecem iguais, vou focar no componente principal)

// --- MANTENHA O CÓDIGO DO ServiceDocumentModal IGUAL ---
// ... (Copie o ServiceDocumentModal do código anterior) ...

// AQUI COMEÇA O COMPONENTE PRINCIPAL
export const ClientDetails: React.FC<ClientDetailsProps> = ({ client, currentUser, onBack }) => {
    const [services, setServices] = useState<ServiceRecord[]>([]);
    // Novo estado para Lixeira de Serviços
    const [showTrash, setShowTrash] = useState(false);

    useEffect(() => {
        getServicesByClient(client.id).then((data) => setServices(data));
    }, [client.id, showTrash]); // Recarrega se mudar o modo

    const [activeTab, setActiveTab] = useState<'services' | 'financial'>('services');

    const [showForm, setShowForm] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);

    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State (Mantido igual)
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
    
    // Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // ... (Handlers de Endereço, Edit, Form Save mantidos iguais) ...
    // Vou incluir apenas as funções novas e o render atualizado

    const handleRestoreService = async (service: ServiceRecord) => {
        if (confirm("Deseja restaurar este serviço?")) {
             await restoreService(service.id);
             toast.success("Serviço restaurado.");
             const updatedList = await getServicesByClient(client.id);
             setServices(updatedList);
        }
    }

    const confirmDeleteService = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast.success('Serviço movido para lixeira.');
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

    // ... (Outros handlers mantidos) ...

    const getFilteredServices = () => {
        let filtered = services;

        // Filtro Lógica de Lixeira
        if (showTrash) {
            filtered = filtered.filter(s => !!s.deletedAt);
        } else {
            filtered = filtered.filter(s => !s.deletedAt);
        }

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

    // ... (Restante da lógica mantida) ...

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* ... Modais mantidos ... */}

             {/* Header Area */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
                        <ArrowLeft size={20} className="mr-1" /> Voltar
                    </button>
                    
                    {/* TOGGLE TRASH BUTTON */}
                    {currentUser.role === 'ADMIN' && (
                        <button
                            onClick={() => setShowTrash(!showTrash)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                                showTrash 
                                    ? 'bg-red-100 text-red-600 border border-red-200' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            {showTrash ? <ArrowLeft size={14} /> : <Archive size={14} />}
                            {showTrash ? 'Voltar aos Ativos' : 'Ver Lixeira'}
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700">
                     <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                {client.name}
                                {showTrash && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md border border-red-200 uppercase">Lixeira</span>}
                                {/* ... Categoria tag ... */}
                            </h1>
                            {/* ... Detalhes do cliente ... */}
                        </div>
                    </div>
                    {/* ... Tabs ... */}
                </div>
            </div>

            {/* ... Conteúdo das Tabs ... */}

            {/* TABELA - Coluna de Ações Atualizada */}
             <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        {/* ... Thead igual ... */}
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                             {/* ... Loop ... */}
                                    {/* Dentro do map, na célula de ações: */}
                                            <td className="p-4 align-top">
                                                <div className="flex gap-1">
                                                    {showTrash ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRestoreService(service); }}
                                                            className="text-emerald-500 hover:text-emerald-700 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1"
                                                            title="Restaurar Serviço"
                                                        >
                                                            <RotateCcw size={18} />
                                                            Restaurar
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDuplicateService(service); }}
                                                                className="text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                                title="Repetir Serviço (Hoje)"
                                                            >
                                                                <Copy size={18} />
                                                            </button>
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
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setServiceToDelete(service); }}
                                                                className="text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                title="Excluir Corrida"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                    {/* ... Fim do loop ... */}
                        </tbody>
                    </table>
                </div>
        </div>
    );
};
