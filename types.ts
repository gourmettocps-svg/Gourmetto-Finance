
export type PaymentStatus = 'PAGO' | 'PENDENTE';

export interface Boleto {
  id: string;
  user_id?: string;
  titulo: string;
  categoria: string;
  valor: number;
  data_vencimento: string; // Snake case para bater com o banco
  data_pagamento?: string;
  status: PaymentStatus;
  observacoes: string;
  created_at?: string;
}

export interface MacroReport {
  visaoPorCategorias: { categoria: string; total: number }[];
  totalProjetado: number;
  totalPago: number;
  percentualLiquidado: number;
}
