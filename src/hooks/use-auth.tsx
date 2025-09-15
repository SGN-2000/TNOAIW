"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signInWithPopup, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profileComplete: boolean | null;
  hasUnreadNews: boolean;
  hasUnreadNotifications: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [hasUnreadNews, setHasUnreadNews] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      let profileListener: any = null;
      let newsListener: any = null;
      let notificationsListener: any = null;

      if (currentUser) {
        const userProfileRef = ref(db, `users/${currentUser.uid}`);
        profileListener = onValue(userProfileRef, (snapshot) => {
          setProfileComplete(snapshot.exists() && snapshot.val().username);
        });

        const newsRef = ref(db, `news/${currentUser.uid}`);
        newsListener = onValue(newsRef, (snapshot) => {
            if (snapshot.exists()) {
                const newsItems = snapshot.val();
                const unread = Object.values(newsItems).some((item: any) => !item.read);
                setHasUnreadNews(unread);
            } else {
                setHasUnreadNews(false);
            }
        });
        
        const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
        notificationsListener = onValue(notificationsRef, (snapshot) => {
            if (snapshot.exists()) {
                const notifItems = snapshot.val();
                const unread = Object.values(notifItems).some((item: any) => !item.read);
                setHasUnreadNotifications(unread);
            } else {
                setHasUnreadNotifications(false);
            }
            setLoading(false); 
        }, (error) => {
             console.error("Failed to listen for notifications:", error);
             setHasUnreadNotifications(false);
             setLoading(false);
        });

      } else {
        setProfileComplete(null);
        setHasUnreadNews(false);
        setHasUnreadNotifications(false);
        setLoading(false);
      }
      
      return () => {
          if (profileListener && currentUser) {
            off(ref(db, `users/${currentUser.uid}`), 'value', profileListener);
          }
          if (newsListener && currentUser) {
            off(ref(db, `news/${currentUser.uid}`), 'value', newsListener);
          }
          if (notificationsListener && currentUser) {
            off(ref(db, `notifications/${currentUser.uid}`), 'value', notificationsListener);
          }
      };
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Don't log the "cancelled-popup-request" error to the console
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error("Error signing in with Google: ", error);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const value = { user, loading, profileComplete, hasUnreadNews, hasUnreadNotifications, signInWithGoogle, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
