
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Boleto, MacroReport, PaymentStatus } from './types';
import BoletoCard from './components/BoletoCard';
import MacroReportView from './components/MacroReportView';
import BoletoModal from './components/BoletoModal';
import CategoryModal from './components/CategoryModal';
import Auth from './components/Auth';
import { REFERENCE_DATE } from './constants';

const DEFAULT_CATEGORIES = ['Habitação', 'Lazer', 'Saúde', 'Educação', 'Transporte', 'Tecnologia', 'Outros'];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | PaymentStatus>('TODOS');
  const [message, setMessage] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [boletoToEdit, setBoletoToEdit] = useState<Boleto | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else {
        setBoletos([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    setDbStatus('checking');
    try {
      const { data: boletosData, error: bError } = await supabase
        .from('boletos')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: true });
      
      if (bError) throw bError;
      if (boletosData) setBoletos(boletosData as any);

      const { data: catData, error: cError } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId);
      
      if (cError) throw cError;
      if (catData && catData.length > 0) {
        const customNames = catData.map(c => c.name);
        setCategories([...DEFAULT_CATEGORIES, ...customNames]);
      }
      
      setDbStatus('online');
    } catch (err: any) {
      console.error("Erro de comunicação com Supabase:", err.message);
      setDbStatus('offline');
      setMessage(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateReport = (data: Boleto[]): MacroReport => {
    const totalProjetado = data.reduce((acc, b) => acc + b.valor, 0);
    const totalPago = data.filter(b => b.status === 'PAGO').reduce((acc, b) => acc + b.valor, 0);
    
    const categoriasMap = data.reduce((acc, b) => {
      acc[b.categoria] = (acc[b.categoria] || 0) + b.valor;
      return acc;
    }, {} as Record<string, number>);

    const visaoPorCategorias = Object.entries(categoriasMap).map(([categoria, total]) => ({
      categoria,
      total
    }));

    return {
      visaoPorCategorias,
      totalProjetado,
      totalPago,
      percentualLiquidado: totalProjetado > 0 ? (totalPago / totalProjetado) * 100 : 0
    };
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('boletos')
      .update({ status: 'PAGO', data_pagamento: REFERENCE_DATE })
      .eq('id', id);

    if (error) {
      setMessage(`Erro ao quitar: ${error.message}`);
    } else {
      setBoletos(prev => prev.map(b => 
        b.id === id 
          ? { ...b, status: 'PAGO', data_pagamento: REFERENCE_DATE } 
          : b
      ));
      setMessage(`Baixa realizada com sucesso.`);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteBoleto = async (id: string) => {
    if (window.confirm('Excluir este lançamento permanentemente?')) {
      const { error } = await supabase.from('boletos').delete().eq('id', id);
      if (error) {
        setMessage(`Erro ao excluir: ${error.message}`);
      } else {
        setBoletos(prev => prev.filter(b => b.id !== id));
        setMessage('Lançamento removido.');
      }
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveBoleto = async (data: Omit<Boleto, 'id'>) => {
    if (boletoToEdit) {
      const { error } = await supabase
        .from('boletos')
        .update({
          titulo: data.titulo,
          categoria: data.categoria,
          valor: data.valor,
          data_vencimento: data.data_vencimento,
          data_pagamento: data.data_pagamento,
          status: data.status,
          observacoes: data.observacoes
        })
        .eq('id', boletoToEdit.id);

      if (error) {
        setMessage(`Erro ao atualizar: ${error.message}`);
      } else {
        setBoletos(prev => prev.map(b => b.id === boletoToEdit.id ? { ...data, id: b.id } : b));
        setMessage(`Registro atualizado.`);
      }
    } else {
      const newRecord = { ...data, user_id: session.user.id };
      const { data: savedData, error } = await supabase
        .from('boletos')
        .insert([newRecord])
        .select()
        .single();

      if (error) {
        setMessage(`Erro ao salvar: ${error.message}`);
      } else if (savedData) {
        setBoletos(prev => [...prev, savedData as any]);
        setMessage(`Lançamento registrado.`);
      }
    }
    setBoletoToEdit(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const addCategory = async (name: string) => {
    if (categories.includes(name)) return;
    const { error } = await supabase
      .from('categories')
      .insert([{ user_id: session.user.id, name }]);

    if (error) {
      setMessage(`Erro ao criar categoria: ${error.message}`);
    } else {
      setCategories(prev => [...prev, name]);
      setMessage(`Categoria "${name}" adicionada.`);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredBoletos = boletos.filter(b => {
    const matchesSearch = b.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.observacoes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStartDate = startDate ? new Date(b.data_vencimento) >= new Date(startDate) : true;
    const matchesEndDate = endDate ? new Date(b.data_vencimento) <= new Date(endDate) : true;
    const matchesStatus = statusFilter === 'TODOS' ? true : b.status === statusFilter;

    return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus;
  });

  const reportData = calculateReport(boletos);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Autenticando Gourmetto...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen pb-10 bg-slate-50 text-slate-800 selection:bg-blue-100 font-sans">
      <BoletoModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setBoletoToEdit(null); }} 
        onSave={handleSaveBoleto}
        categories={categories}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        initialData={boletoToEdit as any}
      />

      <CategoryModal 
        isOpen={isCategoryModalOpen}
        onClose={() => { setIsCategoryModalOpen(false); }}
        onSave={addCategory}
      />

      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-[60] shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-sm flex items-center justify-center text-white font-bold text-xl shadow-inner">G</div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">GOURMETTO <span className="text-blue-600">FINANCE</span></h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1 flex items-center gap-2">
                Gestão Financeira 
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${dbStatus === 'online' ? 'bg-emerald-500' : dbStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`}></span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:block text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Conta Ativa</p>
                <p className="text-[10px] font-bold text-slate-700 leading-none">{session.user.email}</p>
             </div>
             <button 
                onClick={() => supabase.auth.signOut()}
                className="text-[9px] font-bold text-rose-600 hover:text-rose-800 uppercase tracking-widest border border-rose-100 px-3 py-1.5 rounded-sm bg-rose-50/50"
             >
               Sair
             </button>
             <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-sm text-[10px] font-bold transition-all flex items-center gap-2 shadow-sm uppercase tracking-wider"
            >
              + NOVO LANÇAMENTO
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {message && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white px-6 py-3 rounded-sm shadow-xl animate-fade-in-up flex items-center gap-3 border border-slate-700">
            <span className="text-blue-400 font-bold">ℹ</span>
            <p className="text-[10px] font-bold uppercase tracking-widest">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projetado', val: reportData.totalProjetado, color: 'blue' },
            { label: 'Total Liquidado', val: reportData.totalPago, color: 'emerald' },
            { label: 'Saldo Pendente', val: reportData.totalProjetado - reportData.totalPago, color: 'rose' },
          ].map((card, i) => (
            <div key={i} className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
               <p className={`text-xl font-black text-${card.color}-600 tracking-tighter`}>
                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.val)}
               </p>
            </div>
          ))}
          <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm flex flex-col justify-center transition-transform hover:-translate-y-1">
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Liquidez Mensal</p>
             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${reportData.percentualLiquidado}%` }}></div>
             </div>
             <p className="text-[9px] font-bold text-emerald-600 mt-2 text-center">{reportData.percentualLiquidado.toFixed(0)}% Pago</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
           <div className="flex gap-2">
              <button 
                onClick={() => setShowReport(false)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${!showReport ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
              >
                Lista
              </button>
              <button 
                onClick={() => setShowReport(true)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${showReport ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
              >
                Gráficos
              </button>
           </div>
           
           <div className="flex items-center gap-3">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${dbStatus === 'online' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {dbStatus === 'online' ? '● Banco Conectado' : '○ Sincronizando...'}
              </span>
              <button 
                onClick={() => fetchUserData(session.user.id)}
                className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 active:scale-95 transition-all text-slate-400"
                title="Sincronizar Manualmente"
              >
                <svg className={`w-3.5 h-3.5 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
           </div>
        </div>

        <div className="w-full mb-12">
          {showReport ? (
            <MacroReportView report={reportData} />
          ) : (
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-5">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Painel de Lançamentos Cloud</h2>
                  
                  <div className="relative w-full md:w-96">
                    <input 
                      type="text"
                      placeholder="Busca em tempo real..."
                      className="bg-white border border-slate-200 rounded-sm py-2 pl-8 pr-4 text-[11px] outline-none focus:border-blue-400 transition-all w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 p-4 bg-white border border-slate-200 rounded-sm shadow-sm">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">De (Vencimento)</label>
                    <input 
                      type="date"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-sm text-[11px] outline-none focus:border-blue-300"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Até (Vencimento)</label>
                    <input 
                      type="date"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-sm text-[11px] outline-none focus:border-blue-300"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status do Pagamento</label>
                    <select 
                      className="w-full px-3 py-[7px] border border-slate-200 rounded-sm text-[11px] outline-none focus:border-blue-300 bg-white font-medium"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="TODOS">TODOS OS STATUS</option>
                      <option value="PENDENTE">SOMENTE PENDENTES</option>
                      <option value="PAGO">SOMENTE PAGOS</option>
                    </select>
                  </div>

                  {(startDate || endDate || statusFilter !== 'TODOS') && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('TODOS'); }}
                      className="px-4 py-1.5 text-[9px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-sm uppercase transition-all h-[34px]"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredBoletos.map((boleto) => (
                  <BoletoCard 
                    key={boleto.id} 
                    boleto={boleto as any} 
                    onMarkPaid={() => markAsPaid(boleto.id)} 
                    onDelete={() => deleteBoleto(boleto.id)}
                    onEdit={() => { setBoletoToEdit(boleto as any); setIsModalOpen(true); }}
                  />
                ))}
                {filteredBoletos.length === 0 && (
                  <div className="py-24 text-center">
                    <div className="text-slate-200 mb-4 flex justify-center">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-slate-400 font-bold text-sm uppercase tracking-tight">Nenhum registro no banco</h3>
                    <p className="text-slate-300 text-[10px] mt-2 uppercase tracking-[0.2em]">Todos os dados são persistidos via Supabase.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex justify-center pt-8 border-t border-slate-200">
           <div className="bg-white rounded-sm border border-slate-200 shadow-sm p-6 w-full max-w-lg">
              <div className="flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                   <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Configurações de Dados</h3>
                   <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-sm">{categories.length} Categorias</span>
                </div>
                <button 
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-4 rounded-sm text-[10px] font-bold uppercase transition-all border border-blue-100 shadow-sm flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar Nova Categoria
                </button>
              </div>
            </div>
        </div>
        
        <div ref={scrollRef}></div>
      </main>

      <footer className="text-center py-12 border-t border-slate-200 mt-10">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.6em]">GOURMETTO FINANCE • Versão Cloud 1.0.4</p>
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
