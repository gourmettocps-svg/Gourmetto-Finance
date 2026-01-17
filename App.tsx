
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Boleto, MacroReport, PaymentStatus } from './types';
import BoletoCard from './components/BoletoCard';
import MacroReportView from './components/MacroReportView';
import BoletoModal from './components/BoletoModal';
import CategoryModal from './components/CategoryModal';
import Auth from './components/Auth';
import { REFERENCE_DATE } from './constants';

const DEFAULT_CATEGORIES = ['Habitação', 'Lazer', 'Saúde', 'Educação', 'Transporte', 'Tecnologia', 'Utilidades', 'Outros'];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking' | 'error'>('checking');
  const [hasSubcategoryCol, setHasSubcategoryCol] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PAGO' | 'PENDENTE'>('TODOS');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [activeCategoryForSub, setActiveCategoryForSub] = useState<string | null>(null);
  const [boletoToEdit, setBoletoToEdit] = useState<Boleto | null>(null);

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

  const fetchUserData = async (userId: string, isManualTest = false) => {
    setDbStatus('checking');
    try {
      const { data: colCheck, error: colError } = await supabase.from('boletos').select('subcategoria').limit(1);
      setHasSubcategoryCol(!colError);

      const { data: boletosData, error: bError } = await supabase
        .from('boletos')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: true });
      
      if (bError) throw bError;
      setBoletos(boletosData || []);

      const { data: catData } = await supabase.from('categories').select('name').eq('user_id', userId);
      if (catData) {
        const customNames = catData.map(c => c.name);
        setCategories([...DEFAULT_CATEGORIES, ...customNames]);
      }

      const { data: subCatData } = await supabase.from('subcategories').select('name, category_name').eq('user_id', userId);
      if (subCatData) {
        const map: Record<string, string[]> = {};
        subCatData.forEach(sc => {
          if (!map[sc.category_name]) map[sc.category_name] = [];
          map[sc.category_name].push(sc.name);
        });
        setSubcategories(map);
      }
      setDbStatus('online');
    } catch (err: any) {
      setDbStatus('error');
      setMessage(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBoleto = async (id: string) => {
    if (!id || !session?.user?.id) return;
    
    if (window.confirm('Deseja excluir este lançamento permanentemente?')) {
      try {
        console.log("Executando exclusão do boleto:", id);
        
        const { error } = await supabase
          .from('boletos')
          .delete()
          .match({ id: id, user_id: session.user.id });

        if (error) throw error;

        // Atualização reativa do estado
        setBoletos(prev => prev.filter(b => b.id !== id));
        setMessage('Lançamento excluído com sucesso.');
        
      } catch (err: any) {
        console.error("Erro ao deletar:", err);
        setMessage(`Falha na exclusão: ${err.message}`);
      } finally {
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const handleSaveBoleto = async (data: Omit<Boleto, 'id'>) => {
    try {
      const payload: any = {
        titulo: data.titulo,
        categoria: data.categoria,
        valor: data.valor,
        data_vencimento: data.data_vencimento,
        data_pagamento: data.data_pagamento,
        status: data.status,
        observacoes: data.observacoes
      };

      if (hasSubcategoryCol) payload.subcategoria = data.subcategoria;

      if (boletoToEdit) {
        const { error } = await supabase.from('boletos').update(payload).eq('id', boletoToEdit.id);
        if (error) throw error;
        setBoletos(prev => prev.map(b => b.id === boletoToEdit.id ? { ...data, id: b.id } as any : b));
        setMessage(`Registro atualizado.`);
      } else {
        payload.user_id = session.user.id;
        const { data: savedData, error } = await supabase.from('boletos').insert([payload]).select().single();
        if (error) throw error;
        if (savedData) setBoletos(prev => [...prev, savedData as any]);
        setMessage(`Lançamento registrado.`);
      }
    } catch (err: any) {
      setMessage(`Erro ao salvar: ${err.message}`);
    }
    setBoletoToEdit(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase.from('boletos').update({ status: 'PAGO', data_pagamento: REFERENCE_DATE }).eq('id', id);
    if (error) setMessage(`Erro: ${error.message}`);
    else {
      setBoletos(prev => prev.map(b => b.id === id ? { ...b, status: 'PAGO', data_pagamento: REFERENCE_DATE } : b));
      setMessage(`Baixa efetuada.`);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const addCategory = async (name: string) => {
    const { error } = await supabase.from('categories').insert([{ user_id: session.user.id, name }]);
    if (!error) setCategories(prev => [...prev, name]);
  };

  const addSubCategory = async (name: string) => {
    const { error } = await supabase.from('subcategories').insert([{ user_id: session.user.id, name, category_name: activeCategoryForSub }]);
    if (!error) setSubcategories(prev => ({ ...prev, [activeCategoryForSub!]: [...(prev[activeCategoryForSub!] || []), name] }));
  };

  const filteredBoletos = boletos.filter(b => {
    const matchesSearch = b.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || b.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || b.status === statusFilter;
    const matchesDate = (!dateStart || b.data_vencimento >= dateStart) && (!dateEnd || b.data_vencimento <= dateEnd);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const reportData = (data: Boleto[]): MacroReport => {
    const totalProjetado = data.reduce((acc, b) => acc + b.valor, 0);
    const totalPago = data.filter(b => b.status === 'PAGO').reduce((acc, b) => acc + b.valor, 0);
    const categoriasMap = data.reduce((acc, b) => { acc[b.categoria] = (acc[b.categoria] || 0) + b.valor; return acc; }, {} as any);
    return {
      visaoPorCategorias: Object.entries(categoriasMap).map(([categoria, total]) => ({ categoria, total: total as number })),
      totalProjetado,
      totalPago,
      percentualLiquidado: totalProjetado > 0 ? (totalPago / totalProjetado) * 100 : 0
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans selection:bg-blue-100">
      <BoletoModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setBoletoToEdit(null); }} 
        onSave={handleSaveBoleto}
        onDelete={deleteBoleto}
        categories={categories} 
        subcategories={subcategories}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        onOpenSubCategoryModal={(cat) => { setActiveCategoryForSub(cat); setIsSubCategoryModalOpen(true); }}
        initialData={boletoToEdit as any}
      />

      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={addCategory} title="Nova Categoria" />
      <CategoryModal isOpen={isSubCategoryModalOpen} onClose={() => setIsSubCategoryModalOpen(false)} onSave={addSubCategory} title={`Sub p/ ${activeCategoryForSub}`} />

      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-sm flex items-center justify-center text-white font-bold text-lg shadow-inner">G</div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tighter uppercase">GOURMETTO <span className="text-blue-600">FINANCE</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => supabase.auth.signOut()} className="text-[9px] font-bold text-slate-400 uppercase hover:text-rose-500 transition-colors">Sair</button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95">+ NOVO LANÇAMENTO</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {message && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-sm shadow-2xl text-[10px] font-bold uppercase tracking-widest border border-slate-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projetado', val: reportData(boletos).totalProjetado, color: 'blue' },
            { label: 'Liquidado', val: reportData(boletos).totalPago, color: 'emerald' },
            { label: 'Pendente', val: reportData(boletos).totalProjetado - reportData(boletos).totalPago, color: 'rose' },
          ].map((c, i) => (
            <div key={i} className="bg-white p-5 border border-slate-200 rounded-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className={`text-xl font-black text-${c.color}-600 tracking-tighter`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.val)}</p>
            </div>
          ))}
          <div className="bg-white p-5 border border-slate-200 rounded-sm flex flex-col justify-center">
             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${reportData(boletos).percentualLiquidado}%` }}></div>
             </div>
             <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest text-center">{reportData(boletos).percentualLiquidado.toFixed(0)}% Pago</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setShowReport(false)} className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest border rounded-sm transition-all ${!showReport ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Lista</button>
          <button onClick={() => setShowReport(true)} className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest border rounded-sm transition-all ${showReport ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Insights</button>
        </div>

        {showReport ? (
          <MacroReportView report={reportData(boletos)} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
               <input type="text" placeholder="Filtrar por título ou categoria..." className="text-xs bg-white border border-slate-200 px-4 py-2 rounded-sm w-full md:w-64 outline-none focus:border-blue-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               <div className="flex gap-2">
                  <input type="date" className="text-[10px] bg-white border border-slate-200 px-2 py-1.5 rounded-sm" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                  <input type="date" className="text-[10px] bg-white border border-slate-200 px-2 py-1.5 rounded-sm" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
               </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredBoletos.map(b => (
                <BoletoCard 
                  key={b.id} 
                  boleto={b as any} 
                  onMarkPaid={() => markAsPaid(b.id)} 
                  onDelete={() => deleteBoleto(b.id)} 
                  onEdit={() => { setBoletoToEdit(b as any); setIsModalOpen(true); }} 
                />
              ))}
              {filteredBoletos.length === 0 && <div className="py-20 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Nenhum registro encontrado</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
