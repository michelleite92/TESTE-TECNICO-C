import { Router } from 'express';
import { listar, buscarPlaca, criar } from '../controllers/veiculo.controller';

const router = Router();

router.get('/', listar);
router.get('/:placa', buscarPlaca);
router.post('/', criar);

export default router;
