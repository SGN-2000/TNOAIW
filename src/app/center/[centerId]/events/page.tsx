"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, child, remove } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Calendar, PlusCircle, Users } from 'lucide-react';
import { initializeEventsData } from '@/lib/events-helpers';
import type { Event, Role, Manager } from '@/components/center/events/types';
import EventCard from '@/components/center/events/event-card';
import EventForm from '@/components/center/events/event-form';
import PermissionsManager from '@/components/center/events/permissions-manager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<Role>('member');
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [potentialManagers, setPotentialManagers] = useState<Manager[]>([]);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  
  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;
  const { toast } = useToast();

  useEffect(() => {
    if (!centerId || !user) return;

    const fetchData = async () => {
      setLoading(true);
      await initializeEventsData(centerId);

      const centerRef = ref(db, `centers/${centerId}`);
      const centerSnap = await get(centerRef);
      if (!centerSnap.exists()) {
          setLoading(false);
          return;
      }
      const centerData = centerSnap.val();
      const ownerId = centerData.ownerId;
      
      const adminIds = Object.keys(centerData.members.admins || {});
      const adminPlusIds = Object.keys(centerData.members.adminsPlus || {});
      const potentialManagerIds = [...new Set([...adminIds, ...adminPlusIds])];
      
      const managerPromises = potentialManagerIds.map(async (id) => {
        const userSnap = await get(child(ref(db, 'users'), id));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          return {
            id,
            name: `${userData.name} ${userData.surname}`,
            username: userData.username,
            role: adminPlusIds.includes(id) ? 'admin-plus' : 'admin'
          };
        }
        return null;
      });
      const resolvedManagers = (await Promise.all(managerPromises)).filter(Boolean) as Manager[];
      setPotentialManagers(resolvedManagers);

      const eventsRef = ref(db, `centers/${centerId}/events`);
      const listener = onValue(eventsRef, (snapshot) => {
        const data = snapshot.val();
        const eventsList: Event[] = data?.events ? Object.values(data.events) : [];
        setEvents(eventsList.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        const isOwner = user.uid === ownerId;
        const isManager = data?.permissions?.managers && data.permissions.managers[user.uid];

        if (isOwner) setUserRole('owner');
        else if (isManager) setUserRole('manager');
        else setUserRole('member');

        setLoading(false);
      });

      return () => off(eventsRef, 'value', listener);
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c; });
    return () => cleanup?.();

  }, [centerId, user]);
  
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };
  
  const handleDeleteEvent = async () => {
    if (!eventToDelete || userRole !== 'owner') return;

    try {
      await remove(ref(db, `centers/${centerId}/events/events/${eventToDelete.id}`));
      toast({
        title: "Evento Eliminado",
        description: `El evento "${eventToDelete.title}" ha sido eliminado.`,
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento.",
        variant: "destructive",
      });
    } finally {
      setEventToDelete(null);
    }
  };

  const canManage = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';
  
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.date) < new Date());
  const eventDates = events.map(e => new Date(e.date));

  // --- Temporary disable ---
  return (
    <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
                    <Calendar className="h-10 w-10" />
                </div>
                <CardTitle>Eventos</CardTitle>
                <CardDescription>Esta funcionalidad estará disponible próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Estamos trabajando para habilitar la organización de torneos, competencias y mucho más. ¡Vuelve pronto!
                </p>
            </CardContent>
        </Card>
    </div>
  );
  // --- End temporary disable ---

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }
  
  return (
    <>
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Eventos
          </h2>
          <div className="flex gap-2">
            {canManage && (
              <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                  setFormOpen(isOpen);
                  if (!isOpen) setEditingEvent(null);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreateEvent}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{editingEvent ? 'Editar' : 'Crear'} Evento</DialogTitle>
                  </DialogHeader>
                  <EventForm 
                    centerId={centerId}
                    event={editingEvent}
                    onSave={() => {
                      setFormOpen(false);
                      setEditingEvent(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
            {isOwner && (
              <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Users className="mr-2"/>Gestionar Permisos</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gestionar Permisos de Eventos</DialogTitle>
                    <DialogDescription>Elige quién puede crear y gestionar eventos.</DialogDescription>
                  </DialogHeader>
                  <PermissionsManager
                      centerId={centerId}
                      potentialManagers={potentialManagers}
                      onSave={() => setPermissionsOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Organiza competencias, torneos y mucho más.
        </p>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
             <div>
              <h3 className="text-2xl font-bold tracking-tight mb-4">Próximos Eventos</h3>
              {upcomingEvents.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {upcomingEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      centerId={centerId} 
                      userRole={userRole}
                      onDelete={() => setEventToDelete(event)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay eventos próximos.</p>
              )}
            </div>
            
            <div>
              <h3 className="text-2xl font-bold tracking-tight mb-4">Eventos Pasados</h3>
              {pastEvents.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {pastEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      centerId={centerId} 
                      userRole={userRole}
                      onDelete={() => setEventToDelete(event)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay eventos pasados.</p>
              )}
            </div>
          </div>
          <div className="space-y-8">
            <Card>
              <CardContent className="p-2">
                <CalendarComponent
                  mode="multiple"
                  selected={eventDates}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el evento "{eventToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
