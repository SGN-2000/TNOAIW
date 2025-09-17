"use client";

import { useEffect, useState } from "react";
import { ref, update, push, set, get, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Manager } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PermissionsManagerProps {
  centerId: string;
  potentialManagers: Manager[];
  onSave: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name[0]?.toUpperCase() || '?';
};

export default function PermissionsManager({ centerId, potentialManagers, onSave }: PermissionsManagerProps) {
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const permsRef = ref(db, `centers/${centerId}/workshops/permissions/managers`);
    const listener = onValue(permsRef, (snapshot) => {
      setSelectedManagers(snapshot.exists() ? Object.keys(snapshot.val()) : []);
    });
    return () => off(permsRef, 'value', listener);
  }, [centerId]);

  const handleManagerSelection = (managerId: string, checked: boolean) => {
    setSelectedManagers(prev =>
      checked ? [...prev, managerId] : prev.filter(id => id !== managerId)
    );
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const managersObject = selectedManagers.reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {} as { [key: string]: true });
      await update(ref(db, `centers/${centerId}/workshops/permissions`), { managers: managersObject });
      
      toast({ title: "Permisos actualizados", description: "Se han guardado los nuevos gestores de talleres." });
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
            <Button variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
    </div>
  );
}
