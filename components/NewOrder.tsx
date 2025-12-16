import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ajuste o caminho do seu arquivo supabase
import { X, MapPin, User, Package, Plus, Save } from 'lucide-react';

export default function NewOrderModal({ isOpen, onClose, onOrderCreated }) {
  // --- ESTADOS GERAIS ---
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // --- ESTADOS DE SOLICITANTE ---
  const [solicitantes, setSolicitantes] = useState([]); // Lista de pessoas da empresa
  const [novoSolicitanteMode, setNovoSolicitanteMode] = useState(false); // Mostra o input de adicionar
  const [nomeNovoSolicitante, setNomeNovoSolicitante] = useState(''); // Valor digitado
  const [loadingSolicitante, setLoadingSolicitante] = useState(false);

  // --- ESTADOS DE ENDEREÇO MÁGICO ---
  const [usarEndColeta, setUsarEndColeta] = useState(false);
  const [usarEndEntrega, setUsarEndEntrega] = useState(false);

  // --- FORMULÁRIO ---
  const [formData, setFormData] = useState({
    cliente_id: '',
    solicitante: '', // Novo campo
    descricao: '',
    valor: '',
    // Coleta
    coleta_rua: '', coleta_numero: '', coleta_bairro: '', coleta_cidade: '',
    // Entrega
    entrega_rua: '', entrega_numero: '', entrega_bairro: '', entrega_cidade: '',
  });

  // 1. CARREGAR CLIENTES AO ABRIR
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      // Reseta tudo ao abrir
      setFormData({
        cliente_id: '', solicitante: '', descricao: '', valor: '',
        coleta_rua: '', coleta_numero: '', coleta_bairro: '', coleta_cidade: '',
        entrega_rua: '', entrega_numero: '', entrega_bairro: '', entrega_cidade: '',
      });
      setSelectedClient(null);
      setSolicitantes([]);
      setUsarEndColeta(false);
      setUsarEndEntrega(false);
      setNovoSolicitanteMode(false);
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro clientes:', error);
    }
  };

  // 2. BUSCAR SOLICITANTES QUANDO MUDAR O CLIENTE
  useEffect(() => {
    if (formData.cliente_id) {
      fetchSolicitantes(formData.cliente_id);
    } else {
      setSolicitantes([]);
    }
  }, [formData.cliente_id]);

  const fetchSolicitantes = async (clienteId) => {
    try {
      const { data, error } = await supabase
        .from('solicitantes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('nome');
      
      if (error) throw error;
      setSolicitantes(data || []);
    } catch (error) {
      console.error('Erro ao buscar solicitantes:', error);
    }
  };

  // 3. SALVAR NOVO SOLICITANTE NA HORA
  const handleSaveSolicitante = async () => {
    if (!nomeNovoSolicitante.trim() || !formData.cliente_id) return;
    
    setLoadingSolicitante(true);
    try {
      const { data, error } = await supabase
        .from('solicitantes')
        .insert([{ 
          cliente_id: formData.cliente_id, 
          nome: nomeNovoSolicitante 
        }])
        .select();

      if (error) throw error;

      // Atualiza a lista e seleciona o novo automaticamente
      const novo = data[0];
      setSolicitantes([...solicitantes, novo]);
      setFormData(prev => ({ ...prev, solicitante: novo.nome }));
      
      // Limpa e volta para o modo de lista
      setNomeNovoSolicitante('');
      setNovoSolicitanteMode(false);

    } catch (error) {
      alert('Erro ao salvar solicitante: ' + error.message);
    } finally {
      setLoadingSolicitante(false);
    }
  };

  // --- LÓGICA DE ENDEREÇO (CHECKBOX) ---
  const toggleEndereco = (tipo, marcado) => {
    if (!selectedClient) return;
    
    const endereco = {
      rua: selectedClient.rua || '',
      numero: selectedClient.numero || '',
      bairro: selectedClient.bairro || '',
      cidade: selectedClient.cidade || ''
    };

    if (tipo === 'coleta') {
      setUsarEndColeta(marcado);
      if (marcado) {
        setFormData(prev => ({
          ...prev,
          coleta_rua: endereco.rua, coleta_numero: endereco.numero,
          coleta_bairro: endereco.bairro, coleta_cidade: endereco.cidade
        }));
      } else {
        setFormData(prev => ({ ...prev, coleta_rua: '', coleta_numero: '', coleta_bairro: '', coleta_cidade: '' }));
      }
    }
    
    if (tipo === 'entrega') {
      setUsarEndEntrega(marcado);
      if (marcado) {
        setFormData(prev => ({
          ...prev,
          entrega_rua: endereco.rua, entrega_numero: endereco.numero,
          entrega_bairro: endereco.bairro, entrega_cidade: endereco.cidade
        }));
      } else {
        setFormData(prev => ({ ...prev, entrega_rua: '', entrega_numero: '', entrega_bairro: '', entrega_cidade: '' }));
      }
    }
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, cliente_id: clientId, solicitante: '' }));
    // Reseta checkboxes ao trocar de cliente
    setUsarEndColeta(false);
    setUsarEndEntrega(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('orders').insert([formData]);
      if (error) throw error;
      onOrderCreated();
      onClose();
    } catch (error) {
      alert('Erro ao criar pedido: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Novo Pedido</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* --- LINHA 1: CLIENTE E SOLICITANTE --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campo Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente / Empresa</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleClientChange}
                  required
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                >
                  <option value="">Selecione a empresa...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campo Solicitante (Dinâmico) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
              
              {!novoSolicitanteMode ? (
                // MODO LISTA (SELECT)
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      name="solicitante"
                      value={formData.solicitante}
                      onChange={handleChange}
                      disabled={!formData.cliente_id} // Só habilita se escolher cliente
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white"
                    >
                      <option value="">Quem pediu?</option>
                      {solicitantes.map(sol => (
                        <option key={sol.id} value={sol.nome}>{sol.nome}</option>
                      ))}
                    </select>
                  </div>
                  {/* Botão + para adicionar novo */}
                  <button
                    type="button"
                    onClick={() => setNovoSolicitanteMode(true)}
                    disabled={!formData.cliente_id}
                    className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 disabled:opacity-50"
                    title="Cadastrar novo solicitante"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              ) : (
                // MODO CADASTRO (INPUT)
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome do novo solicitante..."
                    value={nomeNovoSolicitante}
                    onChange={(e) => setNomeNovoSolicitante(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveSolicitante}
                    disabled={loadingSolicitante}
                    className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Save size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoSolicitanteMode(false)}
                    className="p-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Campo Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Serviço</label>
            <div className="relative">
              <Package className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Ex: Entrega de contrato..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* --- ENDEREÇO COLETA --- */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                <MapPin className="mr-2 h-5 w-5" /> Coleta
              </h3>
              <label className="flex items-center text-sm text-blue-600 cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition">
                <input 
                  type="checkbox" 
                  className="mr-2 rounded text-blue-600"
                  checked={usarEndColeta}
                  onChange={(e) => toggleEndereco('coleta', e.target.checked)}
                  disabled={!selectedClient}
                />
                Usar endereço do cadastro
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <input name="coleta_rua" placeholder="Rua" value={formData.coleta_rua} onChange={handleChange} className="w-full rounded-md border-gray-300 p-2 border" />
              </div>
              <div className="md:col-span-2">
                <input name="coleta_numero" placeholder="Nº" value={formData.coleta_numero} onChange={handleChange} className="w-full rounded-md border-gray-300 p-2 border" />
              </div>
              <div className="md:col-span-4">
                <input name="coleta_bairro" placeholder="Bairro" value={formData.coleta_bairro} onChange={handleChange} className="w-full rounded-md border-gray-300 p-2 border" />
              </div>
            </div>
          </div>

          {/* --- ENDEREÇO ENTREGA --- */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-green-800 flex items-center">
                <MapPin className="mr-2 h-5 w-5" /> Entrega
              </h3>
              <label className="flex items-center text-sm text-green-600 cursor-pointer hover:bg-green-100 px-2 py-1 rounded transition">
                <input 
                  type="checkbox" 
                  className="mr-2 rounded text-green-600"
                  checked={usarEndEntrega}
                  onChange={(e) => toggleEndereco('entrega', e.target.checked)}
                  disabled={!selectedClient}
                />
                Usar endereço do cadastro
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <input name="entrega_rua" placeholder="Rua" value={formData.entrega_rua} onChange={handleChange} className="w-full rounded-md border-gray-300 p-2 border" />
              </div>
              <div className="md:col-span-2">
                <input name="entrega_numero" placeholder="Nº" value={formData.entrega_numero} onChange={handleChange} className="w-full rounded-md border-gray-300 p-2 border" />
              </div>
              <div className="md:col-span-4">
                <input name="entrega_bairro" placeholder="Bairro" value={formData.entrega_bairro} onChange={handleChange} className="w-full rounded-md border-gray-300 p-2 border" />
              </div>
            </div>
          </div>

          {/* Botões Finais */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {loading ? 'Salvando...' : 'Criar Pedido'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
