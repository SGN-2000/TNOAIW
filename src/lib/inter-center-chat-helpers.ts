import { ref, get, set, child, update, push } from 'firebase/database';
import { db } from './firebase';
import type { Chat } from '@/components/center/inter-center-chat/types';


export const initializeInterCenterChat = async (centerId: string): Promise<void> => {
  const chatRef = ref(db, `centers/${centerId}/interCenterChat`);
  const snapshot = await get(chatRef);

  if (!snapshot.exists()) {
    const initialData = {
      permissions: {
        exchangeGroup: {},
      },
    };
    await set(chatRef, initialData);
  } else {
    const data = snapshot.val();
    if (!data.permissions) {
      await set(ref(db, `centers/${centerId}/interCenterChat/permissions`), { exchangeGroup: {} });
    }
  }
};

export const createDirectChat = async (currentCenterId: string, currentCenterName: string, targetCenterId: string, targetCenterName: string): Promise<Chat> => {
    const currentCenterSnap = await get(child(ref(db, 'centers'), currentCenterId));
    const targetCenterSnap = await get(child(ref(db, 'centers'), targetCenterId));
    if(!currentCenterSnap.exists() || !targetCenterSnap.exists()) {
        throw new Error("Uno o ambos centros no existen.");
    }
    const currentCenterOwnerId = currentCenterSnap.val().ownerId;
    const targetCenterOwnerId = targetCenterSnap.val().ownerId;

    const chatQueryRef = ref(db, 'interCenterChats');
    const allChatsSnap = await get(chatQueryRef);

    if (allChatsSnap.exists()) {
        const allChats = allChatsSnap.val();
        for (const chatId in allChats) {
            const chat = allChats[chatId];
            if (chat.type === 'direct' && chat.members[currentCenterId] && chat.members[targetCenterId]) {
                return chat as Chat; 
            }
        }
    }

    const newChatRef = push(chatQueryRef);
    const chatId = newChatRef.key!;

    const newChat: Chat = {
        id: chatId,
        type: 'direct',
        members: {
            [currentCenterId]: true,
            [targetCenterId]: true,
        },
        admins: {},
        createdAt: new Date().toISOString(),
        createdBy: currentCenterId,
        messages: {},
        lastMessage: {
            text: `Chat iniciado entre ${currentCenterName} y ${targetCenterName}.`,
            senderId: "system",
            timestamp: new Date().toISOString()
        }
    };
    
    await set(newChatRef, newChat);

    const updates: { [key: string]: boolean } = {};
    const currentUserSnap = await get(ref(db, `centers/${currentCenterId}`));
    const targetUserSnap = await get(ref(db, `centers/${targetCenterId}`));
    const currentUserOwnerId = currentUserSnap.val().ownerId;
    const targetUserOwnerId = targetUserSnap.val().ownerId;
    updates[`/userInterCenterChats/${currentUserOwnerId}/${chatId}`] = true;
    updates[`/userInterCenterChats/${targetUserOwnerId}/${chatId}`] = true;
    await update(ref(db), updates);
    
    return newChat;
};

export const createGroupChat = async (creatorCenterId: string, name: string, membersToInvite: string[]): Promise<Chat> => {
    const newChatRef = push(ref(db, 'interCenterChats'));
    const chatId = newChatRef.key!;

    const creatorCenterSnap = await get(child(ref(db, 'centers'), creatorCenterId));
    if(!creatorCenterSnap.exists()) throw new Error("El centro creador no existe.");
    const creatorData = creatorCenterSnap.val();
    const creatorOwnerId = creatorData.ownerId;


    const newChat: Chat = {
        id: chatId,
        name: name,
        type: 'group',
        members: {
            [creatorCenterId]: true
        },
        admins: { [creatorCenterId]: true },
        createdAt: new Date().toISOString(),
        createdBy: creatorCenterId,
        messages: {},
        lastMessage: {
            text: `Grupo "${name}" creado. Esperando a los miembros...`,
            senderId: "system",
            timestamp: new Date().toISOString()
        }
    };

    await set(newChatRef, newChat);

    await update(ref(db), { [`/userInterCenterChats/${creatorOwnerId}/${chatId}`]: true });

    const notificationPromises = membersToInvite.map(async (centerId) => {
        const centerSnap = await get(child(ref(db, 'centers'), centerId));
        if (centerSnap.exists()) {
            const ownerId = centerSnap.val().ownerId;
            const notifRef = push(ref(db, `notifications/${ownerId}`));
            await set(notifRef, {
                type: 'GROUP_INVITE',
                centerId: centerId, 
                centerName: creatorData.centerName,
                subjectUserId: chatId, 
                subjectUserName: name, 
                timestamp: new Date().toISOString(),
                read: false,
            });
        }
    });

    await Promise.all(notificationPromises);

    return newChat;
};
