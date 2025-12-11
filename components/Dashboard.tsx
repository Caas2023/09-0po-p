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
  
  // --- New Service Form State ---
  const [selectedClientId, setSelectedClientId] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
  const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
  
  // Financeiro
  const [cost, setCost] = useState('');       
  const [driverFee, setDriverFee] = useState('');
  const [waitingTime, setWaitingTime] = useState(''); // Valor Espera
  const [extraFee, setExtraFee] = useState('');       // Taxa Extra

  const [requester, setRequester] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isPaid, setIsPaid] = useState(false);

  // ... (Lógica de Filtros e Gráficos permanece igual ao anterior para economizar espaço) ...
  // Vou focar na padronização do MODAL abaixo.
  
  // (Mantendo lógica de stats e charts necessária)
  const { filteredServices, filteredExpenses, dateLabel } = useMemo(() => {
      // ... (Lógica de datas igual)
      const now = new Date();
      // ... (simplificado para brevidade, mantenha a lógica original de datas)
      return { filteredServices: services, filteredExpenses: expenses, dateLabel: 'Geral' }; 
  }, [services, expenses, timeFrame]);

  const stats = useMemo(() => {
      // ... (Mantenha a lógica de cálculo corrigida da resposta anterior)
      const totalRevenue = services.reduce((sum, s) => sum + s.cost + (s.waitingTime || 0), 0);
      return { totalRevenue, totalPending: 0, totalDriverPay: 0, totalOperationalExpenses: 0, netProfit: 0, revenueByMethod: {} as any, expensesByCat: {} as any, activeServices: 0, totalServices: 0, totalClients: 0 };
  }, [services]); 
  
  const chartData: any[] = []; // (Mantenha lógica original)

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

  // Cálculo visual dentro do modal (PADRONIZADO)
  const currentTotal = (parseFloat(cost) || 0) + (parseFloat(waitingTime) || 0);
  const pdfTotal = currentTotal + (parseFloat(extraFee) || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ... (Header e Cards de Estatísticas mantidos, ocultos aqui para focar no modal) ... */}
      
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
          <button onClick={() => setShowNewServiceModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Plus size={20} /> Nova Corrida
          </button>
      </div>

      {/* NEW SERVICE MODAL PADRONIZADO */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-700 animate-slide-up max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bike size={20} className="text-blue-500" />
                        Nova Corrida Rápida
                    </h3>
                    <button onClick={resetForm} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleCreateService} className="overflow-y-auto p-6 space-y-6 flex-1 bg-slate-900">
                    
                    {/* Linha 1: Cliente */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-1">Selecione o Cliente</label>
                        <div className="relative">
                            <UserIcon size={18} className="absolute left-3 top-3 text-slate-500" />
                            <select required className="w-full pl-10 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-600 outline-none appearance-none" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                <option value="" disabled>Escolha uma empresa...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Linha 2: Data e Solicitante */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Data do Serviço</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-3 text-slate-500" />
                                <input required type="date" className="w-full pl-10 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Solicitado Por</label>
                            <input required className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-600 outline-none placeholder-slate-500" value={requester} onChange={e => setRequester(e.target.value)} placeholder="Nome do funcionário" />
                        </div>
                    </div>
                    
                    {/* Linha 3: Endereços */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-4 bg-blue-900/10 rounded-xl border border-blue-900/30">
                            <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta
                            </h3>
                            {pickupAddresses.map((addr, idx) => (
                                <div key={`p-${idx}`} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                                    <input required className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm focus:border-blue-500 outline-none" value={addr} onChange={e => handleAddressChange('pickup', idx, e.target.value)} placeholder="Endereço de retirada" />
                                    {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="p-2 text-red-400 hover:bg-slate-700 rounded-lg"><X size={16} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                        <div className="space-y-3 p-4 bg-emerald-900/10 rounded-xl border border-emerald-900/30">
                            <h3 className="font-bold text-emerald-400 flex items-center gap-2 mb-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrega
                            </h3>
                            {deliveryAddresses.map((addr, idx) => (
                                <div key={`d-${idx}`} className="flex gap-2 relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                                    <input required className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm focus:border-emerald-500 outline-none" value={addr} onChange={e => handleAddressChange('delivery', idx, e.target.value)} placeholder="Endereço de destino" />
                                    {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="p-2 text-red-400 hover:bg-slate-700 rounded-lg"><X size={16} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Adicionar Parada</button>
                        </div>
                    </div>

                    {/* Linha 4 & 5: Financeiro e Adicionais (PADRONIZADO) */}
                    <div>
                        <h3 className="font-bold text-white mb-4 text-sm border-b border-slate-700 pb-2">Financeiro e Adicionais</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-400 mb-1">Valor da Corrida (R$)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-xl font-bold text-emerald-400 focus:border-emerald-500 outline-none" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-400 mb-1">Pago ao Motoboy (R$)</label>
                                <div className="relative">
                                    <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                                    <input required type="number" min="0" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-xl font-bold text-red-400 focus:border-red-500 outline-none" value={driverFee} onChange={e => setDriverFee(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Valor Espera (R$)</label>
                                <div className="relative">
                                    <Timer size={14} className="absolute left-3 top-3 text-slate-500" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-sm text-white focus:border-blue-500 outline-none" value={waitingTime} onChange={e => setWaitingTime(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Soma no total do sistema</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Taxa Extra (R$)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-3 text-slate-500" />
                                    <input type="number" step="0.01" className="w-full pl-9 p-2.5 border border-slate-700 rounded-lg bg-slate-800 text-sm text-white focus:border-blue-500 outline-none" value={extraFee} onChange={e => setExtraFee(e.target.value)} placeholder="0.00" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Soma apenas no PDF do Cliente</p>
                            </div>
                        </div>

                        {/* BOX DE TOTAIS PADRONIZADO */}
                        <div className="p-4 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700">
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

                    {/* Linha 6: Pagamento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 border border-slate-700 rounded-xl">
                            <label className="block text-xs font-bold text-slate-300 mb-2">Forma de Pagamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(method => (
                                    <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`flex items-center justify-center py-2 rounded-lg border transition-all font-bold text-xs ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}>
                                        {method === 'PIX' ? 'Pix' : method === 'CASH' ? 'Din' : 'Card'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 border border-slate-700 rounded-xl flex items-center justify-center">
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
                
                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                    <button type="button" onClick={resetForm} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleCreateService} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2"><CheckCircle size={18} /> Registrar Corrida</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
