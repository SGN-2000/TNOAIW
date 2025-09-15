
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, GripVertical, Loader2, ShieldHalf, Trash2 } from 'lucide-react';
import { Event, Team, Pot } from './types';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const SortableTeam = ({ team }: { team: { id: string; name: string } }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: team.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="p-2 border rounded-md bg-background flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            {team.name}
        </div>
    );
};

interface PotColumnProps {
    pot: Pot;
    onTeamDrop: (teamId: string, fromPotId: string, toPotId: string) => void;
    onPotNameChange: (potId: string, newName: string) => void;
    onDeletePot: (potId: string) => void;
}

const PotColumn = ({ pot, onPotNameChange, onDeletePot }: PotColumnProps) => {
    const { setNodeRef } = useSortable({ id: pot.id, data: { type: 'pot' } });

    const validTeams = pot.teams.filter(Boolean);

    return (
        <Card ref={setNodeRef} className="flex-1 min-w-[250px] bg-muted/50">
            <CardHeader className="flex-row items-center justify-between p-3 border-b">
                <Input value={pot.name} onChange={(e) => onPotNameChange(pot.id, e.target.value)} className="h-8 font-semibold border-0 focus-visible:ring-0" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeletePot(pot.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="p-3 space-y-2 min-h-[100px]">
                <SortableContext items={validTeams.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {validTeams.map(team => <SortableTeam key={team.id} team={team} />)}
                </SortableContext>
            </CardContent>
        </Card>
    );
};


interface PotAssignmentProps {
    event: Event;
    centerId: string;
}

export default function PotAssignment({ event, centerId }: PotAssignmentProps) {
    const registeredTeams = Object.values(event.teams || {});
    
    const getInitialPots = () => {
        const teamCount = registeredTeams.length;
        let potCount = 1;
        if (teamCount > 4 && teamCount <= 8) potCount = 2;
        else if (teamCount > 8 && teamCount <= 16) potCount = 4;
        else if (teamCount > 16) potCount = 8;

        const initialPots: Pot[] = [{ id: 'unassigned', name: 'Equipos sin Asignar', teams: registeredTeams }];
        for (let i = 1; i <= potCount; i++) {
            initialPots.push({ id: `pot${i}`, name: `Bombo ${i}`, teams: [] });
        }
        return initialPots;
    };
    
    const [pots, setPots] = useState<Pot[]>(getInitialPots());
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        
        let fromPotId: string | undefined;
        let toPotId: string | undefined;

        for (const pot of pots) {
            if (pot.teams.some(t => t && t.id === activeId)) fromPotId = pot.id;
            if (pot.teams.some(t => t && t.id === overId)) toPotId = pot.id;
        }
        
        if (over.data.current?.type === 'pot') {
            toPotId = overId;
        }

        if (!fromPotId || !toPotId) return;

        setPots(prev => {
            const newPots = [...prev];
            const fromPot = newPots.find(p => p.id === fromPotId)!;
            const toPot = newPots.find(p => p.id === toPotId)!;
            const activeTeam = fromPot.teams.find(t => t && t.id === activeId);
            
            if (!activeTeam) return prev;

            fromPot.teams = fromPot.teams.filter(t => t && t.id !== activeId);

            const overIndex = toPot.teams.findIndex(t => t && t.id === overId);
            if (overIndex !== -1) {
                toPot.teams.splice(overIndex, 0, activeTeam);
            } else {
                 toPot.teams.push(activeTeam);
            }
            return newPots;
        });
    };

    const handleAddPot = () => {
        const newPotId = `pot${Date.now()}`;
        setPots(prev => [...prev, { id: newPotId, name: `Bombo ${pots.length}`, teams: [] }]);
    };
    
    const handlePotNameChange = (potId: string, newName: string) => {
        setPots(prev => prev.map(p => p.id === potId ? {...p, name: newName} : p));
    }
    
    const onDeletePot = (potId: string) => {
        const potToDelete = pots.find(p => p.id === potId);
        if (!potToDelete || potId === 'unassigned') return;

        setPots(prev => {
            const updatedPots = prev.filter(p => p.id !== potId);
            const unassignedPot = updatedPots.find(p => p.id === 'unassigned')!;
            unassignedPot.teams.push(...potToDelete.teams);
            return updatedPots;
        });
    };

    const handleSavePots = async () => {
        const unassignedPot = pots.find(p => p.id === 'unassigned');
        if (unassignedPot && unassignedPot.teams.length > 0) {
            toast({ title: 'Equipos sin asignar', description: 'Debes asignar todos los equipos a un bombo.', variant: 'destructive'});
            return;
        }
        setIsSaving(true);
        const potsToSave = pots.filter(p => p.id !== 'unassigned');
        
        try {
            await update(ref(db, `centers/${centerId}/events/events/${event.id}`), { pots: potsToSave });
            toast({ title: "Bombos guardados", description: "La configuración de bombos se ha guardado para el sorteo."});
        } catch(error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron guardar los bombos.", variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldHalf/> Asignación de Bombos</CardTitle>
                <CardDescription>Arrastra los equipos a los bombos correspondientes para el sorteo. Los equipos en el mismo bombo no se enfrentarán en la fase inicial.</CardDescription>
            </CardHeader>
            <CardContent>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {pots.map(pot => (
                           <PotColumn key={pot.id} pot={pot} onTeamDrop={() => {}} onPotNameChange={handlePotNameChange} onDeletePot={onDeletePot} />
                        ))}
                         <Button variant="outline" onClick={handleAddPot} className="h-auto min-w-[150px]"><PlusCircle className="mr-2"/>Añadir Bombo</Button>
                    </div>
                </DndContext>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={handleSavePots} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        Guardar Bombos
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
