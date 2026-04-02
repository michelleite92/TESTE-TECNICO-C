export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  criado_em: string;
}

export interface Veiculo {
  id: number;
  placa: string;
  renavam: string;
  proprietario: string;
  modelo: string;
  ano: number;
  cor: string;
  criado_em: string;
}

export interface Debito {
  id: number;
  veiculo_id: number;
  tipo: 'IPVA' | 'MULTA' | 'LICENCIAMENTO' | 'DPVAT';
  descricao: string;
  valor: number;
  multa_percentual: number;
  juros_percentual: number;
  vencimento: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  criado_em: string;
}

export interface DebitoCalculado extends Debito {
  valor_multa: number;
  valor_juros: number;
  valor_total: number;
}

export interface PaginacaoQuery {
  page?: string;
  limit?: string;
  status?: string;
  placa?: string;
}

export interface RespostaPaginada<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

declare global {
  namespace Express {
    interface Request {
      usuarioId?: number;
      usuarioEmail?: string;
    }
  }
}
