
"use client"

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ref, update, runTransaction, push, set, get, child } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, UserPlus, Users, AlertTriangle } from 'lucide-react';
import type { Event, Role } from './types';
import { isPast } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EventRegistrationProps {
    event: Event;
    centerId: string;
    userRole: Role;
}

export default function EventRegistration({ event, centerId, userRole }: EventRegistrationProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [teamName, setTeamName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
    const isRegistrationClosed = registrationDeadline ? isPast(registrationDeadline) : isPast(new Date(event.date));

    if (!user || !event.requiresRsvp) {
        return null;
    }
    
    if (isRegistrationClosed && userRole === 'member') {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    El período de inscripción para este evento ha finalizado.
                </AlertDescription>
            </Alert>
        )
    }

    let userTeamName: string | null = null;
    const isUserRegistered = Object.values(event.teams || {}).some(team => {
        if (Object.keys(team.members || {}).includes(user.uid)) {
            userTeamName = team.name;
            return true;
        }
        return false;
    }) || Object.keys(event.rsvps || {}).includes(user.uid);


    const handleIndividualRsvp = async () => {
        setIsSubmitting(true);
        const rsvpRef = ref(db, `centers/${centerId}/events/events/${event.id}/rsvps/${user.uid}`);
        try {
            await set(rsvpRef, { 
                id: user.uid, 
                name: user.displayName, 
                timestamp: new Date().toISOString(),
                paymentStatus: 'pending'
            });
            toast({ title: "¡Inscrito!", description: "Has confirmado tu asistencia al evento." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCreateTeam = async () => {
        if (teamName.trim().length < 3) {
            toast({ title: "Nombre de equipo inválido", description: "El nombre debe tener al menos 3 caracteres.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const teamsRef = ref(db, `centers/${centerId}/events/events/${event.id}/teams`);
        const newTeamRef = push(teamsRef);
        
        try {
            await set(newTeamRef, {
                id: newTeamRef.key,
                name: teamName.trim(),
                leaderId: user.uid,
                members: {
                    [user.uid]: {
                        id: user.uid,
                        name: user.displayName,
                        status: 'accepted',
                        paymentStatus: 'pending'
                    }
                }
            });
            toast({ title: "Equipo creado", description: "Ahora puedes invitar a otros miembros." });
            setTeamName('');
        } catch (error) {
             console.error(error);
            toast({ title: "Error al crear equipo", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isUserRegistered) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-green-100 text-green-700 rounded-full p-3 w-fit">
                        <Check className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-green-800 mt-2">¡Ya estás inscrito!</CardTitle>
                    <CardDescription className="text-green-700">
                        {event.participationType === 'team' && userTeamName 
                            ? <>Formas parte del equipo <strong>&quot;{userTeamName}&quot;</strong>.</>
                            : "Has confirmado tu asistencia."
                        }
                         {event.registrationType === 'paid' && " No olvides completar tu pago."}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Inscripción</CardTitle>
                <CardDescription>
                    {event.participationType === 'individual'
                        ? "Confirma tu asistencia al evento."
                        : "Crea o únete a un equipo para participar."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {event.participationType === 'individual' && (
                    <Button onClick={handleIndividualRsvp} disabled={isSubmitting || isRegistrationClosed} className="w-full">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <UserPlus className="mr-2"/>}
                        Inscribirme
                    </Button>
                )}
                {event.participationType === 'team' && event.teamFormation === 'participant' && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Crea un equipo e invita a tus compañeros. El tamaño del equipo es de {event.teamSize?.min} a {event.teamSize?.max} personas.</p>
                        <div className="flex gap-2">
                             <Input 
                                placeholder="Nombre de tu equipo" 
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                disabled={isSubmitting || isRegistrationClosed}
                            />
                             <Button onClick={handleCreateTeam} disabled={isSubmitting || !teamName.trim() || isRegistrationClosed}>
                                 {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Users className="mr-2"/>}
                                Crear Equipo
                             </Button>
                        </div>
                    </div>
                )}
                 {event.participationType === 'team' && event.teamFormation === 'manager' && (
                    <p className="text-sm text-muted-foreground">Un gestor del evento se encargará de armar los equipos. ¡Mantente atento!</p>
                )}
            </CardContent>
        </Card>
    );
}
