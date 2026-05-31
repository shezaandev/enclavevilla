import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  updateAdminDisplayName: (name: string) => Promise<void>;
  updateAdminPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateAdminEmail: (currentPassword: string, newEmail: string) => Promise<void>;
  sendAdminVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Check Firestore admins collection by UID — works regardless of email
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const updateAdminDisplayName = async (name: string) => {
    if (!auth.currentUser) throw new Error('No user is currently logged in.');
    await updateProfile(auth.currentUser, { displayName: name });
    setUser({ ...auth.currentUser });
  };

  const updateAdminPassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email)
      throw new Error('No authenticated user or email address found.');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
    setUser({ ...auth.currentUser });
  };

  const updateAdminEmail = async (currentPassword: string, newEmail: string) => {
    if (!auth.currentUser || !auth.currentUser.email)
      throw new Error('No authenticated user or email address found.');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
    setUser({ ...auth.currentUser });
  };

  const sendAdminVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('No user is currently logged in.');
    await sendEmailVerification(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      logout,
      updateAdminDisplayName,
      updateAdminPassword,
      updateAdminEmail,
      sendAdminVerificationEmail
    }}>
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