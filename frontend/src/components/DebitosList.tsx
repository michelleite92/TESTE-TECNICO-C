'use client';

import { useState } from 'react';
import api, { DebitoCalculado, API_PREFIX } from '@/lib/api';

interface Props {
  debitos: DebitoCalculado[];
  onAtualizar: () => void;
}

const LABELS_TIPO: Record<string, string> = {
  IPVA: 'IPVA',
  MULTA: 'Multa',
  LICENCIAMENTO: 'Licenciamento',
  DPVAT: 'DPVAT',
};

const CORES_STATUS: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  PAGO: 'bg-green-100 text-green-800',
  VENCIDO: 'bg-red-100 text-red-800',
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr: string): string {
  const data = new Date(dataStr);
  return data.toLocaleDateString('pt-BR');
}

export default function DebitosList({ debitos, onAtualizar }: Props) {
  const [quitando, setQuitando] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ id: number; texto: string; tipo: 'sucesso' | 'erro' } | null>(null);

  async function handleQuitar(id: number) {
    setQuitando(id);
    setMensagem(null);
    try {
      await api.patch(`${API_PREFIX}/debitos/${id}/quitar`);
      setMensagem({ id, texto: 'Débito quitado com sucesso!', tipo: 'sucesso' });
      onAtualizar();
    } catch {
      setMensagem({ id, texto: 'Erro ao quitar débito.', tipo: 'erro' });
    } finally {
      setQuitando(null);
    }
  }
  if (debitos.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Nenhum débito encontrado para este veículo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {debitos.map((debito) => (
        <div key={debito.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-700">
                  {LABELS_TIPO[debito.tipo] || debito.tipo}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CORES_STATUS[debito.status]}`}>
                  {debito.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{debito.descricao}</p>
              <p className="text-xs text-gray-400 mt-1">
                Vencimento: {formatarData(debito.vencimento)}
              </p>
              {mensagem?.id === debito.id && (
                <p className={`text-xs mt-2 font-medium ${mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'}`}>
                  {mensagem.texto}
                </p>
              )}
            </div>

            <div className="text-right ml-4">
              <p className="text-base font-bold text-gray-900">
                {formatarMoeda(debito.valorTotal)}
              </p>
              {debito.valorMulta > 0 && (
                <p className="text-xs text-red-500">
                  + {formatarMoeda(debito.valorMulta)} multa
                </p>
              )}
              {debito.valorJuros > 0 && (
                <p className="text-xs text-orange-500">
                  + {formatarMoeda(debito.valorJuros)} juros
                </p>
              )}
              {(debito.status === 'PENDENTE' || debito.status === 'VENCIDO') && (
                <button
                  onClick={() => handleQuitar(debito.id)}
                  disabled={quitando === debito.id}
                  className="mt-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {quitando === debito.id ? 'Quitando...' : 'Quitar'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
