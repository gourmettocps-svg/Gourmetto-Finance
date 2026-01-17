
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

  const fetchUserData = async (userId: string, isManualTest = false) => {
    setDbStatus('checking');
    if (isManualTest) setMessage("Iniciando diagnóstico de infraestrutura...");
    
    try {
      // Teste de Schema: Verificar se a coluna subcategoria existe
      const { data: colCheck, error: colError } = await supabase
        .from('boletos')
        .select('subcategoria')
        .limit(1);
      
      setHasSubcategoryCol(!colError);

      // Busca de Boletos
      const { data: boletosData, error: bError } = await supabase
        .from('boletos')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: true });
      
      if (bError) throw bError;
      setBoletos(boletosData || []);

      // Busca de Categorias
      const { data: catData } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId);
      
      if (catData) {
        const customNames = catData.map(c => c.name);
        setCategories([...DEFAULT_CATEGORIES, ...customNames]);
      }

      // Busca de Subcategorias
      const { data: subCatData } = await supabase
        .from('subcategories')
        .select('name, category_name')
        .eq('user_id', userId);

      if (subCatData) {
        const map: Record<string, string[]> = {};
        subCatData.forEach(sc => {
          if (!map[sc.category_name]) map[sc.category_name] = [];
          map[sc.category_name].push(sc.name);
        });
        setSubcategories(map);
      }

      setDbStatus('online');
      if (isManualTest) setMessage("Conexão OK. Schema sincronizado.");
    } catch (err: any) {
      console.error("Erro diagnóstico:", err.message);
      setDbStatus('error');
      setMessage(`Falha na Conexão: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSaveBoleto = async (data: Omit<Boleto, 'id'>) => {
    try {
      // Prepara payload dinâmico baseado no que o banco suporta
      const payload: any = {
        titulo: data.titulo,
        categoria: data.categoria,
        valor: data.valor,
        data_vencimento: data.data_vencimento,
        data_pagamento: data.data_pagamento,
        status: data.status,
        observacoes: data.observacoes
      };

      // Só inclui subcategoria se a coluna existir no banco
      if (hasSubcategoryCol) {
        payload.subcategoria = data.subcategoria;
      }

      if (boletoToEdit) {
        const { error } = await supabase
          .from('boletos')
          .update(payload)
          .eq('id', boletoToEdit.id);

        if (error) throw error;
        setBoletos(prev => prev.map(b => b.id === boletoToEdit.id ? { ...data, id: b.id } as any : b));
        setMessage(`Registro atualizado.`);
      } else {
        payload.user_id = session.user.id;
        const { data: savedData, error } = await supabase
          .from('boletos')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (savedData) {
          setBoletos(prev => [...prev, savedData as any]);
          setMessage(`Lançamento registrado.`);
        }
      }
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setMessage(`Erro ao salvar: ${err.message}. Certifique-se de que a coluna 'subcategoria' existe no seu banco.`);
    }
    setBoletoToEdit(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('boletos')
      .update({ status: 'PAGO', data_pagamento: REFERENCE_DATE })
      .eq('id', id);

    if (error) setMessage(`Erro: ${error.message}`);
    else {
      setBoletos(prev => prev.map(b => b.id === id ? { ...b, status: 'PAGO', data_pagamento: REFERENCE_DATE } : b));
      setMessage(`Baixa efetuada.`);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteBoleto = async (id: string) => {
    if (window.confirm('Excluir permanentemente?')) {
      const { error } = await supabase.from('boletos').delete().eq('id', id);
      if (error) setMessage(`Erro: ${error.message}`);
      else {
        setBoletos(prev => prev.filter(b => b.id !== id));
        setMessage('Removido.');
      }
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const addCategory = async (name: string) => {
    const { error } = await supabase.from('categories').insert([{ user_id: session.user.id, name }]);
    if (!error) {
      setCategories(prev => [...prev, name]);
      setMessage("Categoria salva.");
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const addSubCategory = async (name: string) => {
    const { error } = await supabase.from('subcategories').insert([{ user_id: session.user.id, name, category_name: activeCategoryForSub }]);
    if (!error) {
      setSubcategories(prev => ({ ...prev, [activeCategoryForSub!]: [...(prev[activeCategoryForSub!] || []), name] }));
      setMessage("Subcategoria salva.");
    }
    setTimeout(() => setMessage(null), 3000);
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
        isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setBoletoToEdit(null); }} onSave={handleSaveBoleto}
        categories={categories} subcategories={subcategories}
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
        {hasSubcategoryCol === false && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-pulse">
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">⚠️ Atualização de Banco Necessária</p>
              <p className="text-[11px] text-amber-700 font-medium">A coluna 'subcategoria' não foi detectada. O sistema funcionará em modo simplificado.</p>
            </div>
            <code className="bg-white p-2 text-[9px] border border-amber-100 rounded text-slate-600 select-all">
              ALTER TABLE boletos ADD COLUMN subcategoria text;
            </code>
          </div>
        )}

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
          
          <button onClick={() => fetchUserData(session.user.id, true)} className="ml-auto p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Testar Conexão">
            <svg className={`w-4 h-4 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        {showReport ? (
          <MacroReportView report={reportData(boletos)} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
               <input type="text" placeholder="Filtrar lançamentos..." className="text-xs bg-white border border-slate-200 px-4 py-2 rounded-sm w-full md:w-64 outline-none focus:border-blue-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               <div className="flex gap-2">
                  <input type="date" className="text-[10px] bg-white border border-slate-200 px-2 py-1.5 rounded-sm" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                  <input type="date" className="text-[10px] bg-white border border-slate-200 px-2 py-1.5 rounded-sm" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
               </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredBoletos.map(b => (
                <BoletoCard key={b.id} boleto={b as any} onMarkPaid={() => markAsPaid(b.id)} onDelete={() => deleteBoleto(b.id)} onEdit={() => { setBoletoToEdit(b as any); setIsModalOpen(true); }} />
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
