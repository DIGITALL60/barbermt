import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, MessageSquare, Power, Settings } from "lucide-react";

// The app might use a different way to access API_BASE, I will infer it from window.location or proxy
const API_BASE = import.meta.env.VITE_API_URL || "";

export default function BotAdminPage() {
  const queryClient = useQueryClient();
  
  // Fetch Bot Status periodically
  const { data: botStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["bot-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/bot-settings/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Fetch Settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["bot-settings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/bot-settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // State for form
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [cancellationMessage, setCancellationMessage] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Sync state when settings load
  useEffect(() => {
    if (settings) {
      setWelcomeMessage(settings.welcomeMessage || "");
      setConfirmationMessage(settings.confirmationMessage || "");
      setCancellationMessage(settings.cancellationMessage || "");
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
    }
  }, [settings]);

  // Update Settings Mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const res = await fetch(`${API_BASE}/api/bot-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Configuración guardada correctamente");
      queryClient.invalidateQueries({ queryKey: ["bot-settings"] });
    },
    onError: (err) => {
      toast.error(`Error al guardar: ${err.message}`);
    },
  });

  // Disconnect Mutation
  const disconnectBot = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/bot-settings/disconnect`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Bot desconectado. Esperando nuevo QR...");
      queryClient.invalidateQueries({ queryKey: ["bot-status"] });
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const handleSaveSettings = () => {
    updateSettings.mutate({
      welcomeMessage,
      confirmationMessage,
      cancellationMessage,
      notificationsEnabled,
    });
  };

  const isConnected = botStatus?.status === "conectado";
  const isWaitingQR = botStatus?.status === "esperando_qr";
  const qrCode = botStatus?.qr;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">WhatsApp Bot</h2>
        <p className="text-muted-foreground">
          Administra la conexión y los mensajes automáticos de tu asistente virtual.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Estado de Conexión
            </CardTitle>
            <CardDescription>Conecta tu número de WhatsApp escaneando el código QR</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            {statusLoading ? (
              <div className="flex flex-col items-center space-y-2 py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p>Comprobando estado...</p>
              </div>
            ) : isConnected ? (
              <div className="flex flex-col items-center space-y-4 py-6">
                <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <MessageSquare className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-medium text-green-600">Bot Conectado</h3>
                <p className="text-center text-muted-foreground">
                  El asistente está en línea y respondiendo mensajes.
                </p>
              </div>
            ) : isWaitingQR && qrCode ? (
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <QRCodeSVG value={qrCode} size={200} />
                </div>
                <p className="text-center font-medium animate-pulse">
                  Escanea el QR con tu WhatsApp para conectar
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 py-8">
                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Power className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-medium text-slate-500">Bot Desconectado</h3>
                <p className="text-center text-muted-foreground">
                  El servidor del bot no está respondiendo o se está reiniciando.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-4">
            <div className="text-sm text-muted-foreground">
              {botStatus?.status ? `Estado: ${botStatus.status}` : "Sin conexión"}
            </div>
            {isConnected && (
              <Button variant="destructive" size="sm" onClick={() => disconnectBot.mutate()} disabled={disconnectBot.isPending}>
                {disconnectBot.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Desconectar"}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Configuration Card */}
        <Card className="md:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Mensajes
            </CardTitle>
            <CardDescription>Personaliza cómo responde el bot a tus clientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="notifications" className="flex flex-col space-y-1">
                <span>Notificaciones Activas</span>
                <span className="font-normal text-muted-foreground text-sm">
                  Permitir que el bot envíe mensajes de confirmación automáticamente.
                </span>
              </Label>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
              <Textarea
                id="welcomeMessage"
                rows={5}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="¡Bienvenido a Barber M.T!..."
              />
              <p className="text-xs text-muted-foreground">
                Se enviará cuando un usuario escriba "HOLA". Los servicios se adjuntarán automáticamente al final.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmationMessage">Mensaje de Confirmación</Label>
              <Textarea
                id="confirmationMessage"
                rows={5}
                value={confirmationMessage}
                onChange={(e) => setConfirmationMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles: <code>{`{cliente}`}</code>, <code>{`{fecha}`}</code>, <code>{`{hora}`}</code>, <code>{`{servicio}`}</code>, <code>{`{barbero}`}</code>, <code>{`{precio}`}</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellationMessage">Mensaje de Cancelación</Label>
              <Textarea
                id="cancellationMessage"
                rows={3}
                value={cancellationMessage}
                onChange={(e) => setCancellationMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles: <code>{`{fecha}`}</code>, <code>{`{hora}`}</code>
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4">
            <Button className="w-full" onClick={handleSaveSettings} disabled={updateSettings.isPending || settingsLoading}>
              {updateSettings.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Configuración"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
