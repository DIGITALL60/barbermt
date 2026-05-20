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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ServiceForm = { id?: number, name: string, description: string, price: string, durationMinutes: string, active: boolean };

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: services, isLoading } = useListServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceForm>({ name: "", description: "", price: "0", durationMinutes: "30", active: true });

  const handleOpenDialog = (service?: ServiceForm) => {
    if (service) {
      setFormData(service);
    } else {
      setFormData({ name: "", description: "", price: "", durationMinutes: "30", active: true });
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.price || !formData.durationMinutes) {
      toast({ title: "Name, price, and duration are required", variant: "destructive" });
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
          toast({ title: "Service updated" });
        }
      });
    } else {
      createService.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsOpen(false);
          toast({ title: "Service created" });
        }
      });
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateService.mutate({ id, data: { active } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: active ? "Service activated" : "Service deactivated" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteService.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          toast({ title: "Service deleted" });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-muted-foreground mt-2">Manage what you offer</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services?.map(service => (
              <Card key={service.id} className={service.active ? "" : "opacity-60 grayscale-[0.5]"}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold">{service.name}</CardTitle>
                    <div className="text-xl font-bold text-primary">${service.price}</div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {service.durationMinutes} mins
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground min-h-[2.5rem] mt-2">
                    {service.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={service.active} 
                        onCheckedChange={(c) => handleToggleActive(service.id, c)}
                        disabled={updateService.isPending}
                      />
                      <Label className="text-xs text-muted-foreground">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog({
                        id: service.id,
                        name: service.name,
                        description: service.description || "",
                        price: service.price.toString(),
                        durationMinutes: service.durationMinutes.toString(),
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
            
            {!services?.length && (
              <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                No services found. Add your first service!
              </div>
            )}
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Haircut & Beard"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input 
                    type="number"
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (mins)</Label>
                  <Input 
                    type="number"
                    step="5"
                    value={formData.durationMinutes} 
                    onChange={e => setFormData({...formData, durationMinutes: e.target.value})} 
                    placeholder="45"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Full service including..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
