import React, { useState, useEffect } from 'react';
import { Trash2, Fuel, Utensils, Wallet, PlusCircle, Calendar } from 'lucide-react';
import { ExpenseRecord, ExpenseCategory } from '../types';
import { getExpenses, saveExpense, deleteExpense } from '../services/storageService';

// --- CORREÇÃO DE DATA ---
// Função auxiliar para formatar a data visualmente sem conversão de fuso horário
const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '-';
    // Pega apenas a parte da data (YYYY-MM-DD) e ignora qualquer hora/fuso
    const cleanDate = dateString.split('T')[0]; 
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
};

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('GAS');
  
  // Inicializa com a data local correta (YYYY-MM-DD)
  const [date, setDate] = useState(() => {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
  });
  
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    // Sort by date descending
    const data = await getExpenses();
    setExpenses(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    const newExpense: ExpenseRecord = {
      id: crypto.randomUUID(),
      ownerId: '', // Placeholder, handled by storageService
      category,
      amount: parseFloat(amount),
      date, // Salva a string exata do input (YYYY-MM-DD)
      description
    };

    await saveExpense(newExpense);
    loadExpenses();
    
    // Limpa campos mas mantém a data atual
    setAmount('');
    setDescription('');
    
    // Reseta para data de hoje correta
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    setDate(new Date(d.getTime() - offset).toISOString().split('T')[0]);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      await deleteExpense(id);
      loadExpenses();
    }
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'GAS': return <Fuel size={18} />;
      case 'LUNCH': return <Utensils size={18} />;
      default: return <Wallet size={18} />;
    }
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'GAS': return 'Gasolina';
      case 'LUNCH': return 'Almoço';
      default: return 'Outros';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Despesas Diárias</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 h-fit">
          <h2 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg">
            <PlusCircle size={20} className="text-blue-600 dark:text-blue-400" />
            Registrar Despesa
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Categoria</label>
              <div className="grid grid-cols-3 gap-2">
                {(['GAS', 'LUNCH', 'OTHER'] as ExpenseCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all font-medium ${category === cat
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-600 dark:border-blue-400 text-blue-800 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                      }`}
                  >
                    <div className="mb-1">{getCategoryIcon(cat)}</div>
                    <span className="text-xs font-bold">{getCategoryLabel(cat)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder-slate-400"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Descrição (Opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Ex: Posto Shell"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition-colors shadow-sm"
            >
              Salvar Despesa
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-white">Histórico de Gastos</h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                Nenhuma despesa registrada.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 font-bold">Data</th>
                    <th className="p-4 font-bold">Categoria</th>
                    <th className="p-4 font-bold">Descrição</th>
                    <th className="p-4 font-bold text-right">Valor</th>
                    <th className="p-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="p-4 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          {/* AQUI APLICAMOS A CORREÇÃO NA EXIBIÇÃO */}
                          {formatDateDisplay(expense.date)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                          ${expense.category === 'GAS' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' :
                            expense.category === 'LUNCH' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                        >
                          {getCategoryIcon(expense.category)}
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300">{expense.description || '-'}</td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-white">
                        R$ {expense.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
