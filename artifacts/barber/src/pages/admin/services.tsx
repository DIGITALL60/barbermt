import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock, Scissors, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Normaliza cualquier respuesta de la API a un array
function toArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const obj = data as Record<string, unknown>;
  for (const key of ["data", "items", "services", "results"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

type ServiceForm = { id?: number, name: string, description: string, price: string, durationMinutes: string, active: boolean };

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: servicesRaw, isLoading } = useListServices();
  const services = toArray<any>(servicesRaw);

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceForm>({ name: "", description: "", price: "", durationMinutes: "30", active: true });

  const handleOpenDialog = (service?: ServiceForm) => {
    setFormData(service ?? { name: "", description: "", price: "", durationMinutes: "30", active: true });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.price || !formData.durationMinutes) {
      toast({ title: "Nombre, precio y duración son obligatorios", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      price: Number(formData.price),
      durationMinutes: Number(formData.durationMinutes),
    };

    if (formData.id) {
      updateService.mutate({ id: formData.id, data: { ...payload, active: formData.active } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsOpen(false);
          toast({ title: "Servicio actualizado" });
        }
      });
    } else {
      createService.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsOpen(false);
          toast({ title: "Servicio creado" });
        }
      });
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateService.mutate({ id, data: { active } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: active ? "Servicio activado" : "Servicio desactivado" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Confirmás que querés eliminar este servicio?")) {
      deleteService.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          toast({ title: "Servicio eliminado" });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Servicios</h1>
            <p className="text-muted-foreground mt-1">Gestioná tu menú de servicios</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> Agregar servicio
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(service => (
              <Card key={service.id} className={service.active ? "" : "opacity-60 grayscale-[0.4]"}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-bold leading-tight">{service.name}</CardTitle>
                    <div className="text-xl font-black text-primary shrink-0">
                      ${Number(service.price ?? 0).toLocaleString("es-AR")}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1 gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {service.durationMinutes} min
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground min-h-[2.5rem]">
                    {service.description || "Sin descripción."}
                  </p>

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.active}
                        onCheckedChange={(c) => handleToggleActive(service.id, c)}
                        disabled={updateService.isPending}
                      />
                      <Label className="text-xs text-muted-foreground">Activo</Label>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog({
                        id: service.id,
                        name: service.name,
                        description: service.description || "",
                        price: String(service.price ?? ""),
                        durationMinutes: String(service.durationMinutes ?? "30"),
                        active: service.active
                      })}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)} className="hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!services.length && (
              <div className="col-span-full py-14 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <Scissors className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No hay servicios. Agregá el primero.</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? "Editar servicio" : "Agregar servicio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Corte + barba"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio ($)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="4500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración (min)</Label>
                  <Input
                    type="number"
                    step="5"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Incluye..."
                  className="resize-none"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
                {(createService.isPending || updateService.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
