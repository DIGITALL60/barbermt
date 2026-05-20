import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useListBarbers,
  useCreateBarber,
  useUpdateBarber,
  useDeleteBarber,
  getListBarbersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Scissors, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type BarberForm = { id?: number, name: string, bio: string, photoUrl: string, active: boolean };

export default function BarbersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: barbers, isLoading } = useListBarbers();
  const createBarber = useCreateBarber();
  const updateBarber = useUpdateBarber();
  const deleteBarber = useDeleteBarber();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<BarberForm>({ name: "", bio: "", photoUrl: "", active: true });

  const handleOpenDialog = (barber?: BarberForm) => {
    setFormData(barber ?? { name: "", bio: "", photoUrl: "", active: true });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name,
      bio: formData.bio || undefined,
      photoUrl: formData.photoUrl || undefined,
    };

    if (formData.id) {
      updateBarber.mutate({ id: formData.id, data: { ...payload, active: formData.active } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
          setIsOpen(false);
          toast({ title: "Barbero actualizado" });
        }
      });
    } else {
      createBarber.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
          setIsOpen(false);
          toast({ title: "Barbero creado" });
        }
      });
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateBarber.mutate({ id, data: { active } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
        toast({ title: active ? "Barbero activado" : "Barbero desactivado" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Confirmás que querés eliminar este barbero?")) {
      deleteBarber.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
          toast({ title: "Barbero eliminado" });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Barberos</h1>
            <p className="text-muted-foreground mt-1">Gestioná tu equipo</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> Agregar barbero
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {barbers?.map(barber => (
              <Card key={barber.id} className={barber.active ? "" : "opacity-60 grayscale-[0.4]"}>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border">
                    {barber.photoUrl ? (
                      <img src={barber.photoUrl} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{barber.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Desde {format(new Date(barber.createdAt), "MMMM yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {barber.bio || "Sin descripción."}
                  </p>

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={barber.active}
                        onCheckedChange={(c) => handleToggleActive(barber.id, c)}
                        disabled={updateBarber.isPending}
                      />
                      <Label className="text-xs text-muted-foreground">Activo</Label>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog({
                        id: barber.id,
                        name: barber.name,
                        bio: barber.bio || "",
                        photoUrl: barber.photoUrl || "",
                        active: barber.active
                      })}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(barber.id)} className="hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!barbers?.length && (
              <div className="col-span-full py-14 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <Scissors className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No hay barberos. Agregá el primero.</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? "Editar barbero" : "Agregar barbero"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="10 años de experiencia especializado en..."
                  className="resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>URL de foto (opcional)</Label>
                <Input
                  value={formData.photoUrl}
                  onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createBarber.isPending || updateBarber.isPending}>
                {(createBarber.isPending || updateBarber.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
