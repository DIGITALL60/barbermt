import { Router } from "express";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "barber123";

router.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Contraseña incorrecta" });
    return;
  }
  res.json({ ok: true });
});

export default router;
