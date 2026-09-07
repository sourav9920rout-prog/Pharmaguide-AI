import { useState, useEffect } from 'react';

export type UserProfile = {
  name: string;
  age: string;
  sex: string;
  medications: string; // Stored as a single string initially for simplicity
};

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('pharma_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const saveProfile = (newProfile: UserProfile | null) => {
    setProfile(newProfile);
    if (newProfile) {
      localStorage.setItem('pharma_user_profile', JSON.stringify(newProfile));
    } else {
      localStorage.removeItem('pharma_user_profile');
    }
    // Dispatch event to sync state across other parts of the app
    window.dispatchEvent(new Event('user-profile-updated'));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('pharma_user_profile');
      setProfile(saved ? JSON.parse(saved) : null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-profile-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-profile-updated', handleStorageChange);
    };
  }, []);

  return { profile, saveProfile };
};
