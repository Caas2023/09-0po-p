import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Client, ServiceRecord, ExpenseRecord } from '../types';
import { TrendingUp, DollarSign, Bike, Wallet, Banknote, QrCode, CreditCard, CalendarDays, Calendar, Filter, Utensils, Fuel, Clock, Users, Trophy, Package } from 'lucide-react';
import { getServices, getExpenses, getClients } from '../services/storageService';

interface DashboardProps {
  currentUser?: any; 
}

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Dashboard: React.FC<DashboardProps> = () => {
  // Estados de dados
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de filtro
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTHLY');
  const [customStart, setCustomStart] = useState(getLocalDateStr(new Date()));
  const [customEnd, setCustomEnd] = useState(getLocalDateStr(new Date()));

  // 1. Determina as datas de Início e Fim baseado no Filtro
  const { startStr, endStr, dateLabel } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let s = '';
    let e = '';
    let l = '';

    if (timeFrame === 'DAILY') {
        s = getLocalDateStr(now);
        e = s;
        l = 'Hoje';
    } else if (timeFrame === 'WEEKLY') {
        const start = new Date(now);
        const day = start.getDay(); 
        const diff = start.getDate() - day;
        start.setDate(diff);
        s = getLocalDateStr(start);
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        e = getLocalDateStr(end);
        l = 'Esta Semana';
    } else if (timeFrame === 'MONTHLY') {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0);
        s = getLocalDateStr(start);
        e = getLocalDateStr(end);
        l = 'Este Mês';
    } else if (timeFrame === 'YEARLY') {
        const start = new Date(currentYear, 0, 1);
        const end = new Date(currentYear, 11, 31);
        s = getLocalDateStr(start);
        e = getLocalDateStr(end);
        l = 'Este Ano';
    } else if (timeFrame === 'CUSTOM') {
        s = customStart;
        e = customEnd;
        l = 'Período Personalizado';
    }
    return { startStr: s, endStr: e, dateLabel: l };
  }, [timeFrame, customStart, customEnd]);

  // 2. Busca os dados (Backend já filtra data, mas Front garante limpeza)
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const clientsData = await getClients();
            setClients(clientsData);

            const [servicesData, expensesData] = await Promise.all([
                getServices(startStr, endStr),
                getExpenses(startStr, endStr)
            ]);

            setServices(servicesData);
            setExpenses(expensesData);
        } catch (error) {
            console.error("Erro ao atualizar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    if (startStr && endStr) {
        fetchData();
    }
  }, [startStr, endStr]); 

  // 3. FILTRAGEM FINAL DE SEGURANÇA (Remove itens da lixeira)
  const { filteredServices, filteredExpenses } = useMemo(() => {
    return {
        // AQUI É A CORREÇÃO: Filtra serviços que NÃO têm data de exclusão
        filteredServices: services.filter(s => !s.deletedAt),
        filteredExpenses: expenses 
    };
  }, [services, expenses]);
  
  // 4. Cálculos Financeiros (Usando apenas os filtrados)
  const stats = useMemo(() => {
    const totalRevenue = filteredServices.reduce((sum, s) => sum + s.cost, 0);
    const totalDriverPay = filteredServices.reduce((sum, s) => sum + (s.driverFee || 0), 0);
    
    const totalPending = filteredServices
        .filter(s => !s.paid)
        .reduce((sum, s) => sum + s.cost, 0);

    const expensesByCat = filteredExpenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const revenueByMethod = filteredServices.reduce((acc, curr) => {
        const method = curr.paymentMethod || 'PIX';
        acc[method] = (acc[method] || 0) + curr.cost;
        return acc;
    }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

    const totalOperationalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const netProfit = totalRevenue - totalDriverPay - totalOperationalExpenses;

    return { 
        totalRevenue, 
        totalPending,
        totalDriverPay, 
        totalOperationalExpenses,
        netProfit, 
        expensesByCat, 
        revenueByMethod
    };
  }, [filteredServices, filteredExpenses]);

  // 5. Dados do Gráfico
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

    filteredServices.forEach(s => addToMap(s.date, s.cost, s.driverFee || 0));
    filteredExpenses.forEach(e => addToMap(e.date, 0, e.amount));

    let result = Array.from(dataMap.values())
        .map(e => ({ ...e, profit: e.revenue - e.cost }))
        .sort((a, b) => a.sortKey - b.sortKey);

    return result;
  }, [filteredServices, filteredExpenses, timeFrame]);

  // 6. Top Clientes
  const topClients = useMemo(() => {
    const clientStats = new Map<string, { name: string, count: number, revenue: number }>();
    
    filteredServices.forEach(s => {
        // Importante: Considera serviços deletados? Não, pois filteredServices já removeu.
        // Mas se o CLIENTE foi deletado, ainda mostramos o nome dele no histórico?
        // Sim, o getClients traz todos. Se quiser esconder clientes deletados do TOP, filtre clients aqui.
        const client = clients.find(c => c.id === s.clientId);
        const name = client ? client.name : 'Desconhecido';
        const id = s.clientId;
        
        const entry = clientStats.get(id) || { name, count: 0, revenue: 0 };
        entry.count += 1;
        entry.revenue += s.cost;
        clientStats.set(id, entry);
    });

    const sortedByRevenue = Array.from(clientStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
        
    const sortedByCount = Array.from(clientStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return { byRevenue: sortedByRevenue, byCount: sortedByCount };
  }, [filteredServices, clients]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER & GLOBAL FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Visão Geral Financeira
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                <Calendar size={14} />
                Exibindo dados de: <span className="font-bold text-slate-700 dark:text-slate-300">{dateLabel}</span>
            </p>
        </div>

        {/* Global Time Controls */}
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto overflow-x-auto max-w-full items-center">
            <button 
                onClick={() => setTimeFrame('DAILY')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${timeFrame === 'DAILY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
            >
                Hoje
            </button>
            <button 
                onClick={() => setTimeFrame('WEEKLY')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${timeFrame === 'WEEKLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
            >
                Semana
            </button>
            <button 
                onClick={() => setTimeFrame('MONTHLY')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${timeFrame === 'MONTHLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
            >
                Mês
            </button>
            <button 
                onClick={() => setTimeFrame('YEARLY')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${timeFrame === 'YEARLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
            >
                Ano
            </button>

            <button 
                onClick={() => setTimeFrame('CUSTOM')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${timeFrame === 'CUSTOM' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
            >
                <Filter size={14} />
                Personalizado
            </button>

            {timeFrame === 'CUSTOM' && (
                <div className="flex items-center gap-2 ml-2 px-2 border-l border-slate-200 dark:border-slate-600 animate-fade-in">
                    <input 
                        type="date" 
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-transparent dark:text-white outline-none focus:border-blue-500"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input 
                        type="date" 
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-transparent dark:text-white outline-none focus:border-blue-500"
                    />
                </div>
            )}
        </div>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign size={48} className="text-blue-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Faturamento</p>
            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400">R$ {stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>

        {/* Pending Receivables */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden border-l-4 border-l-amber-400">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock size={48} className="text-amber-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">A Receber</p>
            <h3 className="text-2xl font-bold text-amber-600">R$ {stats.totalPending.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>

        {/* Driver Costs */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Bike size={48} className="text-red-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Pago aos Motoboys</p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {stats.totalDriverPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>

        {/* Op Expenses */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={48} className="text-orange-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Despesas (Gas/Almoço)</p>
            <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">R$ {stats.totalOperationalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>

         {/* Net Profit */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={48} className="text-emerald-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">Lucro Líquido</p>
            <h3 className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                R$ {stats.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-slate-500 dark:text-slate-400" size={20} />
                    Evolução Financeira
                </h2>
            </div>

            <div className="h-80 w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#000' }}
                        formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Bar dataKey="revenue" name="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Custos Totais" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-medium flex-col gap-2">
                    <CalendarDays size={32} className="opacity-20" />
                    Sem dados para o período selecionado
                </div>
            )}
            </div>
        </div>

        {/* Right Column: Expenses & Methods */}
        <div className="flex flex-col gap-6">
            {/* Revenue Breakdown by Method */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Receitas por Método</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 text-emerald-600 rounded-lg shadow-sm"><Banknote size={18} /></div>
                            <span className="text-slate-800 dark:text-slate-200 font-bold">Dinheiro (Caixa)</span>
                        </div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">R$ {stats.revenueByMethod['CASH'].toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 text-blue-600 rounded-lg shadow-sm"><QrCode size={18} /></div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Pix</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {stats.revenueByMethod['PIX'].toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 text-purple-600 rounded-lg shadow-sm"><CreditCard size={18} /></div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Cartão</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {stats.revenueByMethod['CARD'].toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Detalhamento de Gastos</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"><Bike size={18} /></div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Motoboy</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {stats.totalDriverPay.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><Fuel size={18} /></div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Gasolina</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {(stats.expensesByCat['GAS'] || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><Utensils size={18} /></div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Almoço</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {(stats.expensesByCat['LUNCH'] || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg"><Wallet size={18} /></div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Outros</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">R$ {(stats.expensesByCat['OTHER'] || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Top Clients Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients by Revenue */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Trophy size={20} className="text-yellow-500" />
                Top Clientes (Faturamento)
            </h2>
            <div className="space-y-3">
                {topClients.byRevenue.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Sem dados para exibir.</p>
                ) : (
                    topClients.byRevenue.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                             <div className="flex items-center gap-3">
                                 <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                                     {idx + 1}
                                 </span>
                                 <span className="font-medium text-slate-800 dark:text-white">{client.name}</span>
                             </div>
                             <span className="font-bold text-slate-700 dark:text-slate-300">R$ {client.revenue.toFixed(2)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Top Clients by Volume */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Package size={20} className="text-blue-500" />
                Top Clientes (Volume de Serviços)
            </h2>
            <div className="space-y-3">
                {topClients.byCount.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Sem dados para exibir.</p>
                ) : (
                    topClients.byCount.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                             <div className="flex items-center gap-3">
                                 <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                     {idx + 1}
                                 </span>
                                 <span className="font-medium text-slate-800 dark:text-white">{client.name}</span>
                             </div>
                             <span className="font-bold text-slate-700 dark:text-slate-300">{client.count} serviços</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
