
"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ref, set, push, update, runTransaction } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Product } from './types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';

interface ReservationFormProps {
  product: Product;
  centerId: string;
  currency: string;
  onReserved: () => void;
}

export default function ReservationForm({ product, centerId, currency, onReserved }: ReservationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const reservationSchema = z.object({
    quantity: z.coerce.number().int().min(1, "Debes reservar al menos 1 unidad.").max(product.stock, `No puedes reservar más del stock disponible (${product.stock}).`),
  });

  const form = useForm<z.infer<typeof reservationSchema>>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  const onSubmit = async (values: z.infer<typeof reservationSchema>) => {
    if (!user) return;

    try {
      // 1. Create reservation
      const newReservationRef = push(ref(db, `centers/${centerId}/store/reservations`));
      const reservationId = newReservationRef.key!;
      const reservedAt = new Date();
      const expiresAt = new Date(reservedAt.getTime() + 48 * 60 * 60 * 1000);

      const reservationData = {
        id: reservationId,
        userId: user.uid,
        userName: user.displayName,
        productId: product.id,
        productName: product.name,
        quantity: values.quantity,
        status: 'pending',
        reservedAt: reservedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      // 2. Update product stock
      const productStockRef = ref(db, `centers/${centerId}/store/products/${product.id}/stock`);
      
      await runTransaction(productStockRef, (currentStock) => {
        if (currentStock === null) {
          return 0; // Should not happen
        }
        if (currentStock < values.quantity) {
          throw new Error("No hay suficiente stock.");
        }
        return currentStock - values.quantity;
      });

      // 3. Set reservation data
      await set(newReservationRef, reservationData);

      toast({ title: "¡Reserva Exitosa!", description: `${product.name} ha sido reservado.` });
      onReserved();

    } catch (error: any) {
      console.error(error);
      toast({ title: "Error en la reserva", description: error.message || "No se pudo completar la reserva.", variant: "destructive" });
    }
  };
  
  const quantity = form.watch('quantity');
  const totalPrice = (quantity || 0) * product.price;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad a Reservar (Máx: {product.stock})</FormLabel>
              <FormControl><Input type="number" min={1} max={product.stock} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="font-semibold text-lg">Total a Pagar: {totalPrice.toLocaleString()}</p>

        <Alert>
            <Clock className="h-4 w-4"/>
            <AlertTitle>Plazo de Pago</AlertTitle>
            <AlertDescription>
                Tendrás 48 horas para realizar el pago al centro de estudiantes. De lo contrario, tu reserva será cancelada.
            </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Reserva
          </Button>
        </div>
      </form>
    </Form>
  );
}
