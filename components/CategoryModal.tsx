
import React, { useState, useEffect } from 'react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  title: string;
  initialName?: string;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, title, initialName = '' }) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-600/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight">
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome</label>
            <input 
              required
              autoFocus
              type="text"
              placeholder="Ex: Energia Elétrica"
              className="w-full px-4 py-2 rounded-sm bg-slate-100 border border-slate-300 focus:border-blue-400 outline-none text-slate-700 font-medium transition-all"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-sm border border-slate-300 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
