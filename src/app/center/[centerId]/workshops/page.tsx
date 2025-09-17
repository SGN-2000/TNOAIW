"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, child, remove } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Presentation, Plus, Users } from 'lucide-react';
import { initializeWorkshopsData } from '@/lib/workshops-helpers';
import type { Workshop, Role, Manager } from '@/components/center/workshops/types';
import WorkshopCard from '@/components/center/workshops/workshop-card';
import WorkshopForm from '@/components/center/workshops/workshop-form';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PermissionsManager from '@/components/center/workshops/permissions-manager';

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [userRole, setUserRole] = useState<Role>('student');
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [workshopToDelete, setWorkshopToDelete] = useState<Workshop | null>(null);
  const [potentialManagers, setPotentialManagers] = useState<Manager[]>([]);
  const { toast } = useToast();

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) return;

    let cleanup: (() => void) | undefined;
    const fetchData = async () => {
      setLoading(true);
      await initializeWorkshopsData(centerId);

      const centerRef = ref(db, `centers/${centerId}`);
      const workshopsDataRef = ref(db, `centers/${centerId}/workshops`);

      const workshopsListener = onValue(workshopsDataRef, async (snapshot) => {
        const data = snapshot.val();
        const centerSnap = await get(centerRef);
        const centerData = centerSnap.val();

        if (!centerData) {
          setWorkshops([]);
          setUserRole('student');
          setLoading(false);
          return;
        }
        
        // Role determination
        const isOwner = user.uid === centerData.ownerId;
        const isManager = data?.permissions?.managers?.[user.uid];
        
        if (isOwner) setUserRole('owner');
        else if (isManager) setUserRole('manager');
        else setUserRole('student');

        // Workshops list
        const workshopsList: Workshop[] = data?.workshops ? Object.values(data.workshops) : [];
        setWorkshops(workshopsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        // Potential managers
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
        setLoading(false);
      });
      
      cleanup = () => off(workshopsDataRef, 'value', workshopsListener);
    };

    fetchData();
    return () => cleanup?.();
  }, [centerId, user]);

  const handleEdit = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setEditingWorkshop(null);
    setFormOpen(true);
  };

  const handleDelete = (workshop: Workshop) => {
    setWorkshopToDelete(workshop);
  };

  const confirmDelete = async () => {
    if (!workshopToDelete) return;
    try {
      await remove(ref(db, `centers/${centerId}/workshops/workshops/${workshopToDelete.id}`));
      toast({ title: 'Taller eliminado' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el taller.', variant: 'destructive' });
    } finally {
      setWorkshopToDelete(null);
    }
  };

  const canManage = userRole === 'owner' || userRole === 'manager';

  if (loading) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  return (
    <>
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Presentation className="h-8 w-8" />
            Talleres
          </h2>
          <div className="flex gap-2">
            {canManage && (
              <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNew}><Plus className="mr-2"/>Crear Taller</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingWorkshop ? 'Editar' : 'Nuevo'} Taller</DialogTitle>
                  </DialogHeader>
                  <WorkshopForm centerId={centerId} onSave={() => setFormOpen(false)} workshop={editingWorkshop} />
                </DialogContent>
              </Dialog>
            )}
             {userRole === 'owner' && (
               <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Users className="mr-2"/>Gestionar Gestores</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gestores de Talleres</DialogTitle>
                  </DialogHeader>
                  <PermissionsManager centerId={centerId} onSave={() => setPermissionsOpen(false)} potentialManagers={potentialManagers} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Explora, aprende y participa en los talleres ofrecidos por el centro.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workshops.length > 0 ? (
                workshops.map(workshop => (
                    <WorkshopCard key={workshop.id} workshop={workshop} canManage={canManage} onEdit={handleEdit} onDelete={handleDelete} />
                ))
            ) : (
                <div className="md:col-span-2 lg:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold">No hay talleres programados</h3>
                    <p className="text-muted-foreground mt-2">
                    {canManage ? 'Crea el primer taller para empezar.' : 'Vuelve más tarde para ver los próximos talleres.'}
                    </p>
                </div>
            )}
        </div>
      </div>
      <AlertDialog open={!!workshopToDelete} onOpenChange={(open) => !open && setWorkshopToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el taller.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
