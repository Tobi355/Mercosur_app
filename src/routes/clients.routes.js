import { Router } from 'express';
import {
    createClient,
    getAllClients,
    getClientItems
} from '../controllers/clients.controller.js';

const router = Router();

router.post('/', createClient);
router.get('/', getAllClients);
router.get('/:id/items', getClientItems);

export default router;