import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

export const initializeAnonymousChatData = async (centerId: string): Promise<void> => {
  const anonymousChatRef = ref(db, `centers/${centerId}/anonymousChats`);
  const snapshot = await get(anonymousChatRef);

  if (!snapshot.exists()) {
    const initialData = {
      permissions: {
        moderators: {},
      },
      chats: {},
    };
    await set(anonymousChatRef, initialData);
  } else {
    const data = snapshot.val();
    if (!data.permissions) {
      await set(ref(db, `centers/${centerId}/anonymousChats/permissions`), { moderators: {} });
    }
    if (!data.chats) {
      await set(ref(db, `centers/${centerId}/anonymousChats/chats`), {});
    }
  }
};
