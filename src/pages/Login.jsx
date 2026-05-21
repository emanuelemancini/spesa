import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import useStore from '../store/useStore';

export default function Login() {
    const { login, updateUser } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            updateUser({
                name: user.displayName || user.email,
                avatar: user.photoURL || '/avatar.jpg',
                email: user.email,
            });
            login();
        } catch (e) {
            console.error(e);
            setError('Accesso con Google fallito. Riprova.');
        } finally {
            setLoading(false);
        }
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
                <p className="text-slate-400 text-sm mt-2">Gestisci la tua spesa e dispensa</p>
            </div>

            <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
                {error && (
                    <p className="text-xs font-bold text-red-500 text-center animate-pulse">{error}</p>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-14 bg-white border border-slate-200 text-slate-700 font-bold text-base rounded-[24px] shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:shadow-lg disabled:opacity-60"
                >
                    {loading ? (
                        <span className="material-symbols-rounded animate-spin !text-[22px] text-slate-400">sync</span>
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    )}
                    {loading ? 'Accesso in corso…' : 'Accedi con Google'}
                </button>
            </div>
        </div>
    );
}
