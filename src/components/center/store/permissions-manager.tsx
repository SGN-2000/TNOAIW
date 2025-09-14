
"use client";

import { useState } from "react";
import { ref, update, push, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Manager } from "./types";

interface PermissionsManagerProps {
  centerId: string;
  currentManagers: { [userId: string]: true };
  potentialManagers: Manager[];
}

const getInitials = (name: string) => {
    const names = name.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name[0]?.toUpperCase() || '?';
};

export default function PermissionsManager({ centerId, currentManagers, potentialManagers }: PermissionsManagerProps) {
  const [selectedManagers, setSelectedManagers] = useState<string[]>(Object.keys(currentManagers || {}));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleManagerSelection = (managerId: string, checked: boolean) => {
    setSelectedManagers(prev =>
      checked ? [...prev, managerId] : prev.filter(id => id !== managerId)
    );
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    const previousManagerIds = new Set(Object.keys(currentManagers || {}));
    const newManagerIds = selectedManagers.filter(id => !previousManagerIds.has(id));

    const managersObject = selectedManagers.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as { [key: string]: true });

    try {
      await update(ref(db, `centers/${centerId}/store/settings`), { managers: managersObject });
      
      const centerNameSnapshot = await get(ref(db, `centers/${centerId}/centerName`));
      const centerName = centerNameSnapshot.val();
      
      const notificationPromises = newManagerIds.map(managerId => {
        const notifRef = push(ref(db, `notifications/${managerId}`));
        return set(notifRef, {
            type: 'NEW_PERMISSION',
            centerId: centerId,
            centerName: centerName,
            permissionType: 'STORE_MANAGER',
            timestamp: new Date().toISOString(),
            read: false,
        });
      });
      await Promise.all(notificationPromises);

      toast({ title: "Gestores actualizados", description: "Se han guardado los nuevos gestores de la tienda." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const renderManagerList = (role: 'admin' | 'admin-plus') => {
    const managersInRole = potentialManagers.filter(m => m.role === role);
    if(managersInRole.length === 0) return <p className="text-sm text-muted-foreground p-4 text-center">No hay {role === 'admin' ? 'administradores' : 'administradores plus'} en el centro.</p>;
    
    return managersInRole.map(manager => (
      <div key={manager.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
        <Checkbox
          id={`manager-${manager.id}`}
          checked={selectedManagers.includes(manager.id)}
          onCheckedChange={(checked) => handleManagerSelection(manager.id, !!checked)}
          disabled={isSaving}
        />
        <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(manager.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <label htmlFor={`manager-${manager.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {manager.name}
            </label>
            <p className="text-xs text-muted-foreground">@{manager.username}</p>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6 pt-4">
        <Tabs defaultValue="admins" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admins">Administradores</TabsTrigger>
                <TabsTrigger value="admins-plus">Admins Plus</TabsTrigger>
            </TabsList>
            <TabsContent value="admins">
                <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">{renderManagerList('admin')}</div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="admins-plus">
                 <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">{renderManagerList('admin-plus')}</div>
                </ScrollArea>
            </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
    </div>
  );
}
