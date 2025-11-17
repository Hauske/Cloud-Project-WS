import { Router } from "express";
import userRoutes from "./userRoutes";
import cvRoutes from "./cvRoutes";

const router = Router();

router.use("/user", userRoutes);
router.use("/cv", cvRoutes)

export default router;