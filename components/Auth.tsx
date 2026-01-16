
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = isRegistering 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (isRegistering) {
      setMessage("Conta criada! Verifique seu e-mail.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-slate-200 overflow-hidden animate-fade-in-up">
        <div className="bg-slate-900 p-10 text-center border-b border-slate-800">
          <div className="w-16 h-16 bg-blue-600 rounded-sm flex items-center justify-center text-white font-bold text-3xl shadow-inner mx-auto mb-6">G</div>
          <h1 className="text-2xl font-bold text-white tracking-tight leading-none uppercase">GOURMETTO <span className="text-blue-500">FINANCE</span></h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">Acesso Restrito ao Sistema</p>
        </div>
        
        <form onSubmit={handleAuth} className="p-8 space-y-5">
          {message && (
            <div className={`p-3 text-[10px] font-bold uppercase tracking-widest text-center rounded-sm border ${message.includes('Erro') || !isRegistering ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
              {message}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail Profissional</label>
            <input 
              type="email"
              required
              className="w-full px-4 py-3 rounded-sm bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none text-slate-700 text-xs transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Senha</label>
            <input 
              type="password"
              required
              className="w-full px-4 py-3 rounded-sm bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none text-slate-700 text-xs transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-[0.2em] py-4 rounded-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'PROCESSANDO...' : isRegistering ? 'CRIAR MINHA CONTA' : 'ENTRAR NO SISTEMA'}
          </button>

          <div className="text-center pt-4">
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] text-slate-400 hover:text-blue-600 font-bold uppercase tracking-wider transition-colors"
            >
              {isRegistering ? 'Já possui acesso? Faça login' : 'Solicitar novo acesso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
