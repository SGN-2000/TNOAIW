"use client"

import { useState, useMemo } from 'react';
import type { Event, TeamMember, Rsvp } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, UserMinus } from 'lucide-react';
import { isPast } from 'date-fns';
import { ref, update, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface PaymentManagerProps {
    event: Event;
    centerId: string;
}

type Attendee = (Rsvp | TeamMember) & { teamName?: string };

export default function PaymentManager({ event, centerId }: PaymentManagerProps) {
    const { toast } = useToast();

    const attendees = useMemo(() => {
        let allAttendees: Attendee[] = [];
        if (event.participationType === 'individual' && event.rsvps) {
            allAttendees = Object.values(event.rsvps);
        } else if (event.participationType === 'team' && event.teams) {
            Object.values(event.teams).forEach(team => {
                Object.values(team.members).forEach(member => {
                    if (member.status === 'accepted') {
                        allAttendees.push({ ...member, teamName: team.name });
                    }
                });
            });
        }
        return allAttendees.sort((a,b) => a.name.localeCompare(b.name));
    }, [event]);
    
    const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
    const isDeadlineForPaymentPast = registrationDeadline ? isPast(registrationDeadline) : false;

    const handleMarkAsPaid = async (attendee: Attendee) => {
        let attendeeRefPath: string;
        if (event.participationType === 'individual') {
            attendeeRefPath = `centers/${centerId}/events/events/${event.id}/rsvps/${attendee.id}/paymentStatus`;
        } else {
            const teamId = Object.values(event.teams || {}).find(team => team.members[attendee.id])?.id;
            if (!teamId) {
                toast({ title: "Error", description: "No se encontró el equipo del miembro.", variant: "destructive"});
                return;
            }
            attendeeRefPath = `centers/${centerId}/events/events/${event.id}/teams/${teamId}/members/${attendee.id}/paymentStatus`;
        }

        try {
            // Mark as paid
            await set(ref(db, attendeeRefPath), 'paid');

            // Add to finances
            const transactionRef = push(ref(db, `centers/${centerId}/finances/transactions`));
            await set(transactionRef, {
                id: transactionRef.key,
                type: 'income',
                amount: event.cost,
                description: `Pago ${attendee.name} - ${event.title}`,
                categoryId: 'eventos',
                date: new Date().toISOString(),
                authorId: 'system', // or manager's ID
            });
            
             // Notify user
            const notifRef = push(ref(db, `notifications/${attendee.id}`));
            await set(notifRef, {
                type: 'PAYMENT_CONFIRMED',
                centerId: centerId,
                eventName: event.title,
                timestamp: new Date().toISOString(),
                read: false,
            });

            toast({ title: "Pago registrado", description: `Se confirmó el pago de ${attendee.name}.`});
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo registrar el pago.", variant: "destructive"});
        }
    }
    
    const handleRemoveAttendee = async (attendee: Attendee) => {
        let attendeeRefPath: string;
        if (event.participationType === 'individual') {
            attendeeRefPath = `centers/${centerId}/events/events/${event.id}/rsvps/${attendee.id}`;
        } else {
            const teamId = Object.values(event.teams || {}).find(team => team.members[attendee.id])?.id;
            if (!teamId) {
                toast({ title: "Error", description: "No se encontró el equipo del miembro.", variant: "destructive"});
                return;
            }
            attendeeRefPath = `centers/${centerId}/events/events/${event.id}/teams/${teamId}/members/${attendee.id}`;
        }

        try {
            await set(ref(db, attendeeRefPath), null);
            toast({ title: "Participante eliminado", description: `${attendee.name} ha sido dado de baja del evento.`});
        } catch (error) {
             toast({ title: "Error", description: "No se pudo eliminar al participante.", variant: "destructive"});
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestión de Pagos</CardTitle>
                <CardDescription>
                    Administra los pagos de los participantes. El costo de inscripción es de ${event.cost?.toLocaleString()}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Participante</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendees.length > 0 ? attendees.map(att => (
                            <TableRow key={att.id}>
                                <TableCell className="font-medium">{att.name}</TableCell>
                                <TableCell>{att.teamName || 'N/A'}</TableCell>
                                <TableCell>
                                    {att.paymentStatus === 'paid' ? 
                                        <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Pagado</Badge> : 
                                        <Badge variant="destructive"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>
                                    }
                                </TableCell>
                                <TableCell className="text-right">
                                    {att.paymentStatus === 'pending' && (
                                        isDeadlineForPaymentPast ? (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm"><UserMinus className="mr-2 h-4 w-4"/>Dar de Baja</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Dar de baja a {att.name}?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            La fecha límite de pago ha pasado. ¿Confirmas que quieres eliminar a este participante del evento? Esta acción no se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveAttendee(att)}>Confirmar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        ) : (
                                            <Button size="sm" onClick={() => handleMarkAsPaid(att)}><CheckCircle className="mr-2 h-4 w-4"/>Marcar como Pagado</Button>
                                        )
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No hay participantes inscritos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
