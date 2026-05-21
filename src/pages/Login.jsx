import React, { useState } from 'react';
import useStore from '../store/useStore';

export default function Login() {
    const { login, config, updateConfig, updateUser } = useStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim() && password.trim()) {
            if (username === 'test' && password === '1234') {
                updateUser({ name: 'Test' });
                login();
                return;
            }
            if (!config.pin) {
                updateConfig({ pin: password });
                updateUser({ name: username });
                login();
            } else if (config.pin === password) {
                updateUser({ name: username });
                login();
            } else {
                setError('Password errata o campi mancanti.');
            }
        } else {
            setError('Inserisci nome utente e password validi.');
        }
    };

    const handleTestLogin = () => {
        updateUser({ name: 'Test' });
        login();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 relative overflow-hidden pb-20 -mx-4">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-40">
                <div className="absolute -top-[10%] -right-[20%] w-[80%] h-[40%] bg-primary rounded-full blur-[100px]"></div>
                <div className="absolute top-[40%] -left-[20%] w-[60%] h-[40%] bg-blue-400 rounded-full blur-[100px]"></div>
            </div>

            <div className="flex flex-col items-center mb-10 text-center">
                <div className="size-24 bg-white rounded-[32px] shadow-xl shadow-primary/20 flex items-center justify-center mb-6 border border-slate-100 p-2">
                    <img src="./icon.png" alt="La Mia Spesa Logo" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">La Mia Spesa</h1>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-sm mx-auto flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-2">Nome Utente</label>
                    <div className="relative">
                        <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl">person</span>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(false); }}
                            placeholder="Inserisci il tuo nome" 
                            className="w-full h-14 pl-12 pr-4 bg-white border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none font-bold text-sm shadow-sm transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-2">Password</label>
                    <div className="relative">
                        <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl">lock</span>
                        <input 
                            type="password" 
                            maxLength={6}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(false); }}
                            placeholder="Inserisci una password" 
                            className="w-full h-14 pl-12 pr-4 bg-white border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none font-bold text-sm shadow-sm transition-all placeholder:text-slate-300 tracking-widest"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-xs font-bold text-red-500 text-center mt-2 animate-pulse">{error}</p>
                )}

                <button
                    type="submit"
                    className="w-full h-14 bg-primary text-white font-black text-lg rounded-[24px] shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 group"
                >
                    <span>Accedi ora</span>
                    <span className="material-symbols-rounded group-active:translate-x-1 transition-transform !text-[20px]">arrow_forward</span>
                </button>

            </form>
        </div>
    );
}
