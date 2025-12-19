import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { EyeOff } from 'lucide-react';
import { User, Client, ServiceRecord, ExpenseRecord } from './types';
import { 
  initializeData, 
  getClients, 
  getServices, 
  getExpenses, 
  getCurrentUser, 
  logoutUser,
  refreshUserSession // <--- IMPORTADO
} from './services/storageService';

// Components
import { Dashboard } from './components/Dashboard';
import { ClientDetails } from './components/ClientDetails';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { NewOrder } from './components/NewOrder';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ClientList } from './components/ClientList';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [realAdminUser, setRealAdminUser] = useState<User | null>(null); // For impersonation

  // Data state
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Check for session on mount
  useEffect(() => {
    initializeData(); // Seeds demo data or ADMIN user only if DB is completely empty
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Refresh data logic - AGORA SINCRONIZA A SESSÃO TAMBÉM
  const refreshData = async () => {
    if (currentUser) {
      try {
        // 1. Atualiza o perfil do utilizador (puxa da nuvem para ter os dados da empresa)
        const freshUser = await refreshUserSession();
        
        // Se houver diferenças (ex: mudou o nome da empresa noutro PC), atualiza o estado
        if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
            setCurrentUser(freshUser);
        }

        // 2. Busca os outros dados
        const c = await getClients();
        setClients(c);

        const s = await getServices();
        setServices(s);

        const e = await getExpenses();
        setExpenses(e);
      } catch (error) {
        console.error("Erro ao sincronizar dados:", error);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setRealAdminUser(null);
    setClients([]);
    setServices([]);
    setExpenses([]);
  };

  // Impersonation Logic
  const startImpersonation = (targetUser: User) => {
    if (currentUser?.role !== 'ADMIN') return;
    setRealAdminUser(currentUser); // Save the admin
    setCurrentUser(targetUser); // Switch view to target
  };

  const stopImpersonation = () => {
    if (realAdminUser) {
      setCurrentUser(realAdminUser);
      setRealAdminUser(null);
    }
  };

  // Wrapper for Client Details to handle Params
  const ClientDetailsWrapper = () => {
    const { id } = useParams();
    const client = clients.find(c => c.id === id);
    const navigate = useNavigate();

    if (!client) {
      return <div>Cliente não encontrado</div>;
    }

    return <ClientDetails currentUser={currentUser!} client={client} onBack={() => navigate('/clients')} />;
  };

  // New Order Wrapper to handle Navigation
  const NewOrderWrapper = () => {
    const navigate = useNavigate();
    return (
      <NewOrder
        clients={clients}
        onSave={() => { refreshData(); navigate('/clients'); }}
        onCancel={() => navigate('/')}
        currentUserId={currentUser!.id}
      />
    );
  };

  // If not logged in, show Auth screen
  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" />
        <Auth onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 md:h-screen md:overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Impersonation Warning Banner */}
      {realAdminUser && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-xs font-bold py-1 px-4 z-50 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <EyeOff size={14} />
            <span>VOCÊ ESTÁ ACESSANDO COMO: {currentUser.name.toUpperCase()}</span>
          </div>
          <button
            onClick={stopImpersonation}
            className="bg-white text-orange-600 px-3 py-0.5 rounded-full text-[10px] hover:bg-orange-100 transition-colors"
          >
            SAIR DO MODO DE ACESSO
          </button>
        </div>
      )}

      <Sidebar
        currentUser={currentUser}
        realAdminUser={realAdminUser}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto h-screen md:h-full pb-24 md:pb-0 bg-slate-50 dark:bg-slate-900 ${realAdminUser ? 'pt-8 md:pt-0' : ''}`}>

        <Header
          currentUser={currentUser}
          realAdminUser={realAdminUser}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
        />

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard clients={clients} services={services} expenses={expenses} />} />
            <Route path="/clients" element={<ClientList clients={clients} services={services} currentUser={currentUser} onRefresh={refreshData} />} />
            <Route path="/clients/:id" element={<ClientDetailsWrapper />} />
            <Route path="/orders/new" element={<NewOrderWrapper />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports clients={clients} services={services} currentUser={currentUser} onRefresh={refreshData} />} />
            <Route path="/settings" element={<Settings currentUser={currentUser} onUpdateUser={setCurrentUser} />} />

            <Route path="/admin" element={
              currentUser.role === 'ADMIN'
                ? <AdminPanel currentAdmin={currentUser} onImpersonate={startImpersonation} />
                : <Navigate to="/" />
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
