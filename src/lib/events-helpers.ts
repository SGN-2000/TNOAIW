import { ref, get, set, child } from 'firebase/database';
import { db } from './firebase';

export const initializeEventsData = async (centerId: string): Promise<void> => {
  const eventsRef = ref(db, `centers/${centerId}/events`);
  const snapshot = await get(eventsRef);

  if (!snapshot.exists()) {
    const initialData = {
      permissions: {
        managers: {},
      },
      events: {},
    };
    await set(eventsRef, initialData);
  } else {
    const data = snapshot.val();
    if (!data.permissions) {
      await set(ref(db, `centers/${centerId}/events/permissions`), { managers: {} });
    }
    if (!data.events) {
      await set(ref(db, `centers/${centerId}/events/events`), {});
    }
  }
};

export const getCenterMembers = async (centerId: string) => {
    const centerRef = ref(db, `centers/${centerId}`);
    const snapshot = await get(centerRef);
    if (!snapshot.exists()) return [];

    const centerData = snapshot.val();
    const allMemberIds = [
        centerData.ownerId,
        ...Object.keys(centerData.members.admins || {}),
        ...Object.keys(centerData.members.adminsPlus || {}),
        ...Object.keys(centerData.members.students || {}),
    ];
    const uniqueMemberIds = [...new Set(allMemberIds)];

    const memberPromises = uniqueMemberIds.map(async (uid) => {
        const userProfileSnap = await get(child(ref(db), `users/${uid}`));
        if (userProfileSnap.exists()) {
            const userProfile = userProfileSnap.val();
            return {
                id: uid,
                profile: {
                    username: userProfile.username || 'N/A',
                    name: userProfile.name || '',
                    surname: userProfile.surname || '',
                },
            };
        }
        return null;
    });

    const resolvedMembers = (await Promise.all(memberPromises)).filter(Boolean);
    return resolvedMembers as { id: string, profile: { name: string, surname: string, username: string } }[];
};
