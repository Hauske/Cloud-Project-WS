import { Router } from "express";
import cvController from "../controllers/cvController";

const router = Router()

router.post('/', cvController.createCv);
router.get('/:userId', cvController.getCvsByUser);
router.get('/:id', cvController.getCvById);
router.put('/:id', cvController.updateCV);
router.delete('/:id', cvController.deleteCV);

export default router;
