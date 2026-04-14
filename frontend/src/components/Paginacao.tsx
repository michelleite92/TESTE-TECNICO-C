'use client';

interface Props {
  paginaAtual: number;
  totalPaginas: number;
  onMudar: (pagina: number) => void;
}

export default function Paginacao({ paginaAtual, totalPaginas, onMudar }: Props) {
  if (totalPaginas <= 1) return null;

  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onMudar(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ← Anterior
      </button>

      {paginas.map((p) => (
        <button
          key={p}
          onClick={() => onMudar(p)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition ${
            p === paginaAtual
              ? 'bg-blue-700 text-white border-blue-700'
              : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onMudar(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Próximo →
      </button>
    </div>
  );
}