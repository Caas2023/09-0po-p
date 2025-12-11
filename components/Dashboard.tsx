import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Client, ServiceRecord, ExpenseRecord, PaymentMethod, User, ServiceStatus } from '../types';
import { saveService, updateService, deleteService } from '../services/storageService';
import { TrendingUp, DollarSign, Bike, Wallet, Banknote, QrCode, CreditCard, Calendar, Filter, Utensils, Fuel, Clock, Users, Trophy, Package, ArrowUpRight, ArrowDownRight, Plus, X, MapPin, User as UserIcon, CheckCircle, AlertCircle, MoreVertical, Pencil, Trash2, Timer } from 'lucide-react';
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

export function Dashboard({ clients, services, expenses, currentUser, onRefresh }: DashboardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTHLY');
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [filter, setFilter] = useState<'TODOS' | 'PENDENTE' | 'PAGO'>('TODOS');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // --- New Service Form State ---
  const [selectedClientId, setSelectedClientId] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
  const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
  
  // Financeiro
  const [cost, setCost] = useState('');       // Valor Base
  const [driverFee, setDriverFee] = useState('');
  const [waitingTime, setWaitingTime] = useState(''); // Espera (R$)
  const [extraFee, setExtraFee] = useState('');       // Taxa Extra (R$)

  const [requester, setRequester] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isPaid, setIsPaid] = useState(false);

  // 1. Filter Data based on TimeFrame
  const { filteredServices, filteredExpenses, dateLabel } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startStr = '';
    let endStr = '';
    let label = '';

    if (timeFrame === 'DAILY') {
        startStr = getLocalDateStr(now);
        endStr = startStr;
        label = 'Hoje';
    } else if (timeFrame === 'WEEKLY') {
        const start = new Date(now);
        const day = start.getDay(); 
        const diff = start.getDate() - day;
        start.setDate(diff);
        startStr = getLocalDateStr(start);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        endStr = getLocalDateStr(end);
        label = 'Esta Semana';
    } else if (timeFrame === 'MONTHLY') {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0);
        startStr = getLocalDateStr(start);
        endStr = getLocalDateStr(end);
        label = 'Este Mês';
    } else if (timeFrame === 'YEARLY') {
        const start = new Date(currentYear, 0, 1);
        const end = new Date(currentYear, 11, 31);
        startStr = getLocalDateStr(start);
        endStr = getLocalDateStr(end);
        label = 'Este Ano';
    }

    const filterByDate = (itemDate: string) => {
        const dateStr = itemDate.includes('T') ? itemDate.split('T')[0] : itemDate;
        return dateStr >= startStr && dateStr <= endStr;
    };

    return {
        filteredServices: services.filter(s => filterByDate(s.date)),
        filteredExpenses: expenses.filter(e => filterByDate(e.date)),
        dateLabel: label
    };
  }, [services, expenses, timeFrame]);
  
  // 2. Calculate Stats
  const stats = useMemo(() => {
    // Receita Total = Custo Base + Tempo de Espera
    const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
    const totalDriverPay = filteredServices.reduce((sum, s) => sum + (s.driverFee || 0), 0);
    const totalPending = filteredServices.filter(s => !s.paid).reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
    const totalOperationalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalDriverPay - totalOperationalExpenses;

    const totalServices = services.length;
    const totalClients = clients.length;
    const activeServices = filteredServices.filter(s => !s.paid).length;

    const revenueByMethod = filteredServices.reduce((acc, curr) => {
        const method = curr.paymentMethod || 'PIX';
        acc[method] = (acc[method] || 0) + curr.cost + (curr.waitingTime || 0);
        return acc;
    }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

    const expensesByCat = filteredExpenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    return { 
        totalRevenue, totalPending, totalDriverPay, totalOperationalExpenses, 
        netProfit, revenueByMethod, expensesByCat, activeServices,
        totalServices, totalClients
    };
  }, [filteredServices, filteredExpenses, services, clients]);

  // 3. Chart Data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { name: string, revenue: number, cost: number, profit: number, sortKey: number }>();

    const addToMap = (dateStr: string, revenue: number, cost: number) => {
        if (!dateStr) return;
        const normalizedDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [y, m, d] = normalizedDateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        
        let key = '';
        let label = '';
        let order = 0;

        if (timeFrame === 'YEARLY') {
             key = `${date.getFullYear()}-${date.getMonth()}`;
             const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
             label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
             order = date.getMonth();
        } else {
             key = normalizedDateStr;
             label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
             order = date.getTime();
        }

        const entry = dataMap.get(key) || { name: label, revenue: 0, cost: 0, profit: 0, sortKey: order };
        entry.revenue += revenue;
        entry.cost += cost;
        dataMap.set(key, entry);
    };

    filteredServices.forEach(s => addToMap(s.date, s.cost + (s.waitingTime || 0), s.driverFee || 0));
    filteredExpenses.forEach(e => addToMap(e.date, 0, e.amount));

    return Array.from(dataMap.values())
        .map(e => ({ ...e, profit: e.revenue - e.cost }))
        .sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredServices, filteredExpenses, timeFrame]);

  // --- Handlers do Modal ---
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
        
        // Novos Campos
        waitingTime: parseFloat(waitingTime) || 0,
        extraFee: parseFloat(extraFee) || 0,

        requesterName: requester,
        paymentMethod: paymentMethod,
        paid: isPaid,
        status: 'PENDING'
    };

    await saveService(newService);
    toast.success('Corrida registrada com sucesso!');
    resetForm();
    onRefresh();
  };

  const resetForm = () => {
      setSelectedClientId('');
      setServiceDate(new Date().toISOString().split('T')[0]);
      setPickupAddresses(['']);
      setDeliveryAddresses(['']);
      setCost('');
      setDriverFee('');
      setWaitingTime('');
      setExtraFee('');
      setRequester('');
      setPaymentMethod('PIX');
      setIsPaid(false);
      setShowNewServiceModal(false);
  };

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

  // Cálculos Visuais
  const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
  const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER & GLOBAL FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Visão Geral Financeira
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                <Calendar size={14} />
                Exibindo dados de: <span className="font-bold text-slate-700 dark:text-slate-300">{dateLabel}</span>
            </p>
        </div>

        <div className="flex gap-2">
             <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                <button onClick={() => setTimeFrame('DAILY')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${timeFrame === 'DAILY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Hoje</button>
                <button onClick={() => setTimeFrame('WEEKLY')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${timeFrame === 'WEEKLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Semana</button>
                <button onClick={() => setTimeFrame('MONTHLY')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${timeFrame === 'MONTHLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Mês</button>
                <button onClick={() => setTimeFrame('YEARLY')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${timeFrame === 'YEARLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Ano</button>
            </div>
            <button onClick={() => setShowNewServiceModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm flex items-center gap-2">
                <Plus size={20} /> <span className="hidden sm:inline">Nova Corrida</span>
            </button>
        </div>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={48} className="text-blue-600" /></div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Faturamento ({dateLabel})</p>
          <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400">R$ {stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden border-l-4 border-l-amber-400">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={48} className="text-amber-600" /></div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">A Receber</p>
          <h3 className="text-2xl font-bold text-amber-600">R$ {stats.totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Bike size={48} className="text-red-600" /></div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Pago aos Motoboys</p>
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {stats.totalDriverPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={48} className="text-orange-600" /></div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Despesas (Gas/Almoço)</p>
          <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">R$ {stats.totalOperationalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>

         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className="text-emerald-600" /></div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Lucro Líquido</p>
          <h3 className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              R$ {stats.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-slate-500" size={20} /> Evolução: {dateLabel}
                </h2>
            </div>
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

        {/* Right Column: Methods & Expenses */}
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Receitas por Método</h2>
                <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-3"><span className="text-slate-800 dark:text-white font-bold">Dinheiro (Caixa)</span></div>
                        <span className="font-bold text-emerald-700">R$ {stats.revenueByMethod['CASH'].toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3"><span className="text-slate-700 dark:text-slate-300 font-medium">Pix</span></div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {stats.revenueByMethod['PIX'].toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3"><span className="text-slate-700 dark:text-slate-300 font-medium">Cartão</span></div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {stats.revenueByMethod['CARD'].toFixed(2)}</span>
                    </div>
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
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex gap-2"><Utensils size={18}/> Almoço</span>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {(stats.expensesByCat['LUNCH'] || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex gap-2"><Wallet size={18}/> Outros</span>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {(stats.expensesByCat['OTHER'] || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* NEW SERVICE MODAL (PADRONIZADO CONFORME SCREENSHOT) */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Bike size={20} className="text-blue-600" />
                        Nova Corrida Rápida
                    </h3>
                    <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleCreateService} className="overflow-y-auto p-6 space-y-6 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selecione o Cliente</label>
                            <div className="relative">
                                <UserIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                                <select required className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                    <option value="" disabled>Escolha uma empresa...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Serviço</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input required type="date" className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solicitado Por</label>
                            <input required className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none placeholder-slate-400" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome do funcionário" />
                        </div>
                    </div>
                    
                    {/* Routes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
                            <h3 className="font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                                Coleta
                            </h3>
                            {pickupAddresses.map((addr, idx) => (
                                <div key={`p-${idx}`} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                    <input required className="w-full pl-9 p-2.5 border border-blue-200 dark:border-blue-800/50 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
                                    {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><X size={16} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                        <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></div>
                                Entrega
                            </h3>
                            {deliveryAddresses.map((addr, idx) => (
                                <div key={`d-${idx}`} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                                    <input required className="w-full pl-9 p-2.5 border border-emerald-200 dark:border-emerald-900/50 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                    {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><X size={16} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                    </div>

                    {/* Financials - Padrão Exato da Captura */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm">Financeiro e Adicionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Valor da Corrida (R$)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-emerald-300 dark:border-emerald-600 rounded-lg bg-transparent text-lg font-bold text-slate-900 dark:text-white" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                <div className="relative">
                                    <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-red-300 dark:border-red-600 rounded-lg bg-transparent text-lg font-bold text-slate-900 dark:text-white" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Valor Espera (R$)</label>
                                <div className="relative">
                                    <Timer size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm text-slate-900 dark:text-white" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Soma no total do sistema</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Taxa Extra (R$)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm text-slate-900 dark:text-white" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Soma apenas no PDF do Cliente</p>
                            </div>
                        </div>

                        {/* Total Preview Box - Padrão Exato */}
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

                    {/* Payment & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Forma de Pagamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(method => (
                                    <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`flex items-center justify-center p-2 rounded-lg border transition-all font-bold text-xs ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}>
                                        {method === 'PIX' ? 'Pix' : method === 'CASH' ? 'Dinheiro' : 'Cartão'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                    {isPaid && <CheckCircle size={16} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                                <div>
                                    <span className="block font-bold text-slate-200 text-sm">Status do Pagamento</span>
                                    <span className="text-xs text-slate-500">{isPaid ? 'Pago' : 'Aguardando pagamento'}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </form>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                    <button type="button" onClick={resetForm} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleCreateService} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2"><CheckCircle size={18} /> Registrar Corrida</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
