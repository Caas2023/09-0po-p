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

// ... (Funções auxiliares mantidas) ...

export const ClientDetails: React.FC<any> = ({ client, currentUser, onBack }) => {
    // ... (Estados da tabela mantidos) ...
    // Estados do Formulário (Precisam existir)
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
    const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
    const [cost, setCost] = useState(''); 
    const [driverFee, setDriverFee] = useState(''); 
    const [waitingTime, setWaitingTime] = useState(''); // NEW
    const [extraFee, setExtraFee] = useState('');       // NEW
    const [requester, setRequester] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    const [isPaid, setIsPaid] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

    // ... (Handlers) ...

    const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
    const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* ... */}
            
            {activeTab === 'services' && (
                <>
                    <div className="flex justify-end">
                        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Cancelar' : 'Nova Corrida'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveService(e); }} className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-700 space-y-6 animate-slide-down">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                                <h3 className="font-bold text-white text-lg">{editingServiceId ? 'Editar Corrida' : 'Registrar Nova Corrida'}</h3>
                                {/* Data e Solicitante no topo para padronizar com Dashboard */}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="text-white font-bold p-2.5 border border-slate-700 rounded-lg bg-slate-800">
                                    <span className="text-xs text-slate-400 block">Cliente</span>
                                    {client.name}
                                </div>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3 top-3 text-slate-500" />
                                    <input required type="date" className="w-full pl-10 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                                </div>
                            </div>

                            {/* Endereços - Padronizado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3 p-4 bg-blue-900/10 rounded-xl border border-blue-900/30">
                                    <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta</h3>
                                    {pickupAddresses.map((addr, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                            <input className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
                                            {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)}><X size={16} className="text-red-400" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs font-bold text-blue-400 flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                                </div>
                                <div className="space-y-3 p-4 bg-emerald-900/10 rounded-xl border border-emerald-900/30">
                                    <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrega</h3>
                                    {deliveryAddresses.map((addr, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                                            <input className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                            {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)}><X size={16} className="text-red-400" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
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
                                            <input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-emerald-500 outline-none" value={cost} onChange={e => setCost(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                        <div className="relative">
                                            <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-red-500 outline-none" value={driverFee} onChange={e => setDriverFee(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Espera (R$)</label>
                                        <div className="relative">
                                            <Timer size={14} className="absolute left-3 top-3 text-slate-500" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Soma no total do sistema</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Taxa Extra (R$)</label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-3 text-slate-500" />
                                            <input type="number" step="0.01" className="w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={extraFee} onChange={e => setExtraFee(e.target.value)} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Soma apenas no PDF do Cliente</p>
                                    </div>
                                </div>
                                {/* BOX TOTAIS */}
                                <div className="p-4 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Interno</span>
                                        <span className="text-xl font-bold text-white">R$ {currentTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-bold text-slate-500 uppercase">Total PDF</span>
                                        <span className="text-sm font-bold text-slate-300">R$ {pdfTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Solicitante & Pagamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Solicitante</label>
                                    <input required className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={requester} onChange={e => setRequester(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Pagamento</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(m => (
                                            <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex items-center justify-center py-2 rounded-lg border text-xs font-bold ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-600 text-slate-400'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center p-4 border border-slate-700 rounded-xl">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                        {isPaid && <CheckCircle size={14} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                    <span className="text-sm font-bold text-slate-300">Status do Pagamento: {isPaid ? 'Pago' : 'Pendente'}</span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button type="button" onClick={resetForm} className="px-4 py-2 font-bold text-slate-600">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    )}
            
            {/* ... */}
        </div>
    );
};
