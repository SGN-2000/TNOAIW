"use client";

import { useState } from "react";
import { ref, update, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Permissions, Manager } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PermissionsManagerProps {
  centerId: string;
  permissions: Permissions;
  potentialManagers: Manager[];
  onSave: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || '?';
};

export default function PermissionsManager({ centerId, permissions, potentialManagers, onSave }: PermissionsManagerProps) {
  const [adminsPlusAllowed, setAdminsPlusAllowed] = useState(permissions.adminsPlusAllowed);
  const [selectedManagers, setSelectedManagers] = useState<string[]>(Object.keys(permissions.managers || {}));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleManagerSelection = (managerId: string, checked: boolean) => {
    setSelectedManagers(prev =>
      checked ? [...prev, managerId] : prev.filter(id => id !== managerId)
    );
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    const previousManagers = new Set(Object.keys(permissions.managers || {}));
    const newManagerIds = selectedManagers.filter(id => !previousManagers.has(id));

    const updates: { [key: string]: any } = {};
    updates[`/centers/${centerId}/competition/permissions/adminsPlusAllowed`] = adminsPlusAllowed;
    
    const managersObject = selectedManagers.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as { [key: string]: true });

    updates[`/centers/${centerId}/competition/permissions/managers`] = managersObject;

    try {
      await update(ref(db), updates);

      // Send notifications to new managers
      const notificationPromises = newManagerIds.map(managerId => {
        const notifRef = push(ref(db, `notifications/${managerId}`));
        return set(notifRef, {
            type: 'NEW_PERMISSION',
            permissionType: 'COMPETITION_MANAGER',
            centerId: centerId,
            timestamp: new Date().toISOString(),
            read: false,
        });
      });
      await Promise.all(notificationPromises);

      toast({ title: "Permisos actualizados", description: "Se han guardado los nuevos gestores de competencia." });
      onSave();
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
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
          <div className="space-y-0.5">
            <Label>Permitir Admins Plus</Label>
            <p className="text-xs text-muted-foreground">
              ¿Pueden los Administradores Plus ser gestores?
            </p>
          </div>
          <Switch
            checked={adminsPlusAllowed}
            onCheckedChange={(checked) => {
              setAdminsPlusAllowed(checked)
              if (!checked) {
                const adminIdsToKeep = potentialManagers.filter(m => m.role === 'admin' && selectedManagers.includes(m.id)).map(m => m.id);
                setSelectedManagers(adminIdsToKeep);
              }
            }}
            disabled={isSaving}
          />
        </div>

        <Tabs defaultValue="admins" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admins">Administradores</TabsTrigger>
                <TabsTrigger value="admins-plus" disabled={!adminsPlusAllowed}>Admins Plus</TabsTrigger>
            </TabsList>
            <TabsContent value="admins">
                <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">
                        {renderManagerList('admin')}
                    </div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="admins-plus">
                 <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">
                        {adminsPlusAllowed ? renderManagerList('admin-plus') : <p className="text-sm text-muted-foreground p-4 text-center">Habilita "Permitir Admins Plus" para ver la lista.</p>}
                    </div>
                </ScrollArea>
            </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
    </div>
  );
}
