import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  MapPin, 
  Phone, 
  Briefcase, 
  ChevronRight, 
  X,
  Building 
} from 'lucide-react';
import { Client, User as UserType, ServiceRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { saveClient } from '../services/storageService';
import { toast } from 'sonner';

interface ClientListProps {
  clients: Client[];
  services: ServiceRecord[];
  currentUser: UserType;
  onRefresh: () => void;
}

// --- MÁSCARAS ---
const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, "");
    // Formato (11) 99999-9999
    return v
        .replace(/^(\d\d)(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .slice(0, 15);
};

const formatCnpjCpf = (value: string) => {
    const v = value.replace(/\D/g, "");
    
    if (v.length <= 11) {
        // CPF: 000.000.000-00
        return v
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        // CNPJ: 00.000.000/0000-00
        return v
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .slice(0, 18);
    }
};

export const ClientList: React.FC<ClientListProps> = ({ clients, services, currentUser, onRefresh }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    category: 'Avulso',
    address: '',
    contactPerson: '',
    cnpj: ''
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      !c.deletedAt && // Filtra os deletados
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clients, searchTerm]);

  // Handler inteligente para aplicar máscaras
  const handleInputChange = (field: keyof Client, value: string) => {
      let formattedValue = value;
      
      if (field === 'phone') {
          formattedValue = formatPhone(value);
      } else if (field === 'cnpj') {
          formattedValue = formatCnpjCpf(value);
      }

      setNewClient({ ...newClient, [field]: formattedValue });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    const clientToSave: Client = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      name: newClient.name!,
      email: newClient.email || '',
      phone: newClient.phone || '',
      category: newClient.category || 'Avulso',
      address: newClient.address || '',
      contactPerson: newClient.contactPerson || '',
      cnpj: newClient.cnpj || '',
      createdAt: new Date().toISOString()
    };

    await saveClient(clientToSave);
    toast.success('Cliente cadastrado!');
    setShowModal(false);
    setNewClient({ name: '', email: '', phone: '', category: 'Avulso', address: '', contactPerson: '', cnpj: '' });
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Meus Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie sua carteira de clientes</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, empresa ou responsável..." 
            className="w-full pl-10 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
                Nenhum cliente encontrado.
            </div>
        ) : (
            filteredClients.map(client => (
            <div 
                key={client.id} 
                onClick={() => navigate(`/clients/${client.id}`)}
                className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    <Briefcase size={20} />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                    {client.category}
                </span>
                </div>

                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1 truncate pr-4">{client.name}</h3>
                
                <div className="space-y-2 mt-4">
                {client.contactPerson && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <User size={14} />
                    {client.contactPerson}
                    </div>
                )}
                {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Phone size={14} />
                    {client.phone}
                    </div>
                )}
                {client.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{client.address}</span>
                    </div>
                )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">Ver detalhes</span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
            </div>
            ))
        )}
      </div>

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-6 relative animate-slide-up">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="text-blue-600" />
              Novo Cliente
            </h2>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa / Cliente</label>
                <input 
                  required 
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={newClient.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Logística LTDA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
                  <input 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.contactPerson}
                    onChange={e => handleInputChange('contactPerson', e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">CPF ou CNPJ</label>
                  <input 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.cnpj}
                    onChange={e => handleInputChange('cnpj', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={18}
                  />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
                <input 
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={newClient.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select 
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.category}
                    onChange={e => handleInputChange('category', e.target.value)}
                  >
                    <option value="Avulso">Avulso</option>
                    <option value="Mensalista">Mensalista</option>
                    <option value="Parceiro">Parceiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input 
                    type="email"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={newClient.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg mt-2 transition-colors">
                Salvar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
