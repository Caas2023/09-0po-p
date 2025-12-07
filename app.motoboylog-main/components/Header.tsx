import React from 'react';
import { Truck, Sun, Moon, LogOut } from 'lucide-react';
import { User } from '../types';
import { clsx } from 'clsx';

interface HeaderProps {
    currentUser: User | null;
    realAdminUser: User | null;
    darkMode: boolean;
    toggleDarkMode: () => void;
    onLogout: () => void;
}

export function Header({ currentUser, realAdminUser, darkMode, toggleDarkMode, onLogout }: HeaderProps) {
    if (!currentUser) return null;

    return (
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-20 flex justify-between items-center md:hidden shadow-sm">
            <div className="flex items-center gap-2">
                <div className={clsx(
                    "text-white p-1 rounded-md",
                    realAdminUser ? 'bg-orange-500' : 'bg-blue-600'
                )}>
                    <Truck size={16} />
                </div>
                <span className="font-bold text-slate-700 dark:text-white">LogiTrack</span>
            </div>
            <div className="flex gap-2">
                <button onClick={toggleDarkMode} className="text-slate-500 dark:text-slate-400 p-1">
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={onLogout} className="text-slate-500 dark:text-slate-400 hover:text-red-600">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
}
