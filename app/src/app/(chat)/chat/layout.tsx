'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, initAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mobileSidebarHistoryPushedRef = useRef(false);

  const isRoomRoute = useMemo(() => Boolean(pathname?.match(/^\/chat\/[^/]+$/)), [pathname]);
  const showMobileSidebar = isMobile && (!isRoomRoute || isMobileSidebarOpen);

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
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => {
      setIsMobile(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => {
      mediaQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handlePopState = () => {
      setIsMobileSidebarOpen(false);
      mobileSidebarHistoryPushedRef.current = false;
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobile]);

  const openMobileSidebar = () => {
    if (!isMobile || showMobileSidebar) {
      return;
    }

    window.history.pushState({ __mobileSidebar: true }, '', window.location.href);
    mobileSidebarHistoryPushedRef.current = true;
    setIsMobileSidebarOpen(true);
  };

  const closeMobileSidebar = () => {
    if (mobileSidebarHistoryPushedRef.current) {
      window.history.back();
      return;
    }

    setIsMobileSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="hidden h-screen md:block">
        <ResizablePanelGroup orientation="horizontal" className="h-screen bg-zinc-950">
          <ResizablePanel defaultSize="18%" minSize="16%" maxSize="38%">
            <ChatSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-zinc-800/80 hover:bg-zinc-700" />
          <ResizablePanel defaultSize="76%" minSize="62%">
            <main className="flex h-full flex-col">{children}</main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="relative h-screen bg-zinc-950 md:hidden">
        <main className="flex h-full flex-col">{children}</main>

        {isRoomRoute && !isMobileSidebarOpen && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-3 top-3 z-40 h-10 w-10 rounded-xl bg-zinc-900/90 text-zinc-100 backdrop-blur transition-colors hover:bg-zinc-800"
            onClick={openMobileSidebar}
            aria-label="Open chat sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div
          className={`absolute inset-0 z-50 transition-opacity duration-300 ${
            showMobileSidebar ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
          <div
            className={`relative h-full w-full transition-transform duration-300 ease-out ${
              showMobileSidebar ? 'translate-x-0' : '-translate-x-6'
            }`}
          >
            <ChatSidebar onClose={closeMobileSidebar} onRoomSelect={closeMobileSidebar} />
          </div>
        </div>
      </div>
    </>
  );
}
