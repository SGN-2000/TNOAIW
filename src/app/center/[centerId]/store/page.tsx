
"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, set, update, push, child } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Store as StoreIcon, Settings, Users, Package, ShoppingCart } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import type { StoreData, Product, Reservation, Role, Manager } from '@/components/center/store/types';
import ProductManager from '@/components/center/store/product-manager';
import PermissionsManager from '@/components/center/store/permissions-manager';
import ProductList from '@/components/center/store/product-list';
import ReservationList from '@/components/center/store/reservation-list';
import { initializeStoreData } from '@/lib/store-helpers';


export default function StorePage() {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [userRole, setUserRole] = useState<Role>('student');
  const [loading, setLoading] = useState(true);
  const [potentialManagers, setPotentialManagers] = useState<Manager[]>([]);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) return;

    const storeRef = ref(db, `centers/${centerId}/store`);
    const centerRef = ref(db, `centers/${centerId}`);

    const fetchData = async () => {
      setLoading(true);
      await initializeStoreData(centerId);

      const centerSnap = await get(centerRef);
      if (!centerSnap.exists()) {
        setLoading(false);
        return;
      }
      const centerData = centerSnap.val();

      const storeListener = onValue(storeRef, (snapshot) => {
        const data = snapshot.val() as StoreData;
        setStoreData(data);
        
        const isOwner = user.uid === centerData.ownerId;
        const isManager = data?.settings?.managers && data.settings.managers[user.uid];

        if (isOwner) setUserRole('owner');
        else if (isManager) setUserRole('manager');
        else setUserRole('student');
        
        setLoading(false);
      });
      
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

      return () => {
        off(storeRef, 'value', storeListener);
      };
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c; });

    return () => cleanup?.();
  }, [centerId, user]);
  
  const handleToggleStore = async (isOpen: boolean) => {
    if (!centerId || !storeData) return;
    
    try {
      await update(ref(db, `centers/${centerId}/store/settings`), { isOpen });
      toast({ title: `Tienda ${isOpen ? 'abierta' : 'cerrada'}`, description: `La tienda ahora es ${isOpen ? 'visible' : 'invisible'} para los miembros.` });
      
      if (isOpen) {
        const centerSnap = await get(child(ref(db), `centers/${centerId}`));
        const centerData = centerSnap.val();
        const allMemberIds = [
          ...Object.keys(centerData.members.admins || {}),
          ...Object.keys(centerData.members.adminsPlus || {}),
          ...Object.keys(centerData.members.students || {}),
        ];
        const uniqueMemberIds = [...new Set(allMemberIds)];

        const notificationPromises = uniqueMemberIds.map(memberId => {
          const notifRef = push(ref(db, `notifications/${memberId}`));
          return set(notifRef, {
              type: 'STORE_STATUS_CHANGED',
              centerId: centerId,
              centerName: centerData.centerName,
              newStatus: 'abierta',
              timestamp: new Date().toISOString(),
              read: false,
          });
        });
        await Promise.all(notificationPromises);
      }

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo actualizar el estado de la tienda.", variant: "destructive" });
    }
  };

  const products: Product[] = storeData?.products ? Object.values(storeData.products) : [];
  const reservations: Reservation[] = storeData?.reservations ? Object.values(storeData.reservations) : [];
  const canManage = userRole === 'owner' || userRole === 'manager';

  if (loading || !storeData) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }
  
  if (userRole === 'student' && !storeData.settings.isOpen) {
      return (
        <div className="flex flex-1 justify-center items-center p-4">
            <Alert className="max-w-md text-center">
                <StoreIcon className="h-4 w-4" />
                <AlertTitle>Tienda Cerrada</AlertTitle>
                <AlertDescription>
                    La tienda del centro de estudiantes no está abierta en este momento.
                </AlertDescription>
            </Alert>
        </div>
      )
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <StoreIcon className="h-8 w-8" />
          Tienda
        </h2>
        {userRole === 'owner' && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="store-status">{storeData.settings.isOpen ? 'Tienda Abierta' : 'Tienda Cerrada'}</Label>
            <Switch
              id="store-status"
              checked={storeData.settings.isOpen}
              onCheckedChange={handleToggleStore}
            />
          </div>
        )}
      </div>
      <p className="text-muted-foreground">
        Compra merchandising, reserva productos y apoya a tu centro de estudiantes.
      </p>

      {canManage && (
         <div className="grid gap-4 md:grid-cols-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline"><Package className="mr-2"/>Gestionar Productos</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Gestor de Productos</DialogTitle>
                        <DialogDescription>Añade, edita o elimina productos de la tienda.</DialogDescription>
                    </DialogHeader>
                    <ProductManager centerId={centerId} products={products} currency={storeData.settings.currency} />
                </DialogContent>
            </Dialog>
            {userRole === 'owner' && (
                <Dialog>
                    <DialogTrigger asChild>
                         <Button variant="outline"><Users className="mr-2"/>Designar Gestores</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Gestores de la Tienda</DialogTitle>
                            <DialogDescription>Elige quién puede gestionar los productos y las reservas.</DialogDescription>
                        </DialogHeader>
                        <PermissionsManager 
                            centerId={centerId}
                            currentManagers={storeData.settings.managers || {}}
                            potentialManagers={potentialManagers}
                        />
                    </DialogContent>
                </Dialog>
            )}
         </div>
      )}

      <div className="space-y-8">
        <div>
            <h3 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2"><ShoppingCart className="h-6 w-6"/>Productos Disponibles</h3>
            <ProductList 
                centerId={centerId}
                products={products}
                currency={storeData.settings.currency}
                userRole={userRole}
            />
        </div>

        {canManage && (
            <div>
                 <h3 className="text-2xl font-bold tracking-tight mb-4">Reservas</h3>
                 <ReservationList 
                    centerId={centerId}
                    reservations={reservations}
                    products={products}
                 />
            </div>
        )}
      </div>

    </div>
  )
}
