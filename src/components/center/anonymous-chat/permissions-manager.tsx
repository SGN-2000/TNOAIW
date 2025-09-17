"use client"

import { useEffect, useState } from "react";
import { ref, update, push, set, get, onValue, off, child } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Moderator } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PermissionsManagerProps {
  centerId: string;
  potentialModerators: Moderator[];
  onSave: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name[0]?.toUpperCase() || '?';
};

export default function PermissionsManager({ centerId, potentialModerators, onSave }: PermissionsManagerProps) {
  const [selectedModerators, setSelectedModerators] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const permsRef = ref(db, `centers/${centerId}/anonymousChats/permissions/moderators`);
    const listener = onValue(permsRef, (snapshot) => {
      setSelectedModerators(snapshot.exists() ? Object.keys(snapshot.val()) : []);
    });
    return () => off(permsRef, 'value', listener);
  }, [centerId]);

  const handleModeratorSelection = (moderatorId: string, checked: boolean) => {
    setSelectedModerators(prev =>
      checked ? [...prev, moderatorId] : prev.filter(id => id !== moderatorId)
    );
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    const permsRef = ref(db, `centers/${centerId}/anonymousChats/permissions`);
    const currentModsSnapshot = await get(child(permsRef, 'moderators'));
    const previousModIds = new Set(currentModsSnapshot.exists() ? Object.keys(currentModsSnapshot.val()) : []);
    
    const newModIds = new Set(selectedModerators);

    const newlyAssigned = selectedModerators.filter(id => !previousModIds.has(id));
    const newlyRemoved = [...previousModIds].filter(id => !newModIds.has(id));

    const moderatorsObject = selectedModerators.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as { [key: string]: true });

    try {
      await update(permsRef, { moderators: moderatorsObject });

      const centerNameSnapshot = await get(ref(db, `centers/${centerId}/centerName`));
      const centerName = centerNameSnapshot.val();
      
      const notificationPromises = [
        ...newlyAssigned.map(id => set(push(ref(db, `notifications/${id}`)), {
            type: 'NEW_PERMISSION', centerId, centerName, permissionType: 'ANONYMOUS_CHAT_MODERATOR', timestamp: new Date().toISOString(), read: false
        })),
        ...newlyRemoved.map(id => set(push(ref(db, `notifications/${id}`)), {
            type: 'REMOVED_PERMISSION', centerId, centerName, permissionType: 'ANONYMOUS_CHAT_MODERATOR', timestamp: new Date().toISOString(), read: false
        })),
      ];
      await Promise.all(notificationPromises);

      toast({ title: "Moderadores actualizados", description: "Se han guardado los nuevos moderadores." });
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
                {potentialModerators.map(moderator => (
                    <div key={moderator.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                        <Checkbox
                        id={`moderator-${moderator.id}`}
                        checked={selectedModerators.includes(moderator.id)}
                        onCheckedChange={(checked) => handleModeratorSelection(moderator.id, !!checked)}
                        disabled={isSaving}
                        />
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(moderator.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <label htmlFor={`moderator-${moderator.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {moderator.name}
                            </label>
                            <p className="text-xs text-muted-foreground">@{moderator.username}</p>
                        </div>
                    </div>
                ))}
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
