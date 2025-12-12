import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Client, ServiceRecord, ExpenseRecord, PaymentMethod, User } from '../types';
import { saveService } from '../services/storageService';
import { TrendingUp, DollarSign, Bike, Wallet, Calendar, Fuel, Utensils, Plus, X, MapPin, User as UserIcon, CheckCircle, Timer, AlertCircle, Banknote, QrCode, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
  clients: Client[];
  services: ServiceRecord[];
  expenses: ExpenseRecord[];
  currentUser: User;
  onRefresh: () => void;
}

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function Dashboard({ clients = [], services = [], expenses = [], currentUser, onRefresh }: DashboardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTHLY');
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  
  // --- New Service Form State ---
  const [selectedClientId, setSelectedClientId] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
  const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
  const [cost, setCost] = useState('');       
  const [driverFee, setDriverFee] = useState('');
  const [waitingTime, setWaitingTime] = useState('');
  const [extraFee, setExtraFee] = useState('');
  const [requester, setRequester] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isPaid, setIsPaid] = useState(false);

  // Lógica de Filtros e Gráficos
  const { filteredServices, filteredExpenses, dateLabel } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let startStr = '', endStr = '', label = '';

    if (timeFrame === 'DAILY') {
        startStr = getLocalDateStr(now); endStr = startStr; label = 'Hoje';
    } else if (timeFrame === 'WEEKLY') {
        const start = new Date(now); start.setDate(start.getDate() - start.getDay());
        startStr = getLocalDateStr(start);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        endStr = getLocalDateStr(end);
        label = 'Esta Semana';
    } else if (timeFrame === 'MONTHLY') {
        startStr = getLocalDateStr(new Date(currentYear, currentMonth, 1));
        endStr = getLocalDateStr(new Date(currentYear, currentMonth + 1, 0));
        label = 'Este Mês';
    } else if (timeFrame === 'YEARLY') {
        startStr = getLocalDateStr(new Date(currentYear, 0, 1));
        endStr = getLocalDateStr(new Date(currentYear, 11, 31));
        label = 'Este Ano';
    }

    const filterByDate = (d: string) => { const ds = d.includes('T') ? d.split('T')[0] : d; return ds >= startStr && ds <= endStr; };
    return { filteredServices: services.filter(s => filterByDate(s.date)), filteredExpenses: expenses.filter(e => filterByDate(e.date)), dateLabel: label };
  }, [services, expenses, timeFrame]);
  
  const stats = useMemo(() => {
    const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
    const totalDriverPay = filteredServices.reduce((sum, s) => sum + (s.driverFee || 0), 0);
    const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
    const totalOperationalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalDriverPay - totalOperationalExpenses;

    const revenueByMethod = filteredServices.reduce((acc, curr) => {
        const method = curr.paymentMethod || 'PIX';
        acc[method] = (acc[method] || 0) + curr.cost + (curr.waitingTime || 0);
        return acc;
    }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

    const expensesByCat = filteredExpenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    return { totalRevenue, totalPending, totalDriverPay, totalOperationalExpenses, netProfit, revenueByMethod, expensesByCat };
  }, [filteredServices, filteredExpenses]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, any>();
    const addToMap = (dateStr: string, rev: number, cost: number) => {
        if (!dateStr) return;
        const normDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [y, m, d] = normDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        let key = normDate, label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), order = date.getTime();
        
        if (timeFrame === 'YEARLY') {
             key = `${y}-${m}`;
             const mn = date.toLocaleDateString('pt-BR', { month: 'short' });
             label = mn.charAt(0).toUpperCase() + mn.slice(1);
             order = m;
        }
        const entry = dataMap.get(key) || { name: label, revenue: 0, cost: 0, profit: 0, sortKey: order };
        entry.revenue += rev; entry.cost += cost;
        dataMap.set(key, entry);
    };

    filteredServices.forEach(s => addToMap(s.date, s.cost + (s.waitingTime || 0), s.driverFee || 0));
    filteredExpenses.forEach(e => addToMap(e.date, 0, e.amount));

    return Array.from(dataMap.values()).map(e => ({ ...e, profit: e.revenue - e.cost })).sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredServices, filteredExpenses, timeFrame]);

  // --- Handlers ---
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return toast.error('Selecione um cliente.');
    const cleanPickups = pickupAddresses.filter(a => a.trim() !== '');
    const cleanDeliveries = deliveryAddresses.filter(a => a.trim() !== '');
    if (cleanPickups.length === 0 || cleanDeliveries.length === 0) return toast.error('Insira endereços.');

    const newService: ServiceRecord = {
        id: crypto.randomUUID(),
        ownerId: currentUser.id,
        clientId: selectedClientId,
        date: serviceDate,
        pickupAddresses: cleanPickups,
        deliveryAddresses: cleanDeliveries,
        cost: parseFloat(cost) || 0,
        driverFee: parseFloat(driverFee) || 0,
        waitingTime: parseFloat(waitingTime) || 0,
        extraFee: parseFloat(extraFee) || 0,
        requesterName: requester,
        paymentMethod: paymentMethod,
        paid: isPaid,
        status: 'PENDING'
    };

    await saveService(newService);
    toast.success('Corrida registrada!');
    resetForm();
    onRefresh();
  };

  const resetForm = () => {
      setSelectedClientId(''); setServiceDate(new Date().toISOString().split('T')[0]);
      setPickupAddresses(['']); setDeliveryAddresses(['']);
      setCost(''); setDriverFee(''); setWaitingTime(''); setExtraFee('');
      setRequester(''); setPaymentMethod('PIX'); setIsPaid(false);
      setShowNewServiceModal(false);
  };

  const handleAddAddress = (t: 'pickup' | 'delivery') => t === 'pickup' ? setPickupAddresses([...pickupAddresses, '']) : setDeliveryAddresses([...deliveryAddresses, '']);
  const handleRemoveAddress = (t: 'pickup' | 'delivery', i: number) => {
      if (t === 'pickup' && pickupAddresses.length > 1) setPickupAddresses(pickupAddresses.filter((_, idx) => idx !== i));
      else if (t === 'delivery' && deliveryAddresses.length > 1) setDeliveryAddresses(deliveryAddresses.filter((_, idx) => idx !== i));
  };
  const handleAddressChange = (t: 'pickup' | 'delivery', i: number, v: string) => {
      if (t === 'pickup') { const n = [...pickupAddresses]; n[i] = v; setPickupAddresses(n); }
      else { const n = [...deliveryAddresses]; n[i] = v; setDeliveryAddresses(n); }
  };

  const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
  const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Visão Geral Financeira
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                <Calendar size={14} /> Dados de: <span className="font-bold text-slate-700 dark:text-slate-300">{dateLabel}</span>
            </p>
        </div>
        <div className="flex gap-2">
             <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(t => (
                    <button key={t} onClick={() => setTimeFrame(t as TimeFrame)} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${timeFrame === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{t === 'DAILY' ? 'Hoje' : t === 'WEEKLY' ? 'Semana' : t === 'MONTHLY' ? 'Mês' : 'Ano'}</button>
                ))}
            </div>
            <button onClick={() => setShowNewServiceModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">
                <Plus size={20} /> <span className="hidden sm:inline">Nova Corrida</span>
            </button>
        </div>
      </div>
      
      {/* 1. CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Faturamento</p>
          <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400">R$ {stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden border-l-4 border-l-amber-400">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">A Receber</p>
          <h3 className="text-2xl font-bold text-amber-600">R$ {stats.totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Pago aos Motoboys</p>
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {stats.totalDriverPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Despesas</p>
          <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">R$ {stats.totalOperationalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Lucro Líquido</p>
          <h3 className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              R$ {stats.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </h3>
        </div>
      </div>

      {/* 2. GRÁFICOS E DETALHES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><TrendingUp className="text-slate-500" size={20} /> Evolução: {dateLabel}</h2>
            <div className="h-80 w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Bar dataKey="revenue" name="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Custos Totais" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-medium">Sem dados para o período.</div>
            )}
            </div>
        </div>

        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Receitas por Método</h2>
                <div className="space-y-4">
                    {['CASH', 'PIX', 'CARD'].map(m => (
                        <div key={m} className="flex justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 border-slate-100">
                            <span className="text-slate-800 dark:text-white font-bold">{m === 'CASH' ? 'Dinheiro' : m}</span>
                            <span className="font-bold text-slate-800 dark:text-white">R$ {stats.revenueByMethod[m]?.toFixed(2) || '0.00'}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Detalhamento de Gastos</h2>
                <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex gap-2"><Bike size={18}/> Motoboy</span>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {stats.totalDriverPay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex gap-2"><Fuel size={18}/> Gasolina</span>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {(stats.expensesByCat['GAS'] || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- MODAL NOVA CORRIDA PADRONIZADO (FORÇADO DARK MODE) --- */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-700 animate-slide-up max-h-[90vh] flex flex-col text-slate-100">
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#1e293b]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bike size={20} className="text-blue-500" /> Nova Corrida Rápida</h3>
                    <button onClick={resetForm} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleCreateService} className="overflow-y-auto p-6 space-y-6 flex-1 bg-[#0f172a]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Cliente *</label>
                            <div className="relative">
                                <UserIcon size={18} className="absolute left-3 top-3 text-slate-500" />
                                <select required className="w-full pl-10 p-3 border border-slate-700 rounded-lg bg-[#1e293b] text-white focus:ring-2 focus:ring-blue-600 outline-none" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                    <option value="" disabled>Selecione...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Data *</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-3 text-slate-500" />
                                <input required type="date" className="w-full pl-10 p-3 border border-slate-700 rounded-lg bg-[#1e293b] text-white focus:ring-2 focus:ring-blue-600 outline-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                        <div className="p-4 border border-slate-700 rounded-xl flex items-center justify-center bg-[#1e293b]">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                    {isPaid && <CheckCircle size={14} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-300">Status do Pagamento: {isPaid ? 'Pago' : 'Pendente'}</span>
                            </label>
                        </div>
                    </div>
                </form>
                
                <div className="p-4 border-t border-slate-700 bg-[#1e293b] flex justify-end gap-3">
                    <button type="button" onClick={resetForm} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleCreateService} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2"><CheckCircle size={18} /> Registrar Corrida</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
