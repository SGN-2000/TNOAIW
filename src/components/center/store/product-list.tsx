
"use client"

import ProductCard from './product-card';
import { Product, Role } from './types';
import { PackageSearch } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  currency: string;
  centerId: string;
  userRole: Role;
}

export default function ProductList({ products, currency, centerId, userRole }: ProductListProps) {

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <div className="flex justify-center items-center mb-4">
            <PackageSearch className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold">No hay productos en la tienda</h3>
        <p className="text-muted-foreground mt-2">
            Vuelve más tarde o, si eres gestor, añade un nuevo producto.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map(product => (
        <ProductCard 
            key={product.id} 
            product={product} 
            currency={currency}
            centerId={centerId}
            userRole={userRole}
        />
      ))}
    </div>
  );
}
