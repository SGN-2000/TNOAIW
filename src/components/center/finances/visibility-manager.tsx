
"use client";

import { useState } from "react";
import { ref, update, get, child, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

interface VisibilityManagerProps {
  centerId: string;
  currentVisibility: boolean;
  onSave: () => void;
}

export default function VisibilityManager({ centerId, currentVisibility, onSave }: VisibilityManagerProps) {
  const [visibility, setVisibility] = useState(currentVisibility ? 'public' : 'private');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if ((visibility === 'public') === currentVisibility) {
        onSave();
        return;
    }
    
    setIsSaving(true);
    const newPublicVisibility = visibility === 'public';

    try {
      // Update visibility setting
      await update(ref(db, `centers/${centerId}/finances/permissions`), { publicVisibility: newPublicVisibility });

      // If visibility is made public, notify all members
      if (newPublicVisibility) {
        const centerSnap = await get(child(ref(db), `centers/${centerId}`));
        const centerData = centerSnap.val();
        const allMemberIds = [
          centerData.ownerId,
          ...Object.keys(centerData.members.admins || {}),
          ...Object.keys(centerData.members.adminsPlus || {}),
          ...Object.keys(centerData.members.students || {}),
        ];
        const uniqueMemberIds = [...new Set(allMemberIds)];

        const notificationPromises = uniqueMemberIds.map(memberId => {
          const notifRef = push(ref(db, `notifications/${memberId}`));
          return set(notifRef, {
              type: 'FINANCE_VISIBILITY_CHANGED',
              centerId: centerId,
              centerName: centerData.centerName,
              newVisibility: 'Pública',
              timestamp: new Date().toISOString(),
              read: false,
          });
        });
        await Promise.all(notificationPromises);
      }

      toast({ title: "Visibilidad actualizada", description: `Las finanzas ahora son ${newPublicVisibility ? 'públicas' : 'privadas'}.` });
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
        <p className="text-sm text-muted-foreground">
            Elige si los detalles financieros son visibles para todos los miembros del centro o solo para el propietario y los gestores designados.
        </p>
        <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as 'public' | 'private')}>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public">Pública (Todos los miembros pueden ver)</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">Privada (Solo propietario y gestores)</Label>
            </div>
        </RadioGroup>

        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
            </Button>
        </div>
    </div>
  );
}
