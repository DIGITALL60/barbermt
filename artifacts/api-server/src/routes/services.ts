import { Router } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListServicesQueryParams,
  CreateServiceBody,
  UpdateServiceBody,
  UpdateServiceParams,
  DeleteServiceParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListServicesQueryParams.safeParse(req.query);
  const activeOnly = query.success ? query.data.activeOnly : undefined;

  const services = await db.select().from(servicesTable).orderBy(servicesTable.name);
  const filtered = activeOnly === true ? services.filter((s) => s.active) : services;

  res.json(
    filtered.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
      active: s.active,
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const { name, description, price, durationMinutes } = parsed.data;
  const [service] = await db
    .insert(servicesTable)
    .values({ name, description, price, durationMinutes })
    .returning();
  res.status(201).json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price;
  if (parsed.data.durationMinutes !== undefined) updates.durationMinutes = parsed.data.durationMinutes;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const [service] = await db
    .update(servicesTable)
    .set(updates)
    .where(eq(servicesTable.id, params.data.id))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Servicio no encontrado" });
    return;
  }
  res.json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id));
  res.status(204).send();
});

export default router;
