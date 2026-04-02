import { queryAsync, getAsync, runAsync } from '../database/db';
import { Veiculo, RespostaPaginada } from '../types';

export function validarPlaca(placa: string): boolean {
  // Formato antigo: ABC1234 | Formato Mercosul: ABC1D23
  const regex = /^[A-Z]{3}\d{1}[A-Z0-9]{1}\d{2}$/;
  return regex.test(placa);
}

export async function listarVeiculos(
  page: number,
  limit: number,
  _status?: string
): Promise<RespostaPaginada<Veiculo>> {
  const offset = (page - 1) * limit;

  const [veiculos, contagem] = await Promise.all([
    queryAsync<Veiculo>(
      'SELECT * FROM veiculos ORDER BY criado_em DESC LIMIT ? OFFSET ?',
      [limit, offset]
    ),
    queryAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM veiculos'
    ),
  ]);

  return {
    data: veiculos,
    total: contagem[0]?.total ?? 0,
    page,
    limit,
  };
}

export async function buscarPorPlaca(placa: string): Promise<Veiculo | undefined> {
  return getAsync<Veiculo>(
    'SELECT * FROM veiculos WHERE placa = ?',
    [placa.toUpperCase()]
  );
}

export async function criarVeiculo(dados: Omit<Veiculo, 'id' | 'criado_em'>): Promise<Veiculo> {
  const { lastInsertRowid } = await runAsync(
    'INSERT INTO veiculos (placa, renavam, proprietario, modelo, ano, cor) VALUES (?, ?, ?, ?, ?, ?)',
    [dados.placa.toUpperCase(), dados.renavam, dados.proprietario, dados.modelo, dados.ano, dados.cor]
  );

  const veiculo = await getAsync<Veiculo>('SELECT * FROM veiculos WHERE id = ?', [lastInsertRowid]);
  if (!veiculo) throw new Error('Erro ao criar veículo');
  return veiculo;
}
