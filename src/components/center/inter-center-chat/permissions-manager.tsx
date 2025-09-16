"use client"

import { useEffect, useState } from "react";
import { ref, update, push, set, get, onValue, off, child } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Member } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PermissionsManagerProps {
  centerId: string;
  potentialMembers: Member[];
  onSave: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name[0]?.toUpperCase() || '?';
};

export default function PermissionsManager({ centerId, potentialMembers, onSave }: PermissionsManagerProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const permsRef = ref(db, `centers/${centerId}/interCenterChat/permissions/exchangeGroup`);
    const listener = onValue(permsRef, (snapshot) => {
      setSelectedMembers(snapshot.exists() ? Object.keys(snapshot.val()) : []);
    });
    return () => off(permsRef, 'value', listener);
  }, [centerId]);

  const handleMemberSelection = (memberId: string, checked: boolean) => {
    setSelectedMembers(prev =>
      checked ? [...prev, memberId] : prev.filter(id => id !== memberId)
    );
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    const permsRef = ref(db, `centers/${centerId}/interCenterChat/permissions`);
    const currentMembersSnapshot = await get(child(permsRef, 'exchangeGroup'));
    const previousMemberIds = new Set(currentMembersSnapshot.exists() ? Object.keys(currentMembersSnapshot.val()) : []);
    
    const newMemberIds = new Set(selectedMembers);

    const newlyAssigned = selectedMembers.filter(id => !previousMemberIds.has(id));
    const newlyRemoved = [...previousMemberIds].filter(id => !newMemberIds.has(id));

    const exchangeGroupObject = selectedMembers.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as { [key: string]: true });

    try {
      await update(permsRef, { exchangeGroup: exchangeGroupObject });

      const centerNameSnapshot = await get(ref(db, `centers/${centerId}/centerName`));
      const centerName = centerNameSnapshot.val();
      
      const notificationPromises = [
        ...newlyAssigned.map(id => set(push(ref(db, `notifications/${id}`)), {
            type: 'NEW_PERMISSION', centerId, centerName, permissionType: 'INTER_CENTER_CHAT', timestamp: new Date().toISOString(), read: false
        })),
        ...newlyRemoved.map(id => set(push(ref(db, `notifications/${id}`)), {
            type: 'REMOVED_PERMISSION', centerId, centerName, permissionType: 'INTER_CENTER_CHAT', timestamp: new Date().toISOString(), read: false
        })),
      ];
      await Promise.all(notificationPromises);

      toast({ title: "Grupo Intercambio actualizado", description: "Se han guardado los nuevos miembros." });
      onSave();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
        <ScrollArea className="h-72 border rounded-md">
            <div className="p-2 space-y-1">
                {potentialMembers.length > 0 ? potentialMembers.map(member => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                        <Checkbox
                        id={`member-${member.id}`}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={(checked) => handleMemberSelection(member.id, !!checked)}
                        disabled={isSaving}
                        />
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <label htmlFor={`member-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {member.name}
                            </label>
                            <p className="text-xs text-muted-foreground">@{member.username}</p>
                        </div>
                    </div>
                )) : <p className="p-4 text-sm text-center text-muted-foreground">No hay administradores para designar.</p>}
            </div>
        </ScrollArea>

        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
    </div>
  );
}
