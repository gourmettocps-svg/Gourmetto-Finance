
import React, { useState, useEffect } from 'react';
import { Boleto } from '../types';

interface BoletoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boleto: Omit<Boleto, 'id'>) => void;
  categories: string[];
  subcategories: Record<string, string[]>;
  onOpenCategoryModal: () => void;
  onOpenSubCategoryModal: (category: string) => void;
  initialData?: Boleto | null;
}

const BoletoModal: React.FC<BoletoModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  categories, 
  subcategories,
  onOpenCategoryModal, 
  onOpenSubCategoryModal,
  initialData 
}) => {
  const [formData, setFormData] = useState({
    titulo: '',
    categoria: '',
    subcategoria: '',
    valor: '',
    data_vencimento: '',
    data_pagamento: '',
    observacoes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        titulo: initialData.titulo,
        categoria: initialData.categoria,
        subcategoria: initialData.subcategoria || '',
        valor: initialData.valor.toString(),
        data_vencimento: initialData.data_vencimento,
        data_pagamento: initialData.data_pagamento || '',
        observacoes: initialData.observacoes
      });
    } else {
      const firstCat = categories[0] || '';
      setFormData({
        titulo: '',
        categoria: firstCat,
        subcategoria: '',
        valor: '',
        data_vencimento: '',
        data_pagamento: '',
        observacoes: ''
      });
    }
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      titulo: formData.titulo,
      categoria: formData.categoria || categories[0],
      subcategoria: formData.subcategoria,
      valor: parseFloat(formData.valor),
      data_vencimento: formData.data_vencimento,
      data_pagamento: formData.data_pagamento || undefined,
      status: formData.data_pagamento ? 'PAGO' : 'PENDENTE',
      observacoes: formData.observacoes
    });
    onClose();
  };

  const currentSubcats = subcategories[formData.categoria] || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-tight">
            {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
            <input 
              required
              autoFocus
              type="text"
              className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-700 font-medium transition-all"
              value={formData.titulo}
              onChange={e => setFormData({...formData, titulo: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                <button 
                  type="button"
                  onClick={onOpenCategoryModal}
                  className="text-[8px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded-sm"
                >
                  + Categ
                </button>
              </div>
              <select 
                className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-700 font-medium transition-all"
                value={formData.categoria}
                onChange={e => setFormData({...formData, categoria: e.target.value, subcategoria: ''})}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subcategoria</label>
                <button 
                  type="button"
                  onClick={() => onOpenSubCategoryModal(formData.categoria)}
                  className="text-[8px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-sm"
                >
                  + Sub
                </button>
              </div>
              <select 
                className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-700 font-medium transition-all"
                value={formData.subcategoria}
                onChange={e => setFormData({...formData, subcategoria: e.target.value})}
              >
                <option value="">Nenhuma</option>
                {currentSubcats.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-900 font-black transition-all"
                value={formData.valor}
                onChange={e => setFormData({...formData, valor: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vencimento</label>
              <input 
                required
                type="date"
                className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-700 font-bold"
                value={formData.data_vencimento}
                onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Pagamento (Deixe vazio se pendente)</label>
              <input 
                type="date"
                className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-emerald-400 outline-none text-emerald-700 font-bold"
                value={formData.data_pagamento}
                onChange={e => setFormData({...formData, data_pagamento: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações</label>
            <textarea 
              rows={2}
              className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-700 text-sm font-medium"
              value={formData.observacoes}
              onChange={e => setFormData({...formData, observacoes: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-sm border border-slate-300 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">CANCELAR</button>
            <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-sm font-bold text-[10px] uppercase tracking-widest shadow-md active:scale-[0.98] transition-all">SALVAR REGISTRO</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoletoModal;
