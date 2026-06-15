import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function SecurityAdminPage() {
  const [loading, setLoading] = useState(false);

  const registerDevice = async () => {
    setLoading(true);
    try {
      // 1. Get options from server
      const resp = await fetch(`${API_BASE}/api/auth/generate-registration-options`);
      if (!resp.ok) {
        throw new Error("No se pudo iniciar el registro");
      }
      const options = await resp.json();

      // 2. Start WebAuthn registration (v13+ API requires { optionsJSON })
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (error: any) {
        if (error.name === 'InvalidStateError') {
          throw new Error("Este dispositivo ya está registrado.");
        }
        throw new Error(`Error biométrico: ${error.message}`);
      }

      // 3. Send registration response to server
      const verificationResp = await fetch(`${API_BASE}/api/auth/verify-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attResp),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON && verificationJSON.ok) {
        toast.success("¡Dispositivo registrado con éxito!");
      } else {
        throw new Error(verificationJSON.error || "No se pudo verificar el registro");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al registrar el dispositivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Seguridad</h2>
        <p className="text-muted-foreground">
          Configura métodos de acceso rápidos y seguros para el panel.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Reconocimiento Facial o Huella
            </CardTitle>
            <CardDescription>
              Inicia sesión rápidamente usando la seguridad nativa de tu dispositivo (Face ID, Touch ID, Windows Hello).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <p className="text-center text-sm text-muted-foreground max-w-sm">
              Al registrar este dispositivo, podrás ingresar al panel de administración sin necesidad de escribir la contraseña. Solo deberás escanear tu rostro o poner tu huella.
            </p>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4">
            <Button className="w-full" onClick={registerDevice} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar este dispositivo"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
