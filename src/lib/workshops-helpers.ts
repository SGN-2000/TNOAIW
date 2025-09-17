import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

export const initializeWorkshopsData = async (centerId: string): Promise<void> => {
  const workshopsRef = ref(db, `centers/${centerId}/workshops`);
  const snapshot = await get(workshopsRef);

  if (!snapshot.exists()) {
    const initialData = {
      permissions: {
        managers: {},
      },
      workshops: {},
    };
    await set(workshopsRef, initialData);
  } else {
    const data = snapshot.val();
    if (!data.permissions) {
      await set(ref(db, `centers/${centerId}/workshops/permissions`), { managers: {} });
    }
    if (!data.workshops) {
      await set(ref(db, `centers/${centerId}/workshops/workshops`), {});
    }
  }
};
