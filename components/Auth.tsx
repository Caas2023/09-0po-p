
import React, { useState } from 'react';
import { registerUser, loginUser, requestPasswordReset, completePasswordReset } from '../services/storageService';
import { Truck, ArrowRight, User, Mail, Lock, Phone, KeyRound, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthProps {
    onLoginSuccess: (user: UserType) => void;
}

type ViewState = 'LOGIN' | 'REGISTER' | 'RECOVERY';
type RecoveryStep = 'EMAIL' | 'CODE' | 'PASSWORD';

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<ViewState>('LOGIN');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Recovery State
    const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('EMAIL');
    const [resetCode, setResetCode] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Password Visibility State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Demo Code for UI display
    const [demoCodeDisplay, setDemoCodeDisplay] = useState<string | null>(null);

    const resetForm = () => {
        setError('');
        setSuccessMsg('');
        setDemoCodeDisplay(null);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setResetCode('');
        setRecoveryStep('EMAIL');
        setShowPassword(false);
    };

    const switchView = (newView: ViewState) => {
        resetForm();
        setView(newView);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (view === 'LOGIN') {
            const result = await loginUser(email, password);
            if (result.success && result.user) {
                onLoginSuccess(result.user);
            } else {
                setError(result.message || 'Erro ao entrar.');
            }
        } else if (view === 'REGISTER') {
            if (!name || !email || !password || !phone) {
                setError('Por favor, preencha todos os campos.');
                return;
            }

            const result = await registerUser({ name, email, password, phone });
            if (result.success && result.user) {
                onLoginSuccess(result.user);
            } else {
                setError(result.message || 'Erro ao cadastrar.');
            }
        }
    };

    // Recovery Handlers
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setDemoCodeDisplay(null);

        const result = await requestPasswordReset(email);
        if (result.success) {
            // In a real app, the code goes to email. Here we show it.
            setDemoCodeDisplay(result.code || null);
            setRecoveryStep('CODE');
            setSuccessMsg('Código enviado! (Veja o banner amarelo)');
        } else {
            setError(result.message);
        }
    };

    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        const result = await completePasswordReset(email, resetCode, password);
        if (result.success) {
            alert('Senha alterada com sucesso! Faça login agora.');
            switchView('LOGIN');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-fade-in relative">

            {/* DEMO ONLY: Show Reset Code Notification */}
            {demoCodeDisplay && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded shadow-lg z-50 max-w-md animate-slide-down">
                    <div className="flex items-start gap-3">
                        <KeyRound size={24} />
                        <div>
                            <p className="font-bold">Modo Simulação</p>
                            <p className="text-sm">Não enviamos email real. Use este código:</p>
                            <p className="text-2xl font-mono font-bold tracking-widest mt-1 select-all">{demoCodeDisplay}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden max-w-4xl w-full border border-slate-200 dark:border-slate-700">

                {/* Left Side - Branding */}
                <div className="bg-blue-600 dark:bg-blue-800 p-8 md:p-12 text-white flex flex-col justify-between md:w-5/12">
                    <div>
                        <div className="bg-white/20 w-fit p-3 rounded-xl mb-6">
                            <Truck size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4">LogiTrack CRM</h1>
                        <p className="text-blue-100 text-lg leading-relaxed">
                            Gerencie seus clientes, controle serviços de entrega e acompanhe suas finanças em um só lugar.
                        </p>
                    </div>
                    <div className="mt-12 md:mt-0">
                        <div className="flex items-center gap-3 text-sm font-medium text-blue-100">
                            <div className="w-8 h-1 bg-blue-400 rounded-full"></div>
                            <span>Plataforma SaaS Multi-usuário</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="p-8 md:p-12 flex-1 flex flex-col justify-center relative">
                    <div className="max-w-md mx-auto w-full">

                        {view === 'LOGIN' && (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bem-vindo de volta!</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-8">Acesse sua conta para gerenciar suas entregas.</p>
                            </>
                        )}

                        {view === 'REGISTER' && (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Crie sua conta</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-8">Comece a usar o LogiTrack gratuitamente.</p>
                            </>
                        )}

                        {view === 'RECOVERY' && (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Recuperar Senha</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-8">
                                    {recoveryStep === 'EMAIL' && 'Informe seu email para receber o código.'}
                                    {recoveryStep === 'CODE' && 'Digite o código recebido e sua nova senha.'}
                                </p>
                            </>
                        )}

                        {error && (
                            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg font-medium animate-fade-in">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg font-medium animate-fade-in">
                                {successMsg}
                            </div>
                        )}

                        {/* LOGIN & REGISTER FORM */}
                        {(view === 'LOGIN' || view === 'REGISTER') && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {view === 'REGISTER' && (
                                    <div className="space-y-1 animate-slide-down">
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Nome Completo</label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                            <input
                                                type="text"
                                                className="auth-input w-full pl-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                                placeholder="Seu nome"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="email"
                                            className="auth-input w-full pl-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {view === 'REGISTER' && (
                                    <div className="space-y-1 animate-slide-down">
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Telefone</label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-3 top-3 text-slate-400" />
                                            <input
                                                type="tel"
                                                className="auth-input w-full pl-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                                placeholder="(00) 00000-0000"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Senha</label>
                                        {view === 'LOGIN' && (
                                            <button
                                                type="button"
                                                onClick={() => switchView('RECOVERY')}
                                                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                            >
                                                Esqueci minha senha
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="auth-input w-full pl-10 pr-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mt-2"
                                >
                                    {view === 'LOGIN' ? 'Entrar na Plataforma' : 'Criar Conta'}
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        )}

                        {/* RECOVERY FORM */}
                        {view === 'RECOVERY' && (
                            <div className="animate-fade-in">
                                {recoveryStep === 'EMAIL' ? (
                                    <form onSubmit={handleSendCode} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Email da Conta</label>
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    type="email"
                                                    className="auth-input w-full pl-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                                    placeholder="seu@email.com"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
                                        >
                                            Enviar Código
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleVerifyAndReset} className="space-y-4 animate-slide-up">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-4">
                                            Enviamos um código para <strong>{email}</strong>.
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Código de 6 Dígitos</label>
                                            <div className="relative">
                                                <KeyRound size={18} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    type="text"
                                                    className="auth-input w-full pl-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors font-mono tracking-widest"
                                                    placeholder="000000"
                                                    value={resetCode}
                                                    onChange={e => setResetCode(e.target.value)}
                                                    required
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Nova Senha</label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="auth-input w-full pl-10 pr-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                                    placeholder="Nova senha"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    required
                                                    minLength={4}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Confirmar Nova Senha</label>
                                            <div className="relative">
                                                <ShieldCheck size={18} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    className="auth-input w-full pl-10 pr-10 p-2.5 border-b-2 border-slate-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-colors"
                                                    placeholder="Confirme a senha"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    required
                                                    minLength={4}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
                                        >
                                            Redefinir Senha
                                        </button>
                                    </form>
                                )}

                                <div className="mt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={() => switchView('LOGIN')}
                                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-sm font-medium flex items-center justify-center gap-1 w-full"
                                    >
                                        <ArrowLeft size={14} />
                                        Voltar para Login
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer Links (Only show in Login/Register modes) */}
                        {(view === 'LOGIN' || view === 'REGISTER') && (
                            <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-700 pt-6">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {view === 'LOGIN' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                                    <button
                                        onClick={() => switchView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                                        className="ml-1 text-blue-600 dark:text-blue-400 font-bold hover:underline focus:outline-none"
                                    >
                                        {view === 'LOGIN' ? 'Cadastre-se' : 'Faça Login'}
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
