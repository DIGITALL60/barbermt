import { Router, type IRouter } from "express";
import healthRouter from "./health";
import barbersRouter from "./barbers";
import servicesRouter from "./services";
import appointmentsRouter from "./appointments";
import availabilityRouter from "./availability";
import dashboardRouter from "./dashboard";
import whatsappRouter from "./whatsapp";
import scheduleRouter from "./schedule";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/barbers", barbersRouter);
router.use("/services", servicesRouter);
router.use("/appointments", appointmentsRouter);
router.use("/availability", availabilityRouter);
router.use("/dashboard", dashboardRouter);
router.use("/whatsapp", whatsappRouter);
router.use("/schedule", scheduleRouter);
router.use("/auth", authRouter);

export default router;
