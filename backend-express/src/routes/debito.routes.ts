import { Router } from 'express';
import { listarPorPlaca, buscarPorId, criar, atualizarStatus, resumo } from '../controllers/debito.controller';

const router = Router();

router.get('/resumo', resumo);
router.get('/veiculo/:placa', listarPorPlaca);
router.get('/:id', buscarPorId);
router.post('/', criar);
router.patch('/:id/status', atualizarStatus);

export default router;
