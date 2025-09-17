
import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

export const initializeStoreData = async (centerId: string): Promise<void> => {
  const storeRef = ref(db, `centers/${centerId}/store`);
  const snapshot = await get(storeRef);

  if (!snapshot.exists()) {
    const initialData = {
      settings: {
        isOpen: false,
        currency: '$',
        managers: {},
      },
      products: {},
      reservations: {},
    };
    await set(storeRef, initialData);
  } else {
    // Ensure nested properties exist to prevent runtime errors
    const data = snapshot.val();
    if (!data.settings) {
        await set(ref(db, `centers/${centerId}/store/settings`), {
             isOpen: false,
             currency: '$',
             managers: {},
        });
    }
     if (!data.products) {
        await set(ref(db, `centers/${centerId}/store/products`), {});
    }
     if (!data.reservations) {
        await set(ref(db, `centers/${centerId}/store/reservations`), {});
    }
  }
};
