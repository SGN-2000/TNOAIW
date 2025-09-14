
"use client"

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, CheckCircle2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ref, update, push, set, runTransaction } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Reservation, Product } from './types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReservationListProps {
  reservations: Reservation[];
  products: Product[];
  centerId: string;
}

export default function ReservationList({ reservations, products, centerId }: ReservationListProps) {
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const { toast } = useToast();

  const sortedReservations = [...reservations].sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime());

  const handleCancelClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setAlertOpen(true);
  };

  const handleMarkAsSold = async (reservation: Reservation) => {
     if (!reservation) return;

    try {
        // 1. Update reservation status to 'completed'
        const reservationRef = ref(db, `centers/${centerId}/store/reservations/${reservation.id}`);
        await update(reservationRef, { status: 'completed' });
        
        // 2. Find product to get price
        const product = products.find(p => p.id === reservation.productId);
        if (!product) {
            throw new Error("Producto no encontrado para la reserva.");
        }

        // 3. Create a new transaction in finances
        const transactionData = {
            id: push(ref(db, `centers/${centerId}/finances/transactions`)).key,
            type: 'income',
            amount: product.price * reservation.quantity,
            description: reservation.productName,
            categoryId: 'tienda', // Hardcoded category ID for "Tienda"
            date: new Date().toISOString(),
            authorId: reservation.userId // Or manager's ID if preferred
        };
        await set(ref(db, `centers/${centerId}/finances/transactions/${transactionData.id}`), transactionData);

        toast({ title: "Reserva completada", description: "La venta ha sido registrada en finanzas." });

    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "No se pudo marcar la reserva como vendida.", variant: "destructive" });
    }
  }

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    try {
      // 1. Restore stock
      const productStockRef = ref(db, `centers/${centerId}/store/products/${selectedReservation.productId}/stock`);
      await runTransaction(productStockRef, (currentStock) => {
        return (currentStock || 0) + selectedReservation.quantity;
      });
      
      // 2. Update reservation status
      const reservationRef = ref(db, `centers/${centerId}/store/reservations/${selectedReservation.id}`);
      await update(reservationRef, { status: 'canceled' });

      // 3. Notify user
      const notifRef = push(ref(db, `notifications/${selectedReservation.userId}`));
        await set(notifRef, {
            type: 'RESERVATION_CANCELED',
            centerId: centerId,
            productName: selectedReservation.productName,
            timestamp: new Date().toISOString(),
            read: false,
        });

      toast({ title: "Reserva cancelada" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo cancelar la reserva.", variant: "destructive" });
    } finally {
        setAlertOpen(false);
        setSelectedReservation(null);
    }
  };

  const getStatusBadge = (status: Reservation['status'], expiresAt: string) => {
    if (status === 'pending' && isPast(new Date(expiresAt))) {
        return <Badge variant="destructive">Expirada</Badge>;
    }
     switch(status) {
        case 'pending': return <Badge className="bg-yellow-500">Pendiente</Badge>;
        case 'completed': return <Badge className="bg-green-500">Completada</Badge>;
        case 'canceled': return <Badge variant="destructive">Cancelada</Badge>;
        default: return <Badge variant="secondary">Desconocido</Badge>;
     }
  }

  return (
    <>
    <TooltipProvider>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Fecha Reserva</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedReservations.length > 0 ? sortedReservations.map(reservation => {
                const isPending = reservation.status === 'pending';
                const isExpired = isPast(new Date(reservation.expiresAt));

                return (
                  <TableRow key={reservation.id} className={cn(!isPending && 'text-muted-foreground')}>
                    <TableCell className="font-medium">{reservation.productName}</TableCell>
                    <TableCell>{reservation.userName}</TableCell>
                    <TableCell>{reservation.quantity}</TableCell>
                    <TableCell>{formatDistanceToNow(new Date(reservation.reservedAt), { locale: es, addSuffix: true })}</TableCell>
                    <TableCell>{getStatusBadge(reservation.status, reservation.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      {isPending && !isExpired && (
                         <div className="flex gap-2 justify-end">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkAsSold(reservation)}>
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Marcar como Vendido</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCancelClick(reservation)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar Reserva</TooltipContent>
                            </Tooltip>
                         </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No hay reservas.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar Reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Se devolverá el stock al producto y se notificará al usuario. Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelReservation} className="bg-destructive hover:bg-destructive/90">
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </TooltipProvider>
    </>
  );
}
