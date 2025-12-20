import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Bike, 
  Calendar, 
  User, 
  Hash, 
  CheckCircle, 
  X,
  Plus,
  Timer,
  Building 
} from 'lucide-react';
import { Client, ServiceRecord, PaymentMethod, User as UserType } from '../types';
import { getClients, saveService } from '../services/storageService';
import { toast } from 'sonner';

interface NewOrderProps {
  currentUser: UserType;
}

const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- MÁSCARA DE MOEDA (UX) ---
const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para ter os centavos
    const amount = Number(numericValue) / 100;
    
    // Formata para BRL
    return amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

// --- CONVERTER MOEDA PARA FLOAT (PARA SALVAR) ---
const parseCurrency = (value: string) => {
    if (!value) return 0;
    // Remove R$, pontos e substitui vírgula por ponto
    const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
};

export const NewOrder: React.FC<NewOrderProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const [date, setDate] = useState(getLocalDateStr(new Date()));
  const [manualOrderId, setManualOrderId] = useState('');
  const [requester, setRequester] = useState('');
  
  const [pickupAddresses, setPickupAddresses] = useState<string[]>(['']);
  const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>(['']);
  
  // Estados agora guardam a string formatada (Ex: "R$ 50,00")
  const [cost, setCost] = useState('');
  const [driverFee, setDriverFee] = useState('');
  const [waitingTime, setWaitingTime] = useState('');
  const [extraFee, setExtraFee] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      const data = await getClients();
      setClients(data);
    };
    loadClients();
  }, []);

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
      const newArr = [...pickupAddresses];
      newArr[index] = value;
      setPickupAddresses(newArr);
    } else {
      const newArr = [...deliveryAddresses];
      newArr[index] = value;
      setDeliveryAddresses(newArr);
    }
  };

  // Handler genérico para aplicar máscara de moeda
  const handleMoneyInput = (value: string, setter: (v: string) => void) => {
      setter(formatCurrency(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Selecione um cliente.');
      return;
    }

    const cleanPickup = pickupAddresses.filter(a => a.trim());
    const cleanDelivery = deliveryAddresses.filter(a => a.trim());

    if (cleanPickup.length === 0 || cleanDelivery.length === 0) {
      toast.error('Preencha os endereços.');
      return;
    }

    const newService: ServiceRecord = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      clientId: selectedClientId,
      date,
      manualOrderId,
      requesterName: requester,
      pickupAddresses: cleanPickup,
      deliveryAddresses: cleanDelivery,
      // Converte as strings formatadas de volta para Float
      cost: parseCurrency(cost),
      driverFee: parseCurrency(driverFee),
      waitingTime: parseCurrency(waitingTime),
      extraFee: parseCurrency(extraFee),
      paymentMethod,
      paid,
      status: 'PENDING'
    };

    await saveService(newService);
    toast.success('Corrida registrada!');
    
    // Reset Form
    setManualOrderId('');
    setRequester('');
    setPickupAddresses(['']);
    setDeliveryAddresses(['']);
    setCost('');
    setDriverFee('');
    setWaitingTime('');
    setExtraFee('');
    setPaid(false);
  };

  // Cálculos visuais (usando o parser para somar corretamente)
  const currentTotal = parseCurrency(cost) + parseCurrency(waitingTime);
  const pdfTotal = currentTotal + parseCurrency(extraFee);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-300" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nova Corrida</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Preencha os dados do serviço</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        
        {/* Seleção de Cliente */}
        <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Selecione o Cliente</label>
            <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-slate-400" />
                <select 
                    value={selectedClientId} 
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full pl-10 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600 appearance-none"
                >
                    <option value="">Escolha uma empresa...</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Dados Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data</label>
                <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="date" 
                        className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nº Pedido</label>
                <div className="relative">
                    <Hash size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500 uppercase" 
                        placeholder="# EX: 1234"
                        value={manualOrderId} 
                        onChange={e => setManualOrderId(e.target.value)} 
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Solicitado Por</label>
                <input 
                    type="text" 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500" 
                    placeholder="Nome do funcionário"
                    value={requester} 
                    onChange={e => setRequester(e.target.value)} 
                />
            </div>
        </div>

        {/* Endereços */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COLETA */}
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <h3 className="font-bold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Coleta</h3>
                {pickupAddresses.map((addr, idx) => (
                    <div key={idx} className="flex gap-2 relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-blue-500" />
                        <input 
                            className="w-full pl-9 pr-36 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:border-blue-500 outline-none" 
                            value={addr} 
                            onChange={e => handleAddressChange('pickup', idx, e.target.value)} 
                            placeholder="Endereço de retirada" 
                        />
                        
                        {/* BOTÃO MÁGICO: COPIAR DO CADASTRO */}
                        {selectedClient?.address && (
                            <button
                                type="button"
                                onClick={() => handleAddressChange('pickup', idx, selectedClient.address || '')}
                                className="absolute right-8 top-1.5 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-md flex items-center gap-1 transition-colors border border-blue-300"
                                title="Usar endereço do cadastro"
                            >
                                <Building size={12} />
                                Endereço Cliente
                            </button>
                        )}

                        {pickupAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('pickup', idx)} className="absolute right-2 top-2.5"><X size={16} className="text-red-400" /></button>}
                    </div>
                ))}
                <button type="button" onClick={() => handleAddAddress('pickup')} className="text-xs font-bold text-blue-500 flex items-center gap-1 mt-1"><Plus size={14} /> Adicionar Parada</button>
            </div>

            {/* ENTREGA */}
            <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrega</h3>
                {deliveryAddresses.map((addr, idx) => (
                    <div key={idx} className="flex gap-2 relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-emerald-500" />
                        <input 
                            className="w-full pl-9 pr-36 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:border-emerald-500 outline-none" 
                            value={addr} 
                            onChange={e => handleAddressChange('delivery', idx, e.target.value)} 
                            placeholder="Endereço de destino" 
                        />

                        {/* BOTÃO MÁGICO: COPIAR DO CADASTRO */}
                        {selectedClient?.address && (
                            <button
                                type="button"
                                onClick={() => handleAddressChange('delivery', idx, selectedClient.address || '')}
                                className="absolute right-8 top-1.5 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-md flex items-center gap-1 transition-colors border border-emerald-300"
                                title="Usar endereço do cadastro"
                            >
                                <Building size={12} />
                                Endereço Cliente
                            </button>
                        )}

                        {deliveryAddresses.length > 1 && <button type="button" onClick={() => handleRemoveAddress('delivery', idx)} className="absolute right-2 top-2.5"><X size={16} className="text-red-400" /></button>}
                    </div>
                ))}
                <button type="button" onClick={() => handleAddAddress('delivery')} className="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-1"><Plus size={14} /> Adicionar Parada</button>
            </div>
        </div>

        {/* Financeiro (COM MÁSCARAS DE INPUT) */}
        <div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm border-b border-slate-200 dark:border-slate-700 pb-2">Financeiro e Adicionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Valor da Corrida</label>
                    <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-3 text-emerald-500" />
                        <input 
                            type="text" 
                            className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-bold text-lg focus:border-emerald-500 outline-none" 
                            value={cost} 
                            onChange={e => handleMoneyInput(e.target.value, setCost)} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-red-500 dark:text-red-400 mb-1">Pago ao Motoboy</label>
                    <div className="relative">
                        <Bike size={16} className="absolute left-3 top-3 text-red-500" />
                        <input 
                            type="text" 
                            className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-bold text-lg focus:border-red-500 outline-none" 
                            value={driverFee} 
                            onChange={e => handleMoneyInput(e.target.value, setDriverFee)} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">VALOR ESPERA</label>
                    <div className="relative">
                        <Timer size={14} className="absolute left-3 top-3 text-slate-500" />
                        <input 
                            type="text" 
                            className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:border-blue-500 outline-none" 
                            value={waitingTime} 
                            onChange={e => handleMoneyInput(e.target.value, setWaitingTime)} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Soma no total do sistema</p>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">TAXA EXTRA</label>
                    <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-3 text-slate-500" />
                        <input 
                            type="text" 
                            className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:border-blue-500 outline-none" 
                            value={extraFee} 
                            onChange={e => handleMoneyInput(e.target.value, setExtraFee)} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Soma apenas no PDF do Cliente</p>
                </div>
            </div>

            {/* BOX TOTAIS */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg flex justify-between items-center border border-slate-200 dark:border-slate-700">
                <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">TOTAL INTERNO (BASE + ESPERA)</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">R$ {currentTotal.toFixed(2)}</span>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">TOTAL NO PDF (+ TAXA)</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">R$ {pdfTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border border-slate-200 dark:border-slate-600 rounded-xl">
                <div className="grid grid-cols-3 gap-2">
                    {(['PIX', 'CASH', 'CARD'] as PaymentMethod[]).map(m => (
                        <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex items-center justify-center py-2 rounded-lg border text-xs font-bold ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400'}`}>{m}</button>
                    ))}
                </div>
            </div>
            <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center">
                <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${paid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-400'}`}>
                        {paid && <CheckCircle size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={paid} onChange={e => setPaid(e.target.checked)} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Status: {paid ? 'PAGO' : 'PENDENTE'}</span>
                </label>
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2">
                <CheckCircle size={20} />
                Registrar Corrida
            </button>
        </div>
      </form>
    </div>
  );
};
