import { Injectable, NotImplementedException, NotFoundException, ConflictException } from '@nestjs/common';
import { DebitoRepository } from 'src/debito/infra/repository/Debito.repository';
import { VeiculoRepository } from 'src/veiculo/infra/repository/Veiculo.repository';
import { Debito } from 'src/debito/dominio/entity/Debito.entity';
import { CriarDebitoDto } from 'src/debito/dominio/dto/CriarDebito.dto';
import { FiltrarDebitosCommand } from 'src/debito/dominio/command/FiltrarDebitos.command';
import { DebitoCalculadoQuery } from 'src/debito/dominio/query/DebitoCalculado.query';
import { ResumoDebitosQuery } from 'src/debito/dominio/query/ResumoDebitos.query';
import { StatusDebito } from 'src/debito/dominio/enuns/StatusDebito.enum';

@Injectable()
export class DebitoService {
  constructor(
    private readonly debitoRepository: DebitoRepository,
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  calcularTotais(debito: Debito): DebitoCalculadoQuery {
    const valorMulta = debito.valor * (debito.percentualMulta / 100);
    const valorJuros = debito.valor * (debito.percentualJuros / 100);

    return {
      ...debito,
      valorMulta,
      valorJuros,
      valorTotal: debito.valor + valorMulta + valorJuros,
    };
  }

  async listarPorPlaca(placa: string, command: FiltrarDebitosCommand): Promise<DebitoCalculadoQuery[]> {
    const veiculo = await this.veiculoRepository.buscarPorPlaca(placa.toUpperCase());

    if (!veiculo) {
      throw new NotFoundException(`Veículo com placa ${placa} não encontrado`);
    }

    const debitos = await this.debitoRepository.listar({
      ...command,
      veiculoId: (veiculo as any).id,
    });

    return debitos.map((d) => this.calcularTotais(d));
  }

  async buscarPorId(id: number): Promise<DebitoCalculadoQuery> {
    const debito = await this.debitoRepository.buscarPorId(id);

    if (!debito) {
      throw new NotFoundException(`Débito ${id} não encontrado`);
    }

    return this.calcularTotais(debito);
  }

  async criar(dto: CriarDebitoDto): Promise<DebitoCalculadoQuery> {
    const veiculo = await this.veiculoRepository.buscarPorId(dto.veiculoId);

    if (!veiculo) {
      throw new NotFoundException(`Veículo ${dto.veiculoId} não encontrado`);
    }

    const debito = await this.debitoRepository.inserir({
      ...dto,
      status: dto.status ?? StatusDebito.PENDENTE,
      percentualMulta: dto.percentualMulta ?? 0,
      percentualJuros: dto.percentualJuros ?? 0,
    });

    return this.calcularTotais(debito);
  }

  async atualizarStatus(id: number, status: StatusDebito): Promise<void> {
    const atualizado = await this.debitoRepository.atualizar(id, { status });

    if (!atualizado) {
      throw new NotFoundException(`Débito ${id} não encontrado`);
    }
  }

  async quitar(id: number): Promise<void> {
    const debito = await this.debitoRepository.buscarPorId(id);

    if (!debito) {
      throw new NotFoundException(`Débito ${id} não encontrado`);
    }

    if (debito.status === StatusDebito.PAGO) {
      throw new ConflictException(`Débito ${id} já está pago`);
    }

    await this.debitoRepository.atualizar(id, { status: StatusDebito.PAGO });
  }

  async resumo(placa: string): Promise<ResumoDebitosQuery> {
    const veiculo = await this.veiculoRepository.buscarPorPlaca(placa.toUpperCase());

    if (!veiculo) {
      throw new NotFoundException(`Veículo com placa ${placa} não encontrado`);
    }
  
    const debitos = await this.debitoRepository.buscarPorVeiculoId((veiculo as any).id);
  
    const calculados = debitos.map((d) => this.calcularTotais(d));
  
    const porTipo = calculados.reduce(
      (acc, d) => {
        acc[d.tipo] = (acc[d.tipo] || 0) + d.valorTotal;
        return acc;
      },
      {} as Record<string, number>,
    );
  
    const valorTotal = calculados.reduce((acc, d) => acc + d.valorTotal, 0);
  
    return {
      placa: veiculo.placa,
      proprietario: veiculo.proprietario,
      totalDebitos: calculados.length,
      valorTotal,
      porTipo,
    };
  }
}
