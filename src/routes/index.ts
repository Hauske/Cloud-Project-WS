import { Router } from "express";
import userRoutes from "./userRoutes";
import cvRoutes from "./cvRoutes";

const router = Router();
router.use("/users", userRoutes);
router.use("/cvs", cvRoutes);


export default router;