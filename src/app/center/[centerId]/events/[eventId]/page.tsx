

"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, off, get, child } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Users, User, Edit, DollarSign, Clock, AlertTriangle, ListTree, Dices, ShieldHalf } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Event, Role, Team, CenterMember } from '@/components/center/events/types';
import EventRegistration from '@/components/center/events/event-registration';
import TeamManagement from '@/components/center/events/team-management';
import EventForm from '@/components/center/events/event-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RegisteredUsersList from '@/components/center/events/registered-users-list';
import { getCenterMembers } from '@/lib/events-helpers';
import PaymentManager from '@/components/center/events/payment-manager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FixtureGenerator from '@/components/center/events/fixture-generator';
import FixtureDisplay from '@/components/center/events/fixture-display';
import PotAssignment from '@/components/center/events/pot-assignment';
import DrawCountdown from '@/components/center/events/draw-countdown';

export default function EventDetailsPage() {
    const [event, setEvent] = useState<Event | null>(null);
    const [userRole, setUserRole] = useState<Role>('member');
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setFormOpen] = useState(false);
    const [centerMembers, setCenterMembers] = useState<CenterMember[]>([]);

    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
    const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;

    useEffect(() => {
        if (!centerId || !eventId || !user) {
            setLoading(false);
            return;
        }

        const eventRef = ref(db, `centers/${centerId}/events/events/${eventId}`);
        const centerRef = ref(db, `centers/${centerId}`);

        const eventListener = onValue(eventRef, (snapshot) => {
            if (snapshot.exists()) {
                setEvent({ id: snapshot.key, ...snapshot.val() });
            } else {
                setEvent(null);
            }
            setLoading(false);
        });

        const fetchUserRoleAndMembers = async () => {
             const centerSnap = await get(centerRef);
             const eventPermsSnap = await get(child(ref(db, `centers/${centerId}/events/permissions`), 'managers'));

            if (centerSnap.exists()) {
                const centerData = centerSnap.val();
                const isOwner = user.uid === centerData.ownerId;
                const isManager = eventPermsSnap.exists() && eventPermsSnap.val()[user.uid];

                if (isOwner) setUserRole('owner');
                else if (isManager) setUserRole('manager');
                else setUserRole('member');
            }
            const members = await getCenterMembers(centerId);
            setCenterMembers(members);
        }
        
        fetchUserRoleAndMembers();

        return () => {
            off(eventRef, 'value', eventListener);
        };
    }, [centerId, eventId, user]);
    
    const canManage = userRole === 'owner' || userRole === 'manager';

    if (loading) {
        return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
    }

    if (!event) {
        return <div className="flex flex-1 justify-center items-center p-4">Evento no encontrado.</div>;
    }
    
    const teamsArray = event.teams ? Object.values(event.teams) : [];
    const showManagerTeamWarning = canManage && event.participationType === 'team' && event.teamFormation === 'manager' && teamsArray.length === 0;
    
    const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : new Date(event.date);
    const isRegistrationOver = isPast(registrationDeadline);
    
    const drawDate = event.classification?.drawDate ? new Date(event.classification.drawDate) : null;
    const isDrawTime = drawDate ? isPast(drawDate) : false;

    const canGenerateFixture = canManage && event.classification?.enabled && isRegistrationOver && (!drawDate || !isDrawTime);
    const isPotAssignmentNeeded = canManage && isRegistrationOver && !isDrawTime && event.classification?.enabled && event.classification.groupsConfig?.usePots && !event.pots;
    
    const isDrawReady = isRegistrationOver && !isDrawTime && event.classification?.enabled && event.classification.drawDate;
    const drawIsManual = event.classification?.groupsConfig?.drawType === 'manual';


    const classificationTypeLabels = {
        table: "Tabla de Posiciones",
        groups: "Grupos y Eliminatoria",
        elimination: "Eliminatoria Directa"
    }

    const groupsConfigLabel = () => {
        if (!event.classification?.enabled || event.classification.type !== 'groups' || !event.classification.groupsConfig) return null;
        
        const { drawType, usePots, knockoutDrawType } = event.classification.groupsConfig;
        
        let label = "Sorteo de grupos ";
        if (drawType === 'manual') label += "manual";
        else label += usePots ? "automático con bombos" : "automático";
        
        label += knockoutDrawType === 'manual' ? ", eliminatoria manual" : ", eliminatoria por sorteo";

        return label;
    }
    

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">{event.title}</h2>
                </div>
                 {canManage && (
                    <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Edit className="mr-2 h-4 w-4"/>Editar Evento</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Editar Evento</DialogTitle>
                            </DialogHeader>
                            <EventForm
                                centerId={centerId}
                                event={event}
                                onSave={() => setFormOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{event.description}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(event.date), "eeee, d 'de' MMMM, yyyy 'a las' HH:mm 'hs'", { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{event.location}</span>
                        </div>
                         <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Participación: <span className="font-semibold">{event.participationType === 'team' ? 'En Equipo' : 'Individual'}</span></span>
                        </div>
                        {event.participationType === 'team' && event.teamFormation === 'participant' && (
                             <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>Tamaño de equipo: <span className="font-semibold">{event.teamSize?.min}-{event.teamSize?.max}</span></span>
                            </div>
                        )}
                        {event.registrationType === 'paid' && event.cost && (
                             <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span>Costo: <span className="font-semibold">${event.cost.toLocaleString()} por persona</span></span>
                            </div>
                        )}
                         {event.registrationDeadline && (
                             <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Inscripción hasta: <span className="font-semibold">{format(new Date(event.registrationDeadline), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</span></span>
                            </div>
                        )}
                         {event.classification?.enabled && event.classification.type && (
                            <div className="flex items-center gap-2 text-sm">
                                <ListTree className="h-4 w-4 text-muted-foreground" />
                                <span>Formato: <span className="font-semibold">{classificationTypeLabels[event.classification.type]}</span></span>
                            </div>
                        )}
                        {event.classification?.type === 'groups' && event.classification?.groupsConfig && (
                            <div className="flex items-center gap-2 text-sm">
                                <Dices className="h-4 w-4 text-muted-foreground" />
                                <span>Configuración: <span className="font-semibold capitalize">{groupsConfigLabel()}</span></span>
                            </div>
                        )}
                         {drawDate && (
                             <div className="flex items-center gap-2 text-sm">
                                <ShieldHalf className="h-4 w-4 text-muted-foreground" />
                                <span>Sorteo: <span className="font-semibold">{format(drawDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</span></span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {showManagerTeamWarning && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Acción Requerida</AlertTitle>
                    <AlertDescription>
                        Este evento está configurado para que los equipos sean armados por un gestor, pero aún no se ha creado ninguno. Ve a la pestaña "Equipos" para comenzar a crearlos.
                    </AlertDescription>
                </Alert>
            )}
            
            <EventRegistration event={event} centerId={centerId} userRole={userRole} />

            {isPotAssignmentNeeded && <PotAssignment event={event} centerId={centerId} />}
            
            {isDrawReady && !drawIsManual && !event.fixture && <DrawCountdown event={event} centerId={centerId} />}
            
            {event.fixture && <FixtureDisplay fixture={event.fixture} centerId={centerId} eventId={event.id} />}
            
            {canGenerateFixture && <FixtureGenerator event={event} centerId={centerId} />}

            <Tabs defaultValue="participants" className="mt-8">
                <TabsList>
                    <TabsTrigger value="participants">Inscritos</TabsTrigger>
                    {event.participationType === 'team' && <TabsTrigger value="teams">Equipos</TabsTrigger>}
                    {canManage && event.registrationType === 'paid' && <TabsTrigger value="payments">Pagos</TabsTrigger>}
                </TabsList>
                <TabsContent value="participants">
                    <RegisteredUsersList teams={teamsArray} rsvps={Object.values(event.rsvps || {})} participationType={event.participationType} />
                </TabsContent>
                {event.participationType === 'team' && (
                    <TabsContent value="teams">
                       <TeamManagement 
                            event={event} 
                            centerId={centerId} 
                            canManage={canManage}
                            allCenterMembers={centerMembers}
                        />
                    </TabsContent>
                )}
                 {canManage && event.registrationType === 'paid' && (
                    <TabsContent value="payments">
                        <PaymentManager event={event} centerId={centerId} />
                    </TabsContent>
                 )}
            </Tabs>
        </div>
    );
}
