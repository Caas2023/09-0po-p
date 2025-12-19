import React, { useState, useMemo, useEffect } from 'react';
import { Client, ServiceRecord, PaymentMethod, User } from '../types';
import { FileSpreadsheet, Building2, FolderOpen, ChevronRight, FileText, PieChart, CreditCard, Banknote, QrCode, AlertCircle, Table, ShieldCheck, FileDown, Loader2, Calendar } from 'lucide-react';
import { ServiceDocumentModal } from './ClientDetails';
import { getServices, getExpenses, getClients } from '../services/storageService';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  // Nota: Agora buscamos os dados internamente para garantir otimização, 
  // mas mantemos as props para compatibilidade se necessário.
  clients?: Client[];
  services?: ServiceRecord[]; 
  currentUser: User;
}

const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
  // Estados Locais de Dados (Para garantir que tenhamos a versão mais atualizada e filtrada)
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  
  const [startDate, setStartDate] = useState<string>(() => {
      const d = new Date();
      d.setDate(1); 
      return getLocalDateStr(d);
  });
  const [endDate, setEndDate] = useState<string>(() => {
      const d = new Date();
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return getLocalDateStr(lastDay);
  });
  
  // --- NOVO ESTADO PARA OS BOTÕES DE PERÍODO ---
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');

  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedMonthLabel, setSelectedMonthLabel] = useState<string>('');
  const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(false);

  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [onlyWithCnpj, setOnlyWithCnpj] = useState(false);

  // --- CARREGAMENTO OTIMIZADO DE DADOS ---
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // Busca apenas o período selecionado
            const [srv, cli] = await Promise.all([
                getServices(startDate, endDate),
                getClients()
            ]);
            setServices(srv);
            setClients(cli);
        } catch (error) {
            console.error("Erro ao carregar relatório:", error);
        } finally {
            setLoading(false);
        }
    };
    if (startDate && endDate) {
        loadData();
    }
  }, [startDate, endDate]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    services.forEach(s => {
        const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
        months.add(dateStr.substring(0, 7)); 
    });
    
    return Array.from(months).sort().reverse().map(monthStr => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        const monthlyServices = services.filter(s => s.date.startsWith(monthStr) && !s.deletedAt);
        const total = monthlyServices.reduce((sum, s) => sum + s.cost, 0);
        
        return {
            id: monthStr,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            year,
            month,
            count: monthlyServices.length,
            total
        };
    });
  }, [services]);

  useEffect(() => {
      if (!selectedMonthLabel) {
          const d = new Date();
          const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          setSelectedMonthLabel(label.charAt(0).toUpperCase() + label.slice(1));
      }
  }, []);

  // --- NOVA FUNÇÃO PARA OS BOTÕES DE PERÍODO ---
  const handlePeriodChange = (period: 'today' | 'week' | 'month' | 'year') => {
      setActivePeriod(period);
      const now = new Date();
      const start = new Date();

      if (period === 'today') {
          // Início e Fim são hoje
      } else if (period === 'week') {
          // Últimos 7 dias
          start.setDate(now.getDate() - 7);
      } else if (period === 'month') {
          // Dia 1 do mês atual
          start.setDate(1);
      } else if (period === 'year') {
          // Dia 1 de Janeiro
          start.setMonth(0, 1);
      }

      setStartDate(getLocalDateStr(start));
      setEndDate(getLocalDateStr(now));
      
      // Atualiza o label do topo
      if (period === 'month') {
          const label = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          setSelectedMonthLabel(label.charAt(0).toUpperCase() + label.slice(1));
      } else {
          setSelectedMonthLabel(period === 'today' ? 'Hoje' : period === 'week' ? 'Última Semana' : 'Este Ano');
      }
  };

  const selectMonth = (monthId: string, label: string) => {
      setActivePeriod('custom'); // Desativa os botões rápidos
      const [year, month] = monthId.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      setStartDate(getLocalDateStr(firstDay));
      setEndDate(getLocalDateStr(lastDay));
      setSelectedMonthLabel(label);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
      setActivePeriod('custom'); // Desativa os botões rápidos ao mexer manualmente
      if (type === 'start') setStartDate(value);
      else setEndDate(value);
      setSelectedMonthLabel('Período Personalizado');
  };

  const filteredData = useMemo(() => {
    let filtered = services.filter(s => !s.deletedAt);

    if (selectedClientId !== 'all') {
        filtered = filtered.filter(s => s.clientId === selectedClientId);
    }

    if (onlyWithCnpj) {
        const clientsWithCnpj = new Set(clients.filter(c => c.cnpj && c.cnpj.trim() !== '').map(c => c.id));
        filtered = filtered.filter(s => clientsWithCnpj.has(s.clientId));
    }

    if (paymentMethodFilter !== 'ALL') {
        filtered = filtered.filter(s => (s.paymentMethod || 'PIX') === paymentMethodFilter);
    }

    if (startDate && endDate) {
        filtered = filtered.filter(s => {
             const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
             return dateStr >= startDate && dateStr <= endDate;
        });
    }

    return filtered.sort((a, b) => {
        const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
        const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        return 0;
    });
  }, [services, startDate, endDate, selectedClientId, paymentMethodFilter, onlyWithCnpj, clients]);

  const stats = useMemo(() => {
      const revenue = filteredData.reduce((sum, s) => sum + s.cost, 0);
      const cost = filteredData.reduce((sum, s) => sum + (s.driverFee || 0), 0);
      const pending = filteredData.filter(s => !s.paid).reduce((sum, s) => sum + s.cost, 0);
      
      return {
          count: filteredData.length,
          revenue,
          cost,
          pending,
          profit: revenue - cost
      };
  }, [filteredData]);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Desconhecido';

  const getPaymentIcon = (method?: PaymentMethod) => {
      switch(method) {
          case 'PIX': return <QrCode size={14} className="text-blue-600" />;
          case 'CASH': return <Banknote size={14} className="text-emerald-600" />;
          case 'CARD': return <CreditCard size={14} className="text-purple-600" />;
          default: return null;
      }
  };

  // --- EXPORT FUNCTIONS ---

  const handleExportPDF = () => {
      if (isGeneratingPdf) return;
      setIsGeneratingPdf(true);
      setShowExportMenu(false);

      setTimeout(() => {
          try {
            const doc = new jsPDF();
            const companyName = currentUser.companyName || currentUser.name || "LogiTrack CRM";
            
            // -- Header --
            doc.setFillColor(30, 41, 59); // Slate 800
            doc.rect(0, 0, 210, 35, 'F');
            
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text("Relatório de Serviços", 14, 18);
            
            doc.setFontSize(10);
            doc.setTextColor(203, 213, 225); // Slate 300
            doc.text(companyName, 14, 26);
            
            // Dates
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 196, 18, { align: 'right' });
            doc.text(`Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString()}`, 196, 26, { align: 'right' });

            // -- Summary Cards --
            const cardY = 45;
            const cardWidth = 45;
            const cardHeight = 25;
            const gap = 6;
            const startX = 14;

            // Card 1
            doc.setFillColor(241, 245, 249); 
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(startX, cardY, cardWidth, cardHeight, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text("Total Serviços", startX + 5, cardY + 8);
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text(stats.count.toString(), startX + 5, cardY + 18);

            // Card 2
            doc.setFillColor(236, 253, 245); 
            doc.setDrawColor(167, 243, 208);
            doc.roundedRect(startX + cardWidth + gap, cardY, cardWidth, cardHeight, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(6, 95, 70);
            doc.text("Faturamento", startX + cardWidth + gap + 5, cardY + 8);
            doc.setFontSize(14);
            doc.text(`R$ ${stats.revenue.toFixed(2)}`, startX + cardWidth + gap + 5, cardY + 18);

            // Card 3
            doc.setFillColor(254, 242, 242); 
            doc.setDrawColor(254, 202, 202);
            doc.roundedRect(startX + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(153, 27, 27);
            doc.text("Custo Operacional", startX + (cardWidth + gap) * 2 + 5, cardY + 8);
            doc.setFontSize(14);
            doc.text(`R$ ${stats.cost.toFixed(2)}`, startX + (cardWidth + gap) * 2 + 5, cardY + 18);

             // Card 4
            doc.setFillColor(240, 253, 244); 
            doc.setDrawColor(187, 247, 208);
            doc.roundedRect(startX + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(22, 101, 52);
            doc.text("Lucro Líquido", startX + (cardWidth + gap) * 3 + 5, cardY + 8);
            doc.setFontSize(14);
            doc.text(`R$ ${stats.profit.toFixed(2)}`, startX + (cardWidth + gap) * 3 + 5, cardY + 18);


            // -- Table (SEM STATUS) --
            const tableData = filteredData.map(s => [
                new Date(s.date + 'T00:00:00').toLocaleDateString(),
                getClientName(s.clientId),
                s.requesterName || '-',
                `R: ${s.pickupAddresses.join('\n')}\nE: ${s.deliveryAddresses.join('\n')}`,
                `R$ ${s.cost.toFixed(2)}`,
                s.paid ? 'PAGO' : 'PENDENTE'
            ]);

            autoTable(doc, {
                startY: 80,
                // STATUS REMOVIDO DO CABEÇALHO
                head: [['Data', 'Cliente', 'Solicitante', 'Rota', 'Valor', 'Pagamento']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold',
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 4,
                    overflow: 'linebreak',
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 22 }, // Date
                    1: { cellWidth: 35 }, // Client
                    2: { cellWidth: 25 }, // Requester
                    3: { cellWidth: 'auto' }, // Route
                    4: { cellWidth: 25, halign: 'right' }, // Value (index 4)
                    5: { cellWidth: 20, halign: 'center' }  // Payment (index 5)
                },
                didParseCell: function(data: any) {
                    // Ajustado para índice 5 (Pagamento)
                    if (data.section === 'body' && data.column.index === 5) {
                        if (data.cell.raw === 'PAGO') {
                            data.cell.styles.textColor = [22, 163, 74]; // Green
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [217, 119, 6]; // Amber
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            // Footer
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text('LogiTrack CRM - Relatório Gerado Automaticamente', 14, doc.internal.pageSize.height - 10);
                doc.text(`Página ${i} de ${pageCount}`, 196, doc.internal.pageSize.height - 10, { align: 'right' });
            }

            const fileName = `Relatorio_LogiTrack_${selectedMonthLabel.replace(/ /g, '_')}.pdf`;
            doc.save(fileName);

          } catch (error) {
              console.error("Error generating PDF", error);
              alert("Erro ao gerar PDF. Tente novamente.");
          } finally {
              setIsGeneratingPdf(false);
          }
      }, 100);
  };

  const downloadCSV = () => {
    setShowExportMenu(false);
    
    const maxPickups = Math.max(...filteredData.map(s => s.pickupAddresses.length), 1);
    const maxDeliveries = Math.max(...filteredData.map(s => s.deliveryAddresses.length), 1);

    const pickupHeaders = Array.from({ length: maxPickups }, (_, i) => `Coleta ${i + 1}`);
    const deliveryHeaders = Array.from({ length: maxDeliveries }, (_, i) => `Entrega ${i + 1}`);

    // Headers SEM Status
    const headers = ['Data', 'Cliente', 'Solicitante', ...pickupHeaders, ...deliveryHeaders, 'Valor (R$)', 'Custo Motoboy (R$)', 'Lucro (R$)', 'Pagamento', 'Status Pagamento'];
    
    const rows = filteredData.map(s => {
        const profit = s.cost - (s.driverFee || 0);
        const payment = s.paymentMethod === 'PIX' ? 'Pix' : s.paymentMethod === 'CARD' ? 'Cartão' : s.paymentMethod === 'CASH' ? 'Dinheiro' : '-';
        const status = s.paid ? 'PAGO' : 'PENDENTE';
        
        const safeString = (str: string) => `"${str.replace(/"/g, '""')}"`;

        const pickupCols = Array.from({ length: maxPickups }, (_, i) => safeString(s.pickupAddresses[i] || ''));
        const deliveryCols = Array.from({ length: maxDeliveries }, (_, i) => safeString(s.deliveryAddresses[i] || ''));

        return [
            new Date(s.date + 'T00:00:00').toLocaleDateString(),
            safeString(getClientName(s.clientId)),
            safeString(s.requesterName),
            ...pickupCols,
            ...deliveryCols,
            // SEM STATUS AQUI
            s.cost.toFixed(2).replace('.', ','), 
            (s.driverFee || 0).toFixed(2).replace('.', ','),
            profit.toFixed(2).replace('.', ','),
            payment,
            status
        ].join(';');
    });

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_${selectedMonthLabel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    setShowExportMenu(false);
    const clientName = selectedClientId === 'all' ? 'Geral' : getClientName(selectedClientId);

    const maxPickups = Math.max(...filteredData.map(s => s.pickupAddresses.length), 1);
    const maxDeliveries = Math.max(...filteredData.map(s => s.deliveryAddresses.length), 1);
    
    const pickupHeaders = Array.from({ length: maxPickups }, (_, i) => `<th>Coleta ${i + 1}</th>`).join('');
    const deliveryHeaders = Array.from({ length: maxDeliveries }, (_, i) => `<th>Entrega ${i + 1}</th>`).join('');
    
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subheader { color: #64748b; margin-bottom: 20px; font-size: 14px; }
          .money { text-align: right; white-space: nowrap; }
          .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; background-color: #e2e8f0; padding: 5px; }
        </style>
      </head>
      <body>
        <div class="header">Relatório: ${selectedMonthLabel}</div>
        <div class="subheader">Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString()} a ${new Date(endDate + 'T00:00:00').toLocaleDateString()}</div>
        <div class="subheader">Cliente: ${clientName}</div>
        <div class="subheader">Gerado em: ${new Date().toLocaleDateString()}</div>

        <div class="section-title">RESUMO FINANCEIRO</div>
        <table>
          <thead>
            <tr>
              <th>Total de Corridas</th>
              <th class="money">Faturamento</th>
              <th class="money">A Receber</th>
              <th class="money">Custo Motoboy</th>
              <th class="money">Lucro Líquido</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${stats.count}</td>
              <td class="money">R$ ${stats.revenue.toFixed(2)}</td>
              <td class="money" style="color: #d97706;">R$ ${stats.pending.toFixed(2)}</td>
              <td class="money">R$ ${stats.cost.toFixed(2)}</td>
              <td class="money" style="color: ${stats.profit >= 0 ? '#16a34a' : '#dc2626'}">R$ ${stats.profit.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">DETALHAMENTO DE SERVIÇOS</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Solicitante</th>
              ${pickupHeaders}
              ${deliveryHeaders}
              <th class="money">Valor</th>
              <th>Pagamento</th>
              <th>Status Pagamento</th>
              <th class="money">Lucro</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(s => {
              const profit = s.cost - (s.driverFee || 0);
              const method = s.paymentMethod || 'PIX';

              const pickupCells = Array.from({ length: maxPickups }, (_, i) => `<td>${s.pickupAddresses[i] || ''}</td>`).join('');
              const deliveryCells = Array.from({ length: maxDeliveries }, (_, i) => `<td>${s.deliveryAddresses[i] || ''}</td>`).join('');

              return `
                <tr>
                  <td>${new Date(s.date + 'T00:00:00').toLocaleDateString()}</td>
                  <td>${getClientName(s.clientId)}</td>
                  <td>${s.requesterName}</td>
                  ${pickupCells}
                  ${deliveryCells}
                  <td class="money">R$ ${s.cost.toFixed(2)}</td>
                  <td>${method}</td>
                  <td>${s.paid ? 'Pago' : 'Pendente'}</td>
                  <td class="money" style="color: ${profit >= 0 ? '#16a34a' : '#dc2626'}">R$ ${profit.toFixed(2)}</td>
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
    link.setAttribute('download', `Relatorio_${selectedMonthLabel.replace(/\s+/g, '_')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewingClient = viewingService ? clients.find(c => c.id === viewingService.clientId) : null;

  return (
    <div className="space-y-6 animate-fade-in relative">
       {/* Reuse the Modal from ClientDetails */}
       {viewingService && viewingClient && (
          <ServiceDocumentModal 
            service={viewingService} 
            client={viewingClient} 
            currentUser={currentUser}
            onClose={() => setViewingService(null)} 
          />
       )}

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gere planilhas e documentos PDF completos.</p>
         </div>
         
         <div className="relative">
            <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={filteredData.length === 0}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                <FileSpreadsheet size={18} />
                Exportar Dados
            </button>
            {showExportMenu && (
                <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden animate-fade-in">
                      <button 
                        onClick={handleExportPDF}
                        disabled={isGeneratingPdf}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                    >
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                            {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">Baixar Relatório PDF</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Formato profissional para impressão</p>
                        </div>
                    </button>
                      <button 
                        onClick={downloadCSV}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                    >
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                            <Table size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">Baixar Planilha CSV</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Compatível com Excel e Google Sheets</p>
                        </div>
                    </button>
                    <button 
                        onClick={exportExcel}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-3"
                    >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                            <FileText size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">Excel (.xls)</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Download de arquivo antigo</p>
                        </div>
                    </button>
                </div>
                </>
            )}
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar: Filters */}
            <div className="lg:col-span-1 space-y-4">
                {/* Monthly Archives */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <FolderOpen size={18} className="text-blue-500"/>
                        Histórico Mensal
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {availableMonths.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhum dado registrado ainda.</p>
                        )}
                        {availableMonths.map((m) => {
                            const isActive = selectedMonthLabel === m.label;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => selectMonth(m.id, m.label)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex justify-between items-center transition-all group ${
                                        isActive 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 shadow-sm border' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-transparent'
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{m.label}</span>
                                        <span className="text-xs opacity-70">{m.count} registros</span>
                                    </div>
                                    {isActive && <ChevronRight size={16} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {/* Custom Filters */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Filtrar por Cliente</label>
                        <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-3 text-slate-400" />
                            <select 
                                className="w-full pl-9 p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="all">Todos os Clientes</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Método de Pagamento</label>
                          <div className="grid grid-cols-2 gap-2">
                             <button
                                onClick={() => setPaymentMethodFilter('ALL')}
                                className={`px-2 py-1.5 text-xs rounded-md border font-medium ${paymentMethodFilter === 'ALL' ? 'bg-slate-800 dark:bg-slate-600 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                             >
                                 Todos
                             </button>
                             <button
                                onClick={() => setPaymentMethodFilter('PIX')}
                                className={`px-2 py-1.5 text-xs rounded-md border font-medium flex items-center justify-center gap-1 ${paymentMethodFilter === 'PIX' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                             >
                                 <QrCode size={12} /> Pix
                             </button>
                             <button
                                onClick={() => setPaymentMethodFilter('CARD')}
                                className={`px-2 py-1.5 text-xs rounded-md border font-medium flex items-center justify-center gap-1 ${paymentMethodFilter === 'CARD' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                             >
                                 <CreditCard size={12} /> Cartão
                             </button>
                             <button
                                onClick={() => setPaymentMethodFilter('CASH')}
                                className={`px-2 py-1.5 text-xs rounded-md border font-medium flex items-center justify-center gap-1 ${paymentMethodFilter === 'CASH' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                             >
                                 <Banknote size={12} />
                             </button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Outros Filtros</label>
                          <button 
                            onClick={() => setOnlyWithCnpj(!onlyWithCnpj)}
                            className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center gap-2 transition-all font-medium ${onlyWithCnpj ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                          >
                              <ShieldCheck size={14} className={onlyWithCnpj ? 'text-indigo-600' : 'text-slate-400'} />
                              Apenas clientes com CNPJ
                          </button>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Período Personalizado</label>
                          
                          {/* --- AQUI ESTÃO OS BOTÕES QUE VOCÊ PEDIU --- */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                              {[
                                  { id: 'today', label: 'Hoje' },
                                  { id: 'week', label: 'Semana' },
                                  { id: 'month', label: 'Este Mês' },
                                  { id: 'year', label: 'Este Ano' }
                              ].map(btn => (
                                  <button
                                    key={btn.id}
                                    onClick={() => handlePeriodChange(btn.id as any)}
                                    className={`px-2 py-1.5 text-xs font-bold rounded-md transition-all ${
                                        activePeriod === btn.id
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                    }`}
                                  >
                                      {btn.label}
                                  </button>
                              ))}
                          </div>
                          {/* --- FIM DOS BOTÕES --- */}

                          <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="date" 
                                className="w-full p-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                value={startDate}
                                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                             />
                             <input 
                                type="date" 
                                className="w-full p-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                value={endDate}
                                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                             />
                          </div>
                      </div>
                </div>
            </div>

            {/* Main Content: Dashboard & Table */}
            <div className="lg:col-span-3 space-y-6">
                {/* Top Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Serviços</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.count}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Faturamento</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">R$ {stats.revenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Pendentes</p>
                         <p className="text-xl font-bold text-amber-600 dark:text-amber-400">R$ {stats.pending.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Lucro Líquido</p>
                         <p className={`text-xl font-bold ${stats.profit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                             R$ {stats.profit.toFixed(2)}
                         </p>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white">Detalhamento: {selectedMonthLabel}</h3>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{filteredData.length} registros encontrados</span>
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-600 z-10">
                                <tr>
                                    <th className="p-3 font-bold whitespace-nowrap">Data</th>
                                    <th className="p-3 font-bold">Cliente</th>
                                    <th className="p-3 font-bold">Solicitante</th>
                                    <th className="p-3 font-bold">Valor (R$)</th>
                                    {/* STATUS REMOVIDO */}
                                    <th className="p-3 font-bold text-center">Pagamento</th>
                                    <th className="p-3 font-bold text-center">Status Pagamento</th>
                                    <th className="p-3 font-bold text-center">Doc</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">Carregando dados...</td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro encontrado com os filtros atuais.</td>
                                    </tr>
                                ) : (
                                    filteredData.map(s => (
                                        <tr 
                                            key={s.id} 
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                            onClick={() => setViewingService(s)}
                                        >
                                            <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {new Date(s.date + 'T00:00:00').toLocaleDateString()}
                                            </td>
                                            <td className="p-3 font-medium text-slate-800 dark:text-white truncate max-w-[150px]">
                                                {getClientName(s.clientId)}
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                                                {s.requesterName}
                                            </td>
                                            <td className="p-3 font-bold text-slate-800 dark:text-white">
                                                {s.cost.toFixed(2)}
                                            </td>
                                            {/* STATUS REMOVIDO AQUI TBM */}
                                            <td className="p-3 text-center">
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                                                    {getPaymentIcon(s.paymentMethod)}
                                                    {s.paymentMethod === 'PIX' ? 'Pix' : s.paymentMethod === 'CARD' ? 'Card' : 'Din'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.paid ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                <span className={`text-xs font-bold ${s.paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {s.paid ? 'PAGO' : 'PEND'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                    <FileText size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};
