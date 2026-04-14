'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/apiService';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import { Loader2, Lock, MessageCircle, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authAPI.login(username, password);
      setAuth(data.user, data.token);
      
      toast.success('Logged in successfully');
      
      router.push('/chat');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Invalid credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_-20%,rgba(92,24,140,0.28),transparent_45%),linear-gradient(180deg,#020203_0%,#03040a_55%,#020203_100%)] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-25" />
        <div className="absolute -left-32 top-1/2 h-[20rem] w-[45rem] -translate-y-1/2 rotate-[8deg] bg-[linear-gradient(90deg,transparent_0%,rgba(168,85,247,0.34)_35%,rgba(37,99,235,0.3)_65%,transparent_100%)] blur-3xl" />
        <div className="absolute -right-40 top-1/2 h-[20rem] w-[45rem] -translate-y-1/2 -rotate-[10deg] bg-[linear-gradient(90deg,transparent_0%,rgba(37,99,235,0.3)_35%,rgba(192,38,211,0.34)_65%,transparent_100%)] blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.22)_0%,rgba(168,85,247,0.12)_42%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.55)_78%)]" />
      </div>

      <Card className="relative w-full max-w-md border border-white/10 bg-zinc-950/85 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <CardHeader className="space-y-4 p-7 pb-4 sm:p-8 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <MessageCircle className="h-5 w-5 text-violet-200" />
            </div>
            <p className="text-sm font-semibold tracking-[0.18em] text-violet-200/90">FICHAT</p>
          </div>
          <CardTitle className="text-[2rem] font-semibold leading-tight tracking-tight text-white">Welcome back</CardTitle>
          <CardDescription className="text-zinc-300/80">Sign in to continue.</CardDescription>
        </CardHeader>

        <CardContent className="p-7 pt-2 sm:p-8 sm:pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-100">
                Username
              </label>
              <div className="group flex items-center rounded-xl border border-white/15 bg-white/5 px-3 ring-violet-400/35 transition focus-within:border-violet-300/60 focus-within:ring-2">
                <User className="mr-2 h-4 w-4 text-zinc-400 group-focus-within:text-violet-200" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-12 border-0 bg-transparent px-0 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-100">
                Password
              </label>
              <div className="group flex items-center rounded-xl border border-white/15 bg-white/5 px-3 ring-violet-400/35 transition focus-within:border-violet-300/60 focus-within:ring-2">
                <Lock className="mr-2 h-4 w-4 text-zinc-400 group-focus-within:text-violet-200" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 border-0 bg-transparent px-0 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 text-base font-semibold text-white shadow-lg shadow-black/40 transition hover:from-zinc-600 hover:via-zinc-500 hover:to-zinc-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
