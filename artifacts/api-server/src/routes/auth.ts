import { Router } from "express";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db, passkeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "barber123";

// WebAuthn Config
const rpName = "Barber M.T";

// rpID must be the effective domain of the app (no protocol, no port).
// Set RP_ID env var explicitly, e.g. "barbermt.barber.vercel.app".
// Falls back to extracting hostname from FRONTEND_URL, then to "localhost".
const rpID = process.env.RP_ID ||
  (process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : "localhost");

// Accepted origins: always include localhost for dev, plus the production URL if set.
const allowedOrigins: string[] = ["http://localhost:5173", "http://localhost:3000"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

// Temporary in-memory store for challenges
// In a production multi-server setup this should go to Redis or DB
const currentChallenges = new Map<string, string>();

router.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Contraseña incorrecta" });
    return;
  }
  res.json({ ok: true });
});

/**
 * 1. Generate Registration Options
 * Called when the admin wants to register their current device (Face ID / Touch ID)
 */
router.get("/generate-registration-options", async (req, res) => {
  try {
    // We only have one "admin" user
    const userPasskeys = await db.select().from(passkeysTable).where(eq(passkeysTable.userId, "admin"));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from("admin")),
      userName: "Administrador",
      userDisplayName: "Administrador",
      // Prevent registering the same device twice
      excludeCredentials: userPasskeys.map(key => ({
        id: key.credentialId,
        type: "public-key"
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform" // Ensures it's using FaceID/TouchID on the device itself
      }
    });

    // We store the challenge using the userID as key (since there's only one user registering at a time)
    currentChallenges.set("admin_reg", options.challenge);

    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Verify Registration
 * Called after the browser creates the credential
 */
router.post("/verify-registration", async (req, res) => {
  try {
    const { body } = req;
    const expectedChallenge = currentChallenges.get("admin_reg");

    if (!expectedChallenge) {
      return res.status(400).json({ error: "Challenge expirado o inválido" });
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType } = verification.registrationInfo;
      
      const transports = body.response.transports || [];

      // Save the passkey to the DB
      await db.insert(passkeysTable).values({
        userId: "admin",
        credentialId: credentialID,
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: JSON.stringify(transports),
        name: `${credentialDeviceType} Registrado`,
      });

      currentChallenges.delete("admin_reg");
      return res.json({ ok: true });
    }

    res.status(400).json({ error: "No se pudo verificar el dispositivo" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Generate Authentication Options
 * Called when the admin clicks "Login with Face ID"
 */
router.get("/generate-authentication-options", async (req, res) => {
  try {
    const userPasskeys = await db.select().from(passkeysTable).where(eq(passkeysTable.userId, "admin"));
    
    if (userPasskeys.length === 0) {
      return res.status(404).json({ error: "No hay dispositivos registrados" });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map(key => ({
        id: key.credentialId,
        type: "public-key",
        transports: JSON.parse(key.transports)
      })),
      userVerification: "preferred",
    });

    currentChallenges.set("admin_auth", options.challenge);
    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. Verify Authentication
 * Called after the browser authenticates the credential
 */
router.post("/verify-authentication", async (req, res) => {
  try {
    const { body } = req;
    const expectedChallenge = currentChallenges.get("admin_auth");

    if (!expectedChallenge) {
      return res.status(400).json({ error: "Challenge expirado o inválido" });
    }

    // Find the passkey in the DB
    const passkeys = await db.select().from(passkeysTable).where(eq(passkeysTable.credentialId, body.id));
    const passkey = passkeys[0];

    if (!passkey) {
      return res.status(404).json({ error: "Credencial no encontrada en la base de datos" });
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpID,
      authenticator: {
        credentialID: passkey.credentialId,
        credentialPublicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64')),
        counter: passkey.counter,
        transports: JSON.parse(passkey.transports),
      }
    });

    if (verification.verified && verification.authenticationInfo) {
      // Update counter
      await db.update(passkeysTable)
        .set({ 
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date()
        })
        .where(eq(passkeysTable.id, passkey.id));

      currentChallenges.delete("admin_auth");
      
      // Since we just have a simple token-less system right now where login returns ok:true
      return res.json({ ok: true });
    }

    res.status(400).json({ error: "Verificación biométrica fallida" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
