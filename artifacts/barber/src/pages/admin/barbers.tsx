import { useState, useRef, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Scissors, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    if (barber) {
      setFormData(barber);
    } else {
      setFormData({ name: "", bio: "", photoUrl: "", active: true });
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({ title: "Name is required", variant: "destructive" });
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
          toast({ title: "Barber updated" });
        }
      });
    } else {
      createBarber.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
          setIsOpen(false);
          toast({ title: "Barber created" });
        }
      });
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateBarber.mutate({ id, data: { active } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
        toast({ title: active ? "Barber activated" : "Barber deactivated" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this barber?")) {
      deleteBarber.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
          toast({ title: "Barber deleted" });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Barbers</h1>
            <p className="text-muted-foreground mt-2">Manage your team</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> Add Barber
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {barbers?.map(barber => (
              <Card key={barber.id} className={barber.active ? "" : "opacity-60 grayscale-[0.5]"}>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {barber.photoUrl ? (
                      <img src={barber.photoUrl} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{barber.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Joined {new Date(barber.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {barber.bio || "No bio provided."}
                  </p>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={barber.active} 
                        onCheckedChange={(c) => handleToggleActive(barber.id, c)}
                        disabled={updateBarber.isPending}
                      />
                      <Label className="text-xs text-muted-foreground">Active</Label>
                    </div>
                    <div className="flex gap-2">
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
              <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                No barbers found. Add your first team member!
              </div>
            )}
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? "Edit Barber" : "Add Barber"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea 
                  value={formData.bio} 
                  onChange={e => setFormData({...formData, bio: e.target.value})} 
                  placeholder="Experienced barber specialized in..."
                />
              </div>
              <div className="space-y-2">
                <Label>Photo URL</Label>
                <Input 
                  value={formData.photoUrl} 
                  onChange={e => setFormData({...formData, photoUrl: e.target.value})} 
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createBarber.isPending || updateBarber.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
