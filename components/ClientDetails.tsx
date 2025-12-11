// components/ClientDetails.tsx (Parte relevante da função handleExportBoleto e Renderização da Tabela)

// ... imports e outros códigos ...

// Na função handleExportBoleto dentro do componente ClientDetails:
    const handleExportBoleto = () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        setShowExportMenu(false);

        setTimeout(() => {
            try {
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const marginX = 10;
                let currentY = 15;

                // ... (código do cabeçalho igual) ...
                
                // TÍTULO
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text("RELATÓRIO DE SERVIÇOS PRESTADOS", pageWidth / 2, currentY, { align: 'center' });
                currentY += 10;

                // ... (Box do cabeçalho com dados da empresa e cliente igual) ...
                // Avança Y...
                currentY += 35; // Ajuste conforme boxHeight

                // TABELA DE SERVIÇOS
                // AQUI APLICAMOS A LÓGICA DO "TOTAL DO CLIENTE" (BASE + ESPERA + TAXA)
                const tableData = filteredServices.map(s => {
                    const baseCost = s.cost;
                    const waiting = s.waitingTime || 0;
                    const extra = s.extraFee || 0;
                    
                    // O valor exibido na linha deve ser a soma de tudo para o cliente ver o custo final daquela corrida
                    const lineTotal = baseCost + waiting + extra;

                    return [
                        new Date(s.date + 'T00:00:00').toLocaleDateString().substring(0, 5),
                        s.requesterName.substring(0, 15),
                        s.pickupAddresses[0] || '-',
                        s.deliveryAddresses[0] || '-',
                        `R$ ${lineTotal.toFixed(2)}` // Valor somado
                    ];
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [['DATA', 'SOLICITANTE', 'ORIGEM', 'DESTINO', 'VALOR TOTAL']],
                    body: tableData,
                    theme: 'plain',
                    // ... estilos ...
                });

                // CÁLCULO DO TOTAL FINAL (RODAPÉ)
                // @ts-ignore
                let finalY = doc.lastAutoTable.finalY + 10;
                
                // Soma total com a taxa inclusa
                const totalValue = filteredServices.reduce((sum, s) => {
                    return sum + s.cost + (s.waitingTime || 0) + (s.extraFee || 0);
                }, 0);

                doc.line(marginX, finalY, pageWidth - marginX, finalY);
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                
                const resumoX = 140; 
                doc.text("TOTAL DE SERVIÇOS:", resumoX, finalY + 7);
                doc.text(filteredServices.length.toString(), pageWidth - marginX, finalY + 7, { align: 'right' });

                doc.text("VALOR TOTAL:", resumoX, finalY + 14);
                doc.setFontSize(12);
                doc.text(`R$ ${totalValue.toFixed(2)}`, pageWidth - marginX, finalY + 14, { align: 'right' });

                // ... salvar pdf ...
                const fileName = `Relatorio_${client.name.replace(/\s+/g, '_')}.pdf`;
                doc.save(fileName);

            } catch (error) {
                console.error("Error", error);
                alert("Erro ao gerar PDF.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 100);
    };

// ... Na renderização da Tabela na tela (Dashboard/Listagem Interna) ...
// ... Onde mostra o valor na coluna "Cobrado":
{/* Na tabela da tela, mostramos o "Total Interno" que é (Custo + Espera).
    A Taxa Extra NÃO entra aqui visualmente para não confundir o fluxo de caixa interno padrão.
*/}
<td className="p-4 text-right font-bold text-emerald-700 dark:text-emerald-400 align-top">
    R$ {(service.cost + (service.waitingTime || 0)).toFixed(2)}
</td>
