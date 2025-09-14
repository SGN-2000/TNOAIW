
import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

export const initializeForumData = async (centerId: string): Promise<void> => {
  const forumRef = ref(db, `centers/${centerId}/forums`);
  const snapshot = await get(forumRef);

  if (!snapshot.exists()) {
    const initialData = {
      'general': {
        id: 'general',
        name: 'Foro General',
        description: 'Un espacio para todos los miembros del centro.',
        messages: {},
        lastRead: {},
      },
      'admins': {
        id: 'admins',
        name: 'Equipo Administrativo',
        description: 'Coordinación entre Propietario, Admins Plus y Admins.',
        messages: {},
        lastRead: {},
      },
      'admins-plus': {
        id: 'admins-plus',
        name: 'Propietario y Admins Plus',
        description: 'Discusiones del más alto nivel administrativo.',
        messages: {},
        lastRead: {},
      }
    };
    await set(forumRef, initialData);
  }
};
