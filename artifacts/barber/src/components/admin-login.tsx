import { useState } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock } from "lucide-react";

export function AdminLogin() {
  const { login } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

          <Button type="submit" className="w-full font-bold" disabled={loading || !password}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
