import { Router } from "express";
import health from "./health";
import notes from "./notes";

const router = Router();
router.use("/health", health);
router.use("/notes", notes); // /notes/*
export default router;