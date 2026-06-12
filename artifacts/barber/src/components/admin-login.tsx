import { useState } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function AdminLogin() {
  const { login, loginBiometric } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const ok = await login(password);
    if (!ok) {
      setError("Contraseña incorrecta");
      setPassword("");
    }
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError("");
    try {
      // 1. Get options from server
      const resp = await fetch(`${API_BASE}/api/auth/generate-authentication-options`);
      if (!resp.ok) {
        if (resp.status === 404) {
          throw new Error("No hay dispositivos registrados en esta cuenta.");
        }
        throw new Error("No se pudo iniciar el reconocimiento facial");
      }
      const options = await resp.json();

      // 2. Start WebAuthn authentication
      let asseResp;
      try {
        asseResp = await startAuthentication(options);
      } catch (error: any) {
        throw new Error("Autenticación cancelada o fallida");
      }

      // 3. Send response to server
      const verificationResp = await fetch(`${API_BASE}/api/auth/verify-authentication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asseResp),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON && verificationJSON.ok) {
        // Success
        await loginBiometric(); // Bypass password
      } else {
        throw new Error(verificationJSON.error || "No se pudo verificar el acceso");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al autenticar");
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-4">
          <img src="/logo-mt.svg" alt="Barber M.T" className="h-16 w-16" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-primary uppercase tracking-widest">Barber M.T</h1>
            <p className="text-muted-foreground text-sm mt-1">Panel de administración</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-5"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              autoFocus
              className="bg-background"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full font-bold" disabled={loading || biometricLoading || !password}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar con Contraseña"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O más rápido</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full font-bold border-primary text-primary hover:bg-primary/10"
            onClick={handleBiometricLogin}
            disabled={loading || biometricLoading}
          >
            {biometricLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
            Entrar con Face ID / Huella
          </Button>
        </form>
      </div>
    </div>
  );
}
