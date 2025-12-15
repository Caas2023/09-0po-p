import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutGrid, Users, Truck, Wallet, FileBarChart,
    PlusCircle, LogOut, Shield, Moon, Sun, Settings as SettingsIcon
} from 'lucide-react';
import { User } from '../types';
import { clsx } from 'clsx';

interface SidebarProps {
    currentUser: User;
    realAdminUser: User | null;
    darkMode: boolean;
    toggleDarkMode: () => void;
    onLogout: () => void;
}

export function Sidebar({ currentUser, realAdminUser, darkMode, toggleDarkMode, onLogout }: SidebarProps) {
    const navigate = useNavigate();
    const isAdmin = currentUser.role === 'ADMIN';
    const [imgError, setImgError] = useState(false);

    return (
        <nav className={clsx(
            "fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30 flex flex-row items-center justify-between px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]",
            "md:static md:w-64 md:h-full md:border-t-0 md:border-r md:flex-col md:justify-start md:items-stretch md:px-0 md:shadow-none",
            realAdminUser ? "mt-6 md:mt-0" : ""
        )}>
            {/* Logo - Desktop Only */}
            <div className="hidden md:flex p-6 items-center gap-3 border-b border-slate-100 dark:border-slate-700">
                {/* ÁREA DO LOGO */}
                <div className="h-10 w-10 relative flex-shrink-0">
                    {!imgError ? (
                        <img 
                            src="/logo.png" 
                            alt="LogiTrack Logo" 
                            className="h-full w-full object-contain"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        // Fallback: Se a imagem não carregar, mostra o ícone do caminhão
                        <div className={clsx(
                            "h-full w-full rounded-lg flex items-center justify-center text-white transition-colors",
                            realAdminUser ? 'bg-orange-500' : 'bg-blue-600'
                        )}>
                            <Truck size={20} />
                        </div>
                    )}
                </div>
                <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">LogiTrack</span>
            </div>

            {/* User Profile Summary */}
            <div className="hidden md:flex p-4 items-center gap-3 bg-slate-50 dark:bg-slate-700 mx-4 mt-4 rounded-xl border border-slate-100 dark:border-slate-600">
                <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm",
                    realAdminUser ? 'bg-orange-500' : 'bg-blue-600'
                )}>
                    {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{currentUser.companyName || 'Minha Empresa'}</p>
                </div>
            </div>

            {/* Navigation Items Container */}
            <div className="flex flex-row w-full justify-between items-center md:flex-col md:space-y-1 md:p-4 md:h-full md:overflow-y-auto md:justify-start">

                {/* Desktop New Order Button */}
                <div className="hidden md:block mb-4">
                    <button
                        onClick={() => navigate('/orders/new')}
                        className={clsx(
                            "w-full text-white px-4 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2",
                            realAdminUser ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        )}
                    >
                        <PlusCircle size={20} />
                        Nova Corrida
                    </button>
                </div>

                <NavItem to="/" icon={<LayoutGrid size={22} />} label="Dashboard" impersonating={!!realAdminUser} />
                <NavItem to="/clients" icon={<Users size={22} />} label="Clientes" impersonating={!!realAdminUser} />

                {/* Mobile New Order Button (Central Icon) */}
                <button
                    onClick={() => navigate('/orders/new')}
                    className="md:hidden flex flex-col items-center justify-center p-1"
                >
                    <div className={clsx(
                        "text-white p-3 rounded-full shadow-lg transform -translate-y-4 border-4 border-slate-50 dark:border-slate-900",
                        realAdminUser ? 'bg-orange-500' : 'bg-blue-600'
                    )}>
                        <PlusCircle size={24} />
                    </div>
                </button>

                <NavItem to="/reports" icon={<FileBarChart size={22} />} label="Relatórios" impersonating={!!realAdminUser} />
                <NavItem to="/expenses" icon={<Wallet size={22} />} label="Despesas" impersonating={!!realAdminUser} />

                <NavItem to="/settings" icon={<SettingsIcon size={22} />} label="Configurações" impersonating={!!realAdminUser} />

                {/* ADMIN LINK - Only visible if role is ADMIN */}
                {isAdmin && !realAdminUser && (
                    <>
                        <div className="hidden md:block pt-4 pb-2">
                            <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Administração</p>
                        </div>
                        <NavItem
                            to="/admin"
                            icon={<Shield size={22} />}
                            label="Painel Master"
                            admin
                        />
                    </>
                )}
            </div>

            {/* Desktop Footer - Dark Mode & Logout */}
            <div className="hidden md:block p-4 border-t border-slate-100 dark:border-slate-700 mt-auto space-y-2">
                <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors font-medium text-sm"
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors font-medium text-sm"
                >
                    <LogOut size={18} />
                    {realAdminUser ? 'Sair (Logout Force)' : 'Sair da Conta'}
                </button>
            </div>
        </nav>
    );
}

function NavItem({ to, icon, label, admin, impersonating }: { to: string, icon: React.ReactNode, label: string, admin?: boolean, impersonating?: boolean }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => clsx(
                "flex items-center justify-center md:justify-start md:gap-3 px-1 py-2 md:px-3 md:py-2.5 rounded-lg transition-all duration-200 font-medium md:w-full",
                isActive
                    ? (impersonating
                        ? 'text-orange-600 md:bg-orange-50 md:text-orange-700 md:shadow-sm'
                        : 'text-blue-600 md:bg-blue-50 dark:md:bg-blue-900/20 md:text-blue-700 dark:text-blue-400 md:shadow-sm')
                    : admin
                        ? 'text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 md:hover:bg-slate-200 dark:md:hover:bg-slate-600'
                        : 'text-slate-400 md:text-slate-600 dark:md:text-slate-400 md:hover:bg-slate-50 dark:md:hover:bg-slate-800 md:hover:text-slate-900 dark:md:hover:text-white'
            )}
        >
            {({ isActive }) => (
                <>
                    <span className={isActive ? 'scale-110 md:scale-100 transition-transform' : 'transition-transform'}>{icon}</span>
                    <span className="hidden md:block text-sm">{label}</span>
                </>
            )}
        </NavLink>
    );
}
