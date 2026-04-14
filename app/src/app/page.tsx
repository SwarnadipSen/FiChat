'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAuth();
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/chat');
      } else {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="text-zinc-400">Loading...</div>
    </div>
  );
}
