
import React from 'react';
import { Boleto } from '../types';

interface BoletoCardProps {
  boleto: Boleto;
  onMarkPaid: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const BoletoCard: React.FC<BoletoCardProps> = ({ boleto, onMarkPaid, onDelete, onEdit }) => {
  const isPaid = boleto.status === 'PAGO';
  const isOverdue = !isPaid && new Date(boleto.data_vencimento) < new Date('2026-01-15');

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit();
  };

  const handlePaid = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkPaid();
  };

  return (
    <div className={`group relative flex flex-col md:flex-row md:items-center p-6 md:p-8 bg-white transition-all hover:bg-slate-50/50 ${isPaid ? 'opacity-80' : ''}`}>
      <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-sm transition-all ${isPaid ? 'bg-blue-600' : 'bg-rose-600'}`}></div>

      <div className="flex flex-col flex-grow md:max-w-[30%]">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight uppercase truncate">{boleto.titulo}</h3>
          {isOverdue && <span className="text-[8px] bg-rose-600 text-white px-2 py-0.5 rounded-sm font-bold uppercase tracking-tighter shrink-0">🚨 ATRASADO</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-[9px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100 tracking-wider">
            {boleto.categoria}
          </span>
          {boleto.subcategoria && (
            <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100 tracking-wider">
               {boleto.subcategoria}
            </span>
          )}
        </div>
      </div>

      <div className="my-4 md:my-0 md:px-10 md:min-w-[180px] text-left md:text-center border-l-0 md:border-l border-slate-100">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mb-1">Montante</p>
        <p className={`text-xl font-black ${isPaid ? 'text-slate-400' : 'text-slate-900'} tracking-tight`}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.valor)}
        </p>
      </div>

      <div className={`flex-shrink-0 md:px-6 mb-4 md:mb-0 flex items-center justify-center transition-all duration-300 ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
        <div className={`p-2 rounded-full ${isPaid ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          {isPaid ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
            </svg>
          )}
        </div>
      </div>

      <div className="mb-4 md:mb-0 md:px-10 border-l-0 md:border-l border-slate-100 min-w-[140px]">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mb-1">Vencimento</p>
        <p className={`text-sm font-black ${isOverdue ? 'text-rose-600' : 'text-slate-600'} tracking-wide`}>
          {new Date(boleto.data_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </p>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-3 flex-grow min-w-[160px]">
        {!isPaid && (
          <button 
            type="button"
            onClick={handlePaid} 
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-[0.1em] shadow-md transition-all active:scale-95 z-10"
          >
            QUITAR
          </button>
        )}
        <div className="flex items-center bg-slate-100 rounded-sm p-0.5 ml-auto z-10">
          <button 
            type="button"
            onClick={handleEdit} 
            className="text-slate-400 hover:text-blue-600 p-2 transition-all hover:bg-blue-50 rounded-sm"
            title="Editar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button 
            type="button"
            onClick={handleDelete} 
            className="flex items-center gap-1 text-slate-400 hover:text-rose-600 px-3 py-2 transition-all hover:bg-rose-50 rounded-sm active:scale-90"
            title="Excluir Lançamento"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[8px] font-bold uppercase tracking-widest hidden group-hover:inline">EXCLUIR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoletoCard;
