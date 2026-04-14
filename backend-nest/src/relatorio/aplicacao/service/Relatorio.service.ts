import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debito } from 'src/debito/dominio/entity/Debito.entity';
import { RelatorioInadimplenciaQuery, ItemRelatorioInadimplenciaQuery } from 'src/relatorio/dominio/query/RelatorioInadimplencia.query';
import { StatusDebito } from 'src/debito/dominio/enuns/StatusDebito.enum';

@Injectable()
export class RelatorioService {
  constructor(
    @InjectRepository(Debito)
    private readonly debitoRepository: Repository<Debito>,
  ) {}

  async inadimplencia(): Promise<RelatorioInadimplenciaQuery> {
    const debitos = await this.debitoRepository.find({
      where: { status: StatusDebito.VENCIDO },
      relations: ['veiculo'],
    });

    const porVeiculo = new Map<number, ItemRelatorioInadimplenciaQuery & { _valorBase: number }>();

    for (const debito of debitos) {
      const veiculo = debito.veiculo;
      if (!veiculo || !veiculo.id) continue;
      if (!veiculo) continue;

      const valorMulta = debito.valor * (debito.percentualMulta / 100);
      const valorJuros = debito.valor * (debito.percentualJuros / 100);
      const valorCalculado = debito.valor + valorMulta + valorJuros;

      if (!porVeiculo.has(veiculo.id)) {
        porVeiculo.set(veiculo.id, {
          placa: veiculo.placa,
          proprietario: veiculo.proprietario,
          modelo: veiculo.modelo,
          totalDebitosVencidos: 0,
          valorTotalVencido: 0,
          _valorBase: 0,
        });
      }  
      const item = porVeiculo.get(veiculo.id)!;
      item.totalDebitosVencidos += 1;
      item.valorTotalVencido += valorCalculado;
    }
    const veiculos = Array.from(porVeiculo.values())
      .map(({ _valorBase, ...item }) => item)
      .sort((a, b) => b.valorTotalVencido - a.valorTotalVencido);

    const valorTotalGeral = veiculos.reduce((acc, v) => acc + v.valorTotalVencido, 0);

    return {
      veiculos,
      totalVeiculos: veiculos.length,
      valorTotalGeral,
    };
  }
}
