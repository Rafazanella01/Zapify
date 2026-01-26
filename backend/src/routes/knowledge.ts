import { Router } from 'express';
import {
  listKnowledge,
  getKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
} from '../controllers/knowledgeController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// Todas as rotas requerem autenticacao
router.use(authMiddleware);

// CRUD de conhecimentos
router.get('/', listKnowledge);
router.get('/:id', getKnowledge);
router.post('/', createKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
