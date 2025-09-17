
export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
}

export interface Reservation {
    id: string;
    userId: string;
    userName: string;
    productId: string;
    productName: string;
    quantity: number;
    status: 'pending' | 'completed' | 'canceled';
    reservedAt: string;
    expiresAt: string;
}

export interface StoreSettings {
    isOpen: boolean;
    currency: string;
    managers: { [userId: string]: true };
}

export interface StoreData {
    settings: StoreSettings;
    products: { [productId: string]: Product };
    reservations: { [reservationId: string]: Reservation };
}

export type Role = 'owner' | 'manager' | 'student';

export interface Manager {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'admin-plus';
}
