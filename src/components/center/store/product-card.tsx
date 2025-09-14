
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Product, Role } from './types';
import ReservationForm from './reservation-form';
import { useAuth } from '@/hooks/use-auth';

interface ProductCardProps {
  product: Product;
  currency: string;
  centerId: string;
  userRole: Role;
}

export default function ProductCard({ product, currency, centerId, userRole }: ProductCardProps) {
    const [isReserveOpen, setReserveOpen] = useState(false);
    
    return (
        <>
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="pt-4">{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
                 <p className="text-2xl font-bold">{product.price.toLocaleString()}</p>
                 <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="bg-green-600">
                    {product.stock > 0 ? `${product.stock} en stock` : 'Sin stock'}
                 </Badge>
            </CardContent>
            <CardFooter>
                 {userRole === 'student' && (
                     <Dialog open={isReserveOpen} onOpenChange={setReserveOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full" disabled={product.stock === 0}>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Reservar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reservar {product.name}</DialogTitle>
                                <DialogDescription>Selecciona cuántas unidades quieres reservar.</DialogDescription>
                            </DialogHeader>
                            <ReservationForm 
                                product={product} 
                                centerId={centerId} 
                                onReserved={() => setReserveOpen(false)}
                                currency={currency}
                            />
                        </DialogContent>
                    </Dialog>
                 )}
            </CardFooter>
        </Card>
        </>
    )
}
