
import React from 'react';
import { MacroReport } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MacroReportViewProps {
  report: MacroReport;
}

const MacroReportView: React.FC<MacroReportViewProps> = ({ report }) => {
  const colors = ['#2563eb', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

  return (
    <div className="bg-white rounded-sm shadow-sm p-6 md:p-10 border border-slate-200 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Relatório Consolidado</h2>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise de Fluxo</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-50/30 p-6 rounded-sm border border-blue-100">
          <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mb-1">Montante Projetado</p>
          <p className="text-2xl font-bold text-blue-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.totalProjetado)}
          </p>
        </div>
        <div className="bg-emerald-50/30 p-6 rounded-sm border border-emerald-100">
          <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Montante Liquidado</p>
          <p className="text-2xl font-bold text-emerald-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.totalPago)}
          </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-sm border border-slate-200">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Índice de Pagamento</p>
          <p className="text-2xl font-bold text-slate-700">{report.percentualLiquidado.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="font-bold text-slate-400 mb-6 uppercase text-[9px] tracking-widest">Distribuição Mensal</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.visaoPorCategorias}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="categoria" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '2px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '12px', color: '#334155' }}
              />
              <Bar dataKey="total" radius={[1, 1, 0, 0]} barSize={35}>
                {report.visaoPorCategorias.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-slate-100">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-[9px] text-slate-400 uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Categoria Analisada</th>
              <th className="px-6 py-4 text-right">Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {report.visaoPorCategorias.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-600">{item.categoria}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">
                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MacroReportView;
