import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  FileSpreadsheet,
  Banknote, 
  QrCode,
  CreditCard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ServiceRecord, ExpenseRecord, Client, User } from '../types';
import { getServices, getExpenses, getClients } from '../services/storageService';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  currentUser: User;
}

export function Reports({ currentUser }: ReportsProps) {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primeiro dia do mês
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Hoje
  });

  // Carregar Dados
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Busca otimizada por data
        const [srv, exp, cli] = await Promise.all([
          getServices(startDate, endDate),
          getExpenses(startDate, endDate),
          getClients()
        ]);
        setServices(srv);
        setExpenses(exp);
        setClients(cli);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [startDate, endDate]);

  // --- LÓGICA DE FILTRAGEM (CORREÇÃO DA LIXEIRA) ---
  const { filteredServices, filteredExpenses } = useMemo(() => {
    return {
      // O PULO DO GATO: Filtramos quem NÃO tem deletedAt
      filteredServices: services.filter(s => !s.deletedAt),
      filteredExpenses: expenses 
    };
  }, [services, expenses]);

  // Estatísticas
  const stats = useMemo(() => {
    const receita = filteredServices.reduce((acc, s) => acc + s.cost + (s.waitingTime || 0), 0);
    const repasse = filteredServices.reduce((acc, s) => acc + (s.driverFee || 0), 0);
    const despesas = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const lucro = receita - repasse - despesas;
    
    // Por Pagamento
    const porMetodo = filteredServices.reduce((acc, s) => {
      const m = s.paymentMethod || 'PIX';
      acc[m] = (acc[m] || 0) + s.cost + (s.waitingTime || 0);
      return acc;
    }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

    return { receita, repasse, despesas, lucro, porMetodo };
  }, [filteredServices, filteredExpenses]);

  // Dados para Gráficos
  const chartData = useMemo(() => {
    // Agrupar por dia
    const map = new Map<string, { day: string, receita: number, lucro: number }>();
    
    // Inicializa mapa com dias do intervalo (opcional, aqui simplificado)
    filteredServices.forEach(s => {
      const day = s.date.split('T')[0].split('-').slice(1).reverse().join('/'); // DD/MM
      const curr = map.get(day) || { day, receita: 0, lucro: 0 };
      const total = s.cost + (s.waitingTime || 0);
      curr.receita += total;
      curr.lucro += (total - (s.driverFee || 0));
      map.set(day, curr);
    });

    // Subtrair despesas do lucro no dia
    filteredExpenses.forEach(e => {
        const day = e.date.split('T')[0].split('-').slice(1).reverse().join('/');
        const curr = map.get(day);
        if (curr) {
            curr.lucro -= e.amount;
        }
    });

    return Array.from(map.values()).sort((a, b) => {
        // Ordenação simplificada por string DD/MM funciona se for mesmo mês
        return a.day.localeCompare(b.day); 
    });
  }, [filteredServices, filteredExpenses]);

  // Exportar PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatório Financeiro`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 22);
    
    doc.text(`Receita Bruta: R$ ${stats.receita.toFixed(2)}`, 14, 30);
    doc.text(`Lucro Líquido: R$ ${stats.lucro.toFixed(2)}`, 14, 35);

    const tableData = filteredServices.map(s => [
        new Date(s.date).toLocaleDateString(),
        s.requesterName,
        (s.paymentMethod || 'PIX'),
        `R$ ${(s.cost + (s.waitingTime || 0)).toFixed(2)}`,
        `R$ ${(s.cost + (s.waitingTime || 0) - (s.driverFee || 0)).toFixed(2)}` // Lucro approx
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['Data', 'Cliente', 'Método', 'Valor', 'Lucro']],
        body: tableData,
    });

    doc.save(`Relatorio_${startDate}_${endDate}.pdf`);
  };

  const handleExportCSV = () => {
      const headers = ['Data,Cliente,Método,Valor Total,Repasse Motoboy,Lucro'];
      const rows = filteredServices.map(s => {
          const total = s.cost + (s.waitingTime || 0);
          const lucro = total - (s.driverFee || 0);
          return `${new Date(s.date).toLocaleDateString()},"${s.requesterName}",${s.paymentMethod || 'PIX'},${total.toFixed(2)},${(s.driverFee || 0).toFixed(2)},${lucro.toFixed(2)}`;
      });
      
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Relatorio_${startDate}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600" />
            Relatórios
          </h1>
          <p className="text-slate-500 text-sm">Analise o desempenho financeiro</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <input 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-sm outline-none text-slate-700 dark:text-white"
                />
                <span className="text-slate-400">-</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-sm outline-none text-slate-700 dark:text-white"
                />
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 hidden sm:block"></div>
            <div className="flex gap-2">
                <button onClick={handleExportPDF} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300" title="PDF">
                    <Download size={18} />
                </button>
                <button onClick={handleExportCSV} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300" title="Excel/CSV">
                    <FileSpreadsheet size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Receita Bruta</p>
            <h3 className="text-2xl font-bold text-blue-600">R$ {stats.receita.toFixed(2)}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Repasse Motoboys</p>
            <h3 className="text-2xl font-bold text-red-500">R$ {stats.repasse.toFixed(2)}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Despesas Op.</p>
            <h3 className="text-2xl font-bold text-orange-500">R$ {stats.despesas.toFixed(2)}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20">
            <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">Lucro Líquido</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {stats.lucro.toFixed(2)}</h3>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6">Evolução Diária</h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                          />
                          <Bar dataKey="receita" fill="#3b82f6" radius={[4,4,0,0]} name="Receita" />
                          <Bar dataKey="lucro" fill="#10b981" radius={[4,4,0,0]} name="Lucro" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6">Métodos de Pagamento</h3>
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                          <QrCode size={18} className="text-blue-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">Pix</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">R$ {stats.porMetodo.PIX.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                          <Banknote size={18} className="text-emerald-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">Dinheiro</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">R$ {stats.porMetodo.CASH.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                          <CreditCard size={18} className="text-purple-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">Cartão</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">R$ {stats.porMetodo.CARD.toFixed(2)}</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
