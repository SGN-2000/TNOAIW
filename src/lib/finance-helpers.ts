
import { ref, get, set, child } from 'firebase/database';
import { db } from './firebase';

// Default categories for new finance modules
const defaultCategories = [
  { id: "eventos", name: "Eventos" },
  { id: "materiales", name: "Materiales y Suministros" },
  { id: "comida_bebida", name: "Comida y Bebida" },
  { id: "marketing", name: "Marketing y Difusión" },
  { id: "transporte", name: "Transporte" },
  { id: "donaciones", name: "Donaciones" },
  { id: "cuotas", name: "Cuotas Sociales" },
  { id: "tienda", name: "Tienda" },
  { id: "varios", name: "Varios" },
];

/**
 * Initializes the finance data for a center if it doesn't exist.
 * This ensures that the basic structure, permissions, and default categories are in place.
 * @param centerId - The ID of the student center.
 */
export const initializeFinanceData = async (centerId: string): Promise<void> => {
  const financeRef = ref(db, `centers/${centerId}/finances`);
  const snapshot = await get(financeRef);

  if (!snapshot.exists()) {
    const initialData = {
      permissions: {
        publicVisibility: true, // Default to public
        managers: {},
      },
      categories: defaultCategories,
      transactions: {},
    };
    await set(financeRef, initialData);
  } else {
     // Check if 'Tienda' category exists, if not, add it.
    const categoriesRef = child(financeRef, 'categories');
    const categoriesSnapshot = await get(categoriesRef);
    const categoriesVal = categoriesSnapshot.val();
    const existingCategories = categoriesVal ? Object.values(categoriesVal) : [];
    const tiendaExists = existingCategories.some((cat: any) => cat.id === 'tienda');
    if (!tiendaExists) {
        existingCategories.push({ id: 'tienda', name: 'Tienda' });
        await set(categoriesRef, existingCategories);
    }
  }
};
