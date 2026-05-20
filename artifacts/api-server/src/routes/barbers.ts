import { Router } from "express";
import { db, barbersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListBarbersQueryParams,
  CreateBarberBody,
  UpdateBarberBody,
  UpdateBarberParams,
  DeleteBarberParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListBarbersQueryParams.safeParse(req.query);
  const activeOnly = query.success ? query.data.activeOnly : undefined;

  const barbers = await db.select().from(barbersTable).orderBy(barbersTable.name);
  const filtered = activeOnly === true ? barbers.filter((b) => b.active) : barbers;

  res.json(
    filtered.map((b) => ({
      id: b.id,
      name: b.name,
      bio: b.bio,
      photoUrl: b.photoUrl,
      active: b.active,
      createdAt: b.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = CreateBarberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const { name, bio, photoUrl } = parsed.data;
  const [barber] = await db
    .insert(barbersTable)
    .values({ name, bio, photoUrl })
    .returning();
  res.status(201).json({
    id: barber.id,
    name: barber.name,
    bio: barber.bio,
    photoUrl: barber.photoUrl,
    active: barber.active,
    createdAt: barber.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const params = UpdateBarberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const parsed = UpdateBarberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.photoUrl !== undefined) updates.photoUrl = parsed.data.photoUrl;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const [barber] = await db
    .update(barbersTable)
    .set(updates)
    .where(eq(barbersTable.id, params.data.id))
    .returning();

  if (!barber) {
    res.status(404).json({ error: "Barbero no encontrado" });
    return;
  }
  res.json({
    id: barber.id,
    name: barber.name,
    bio: barber.bio,
    photoUrl: barber.photoUrl,
    active: barber.active,
    createdAt: barber.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const params = DeleteBarberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(barbersTable).where(eq(barbersTable.id, params.data.id));
  res.status(204).send();
});

export default router;
