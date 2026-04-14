'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { roomAPI } from '@/lib/apiService';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function JoinRoomDialog({
  open,
  onOpenChange,
  onSuccess,
}: JoinRoomDialogProps) {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    setIsLoading(true);

    try {
      const data = await roomAPI.joinRoom(roomCode.trim().toUpperCase());
      
      toast.success(`Joined room "${data.room.name}"`);

      setRoomCode('');
      onOpenChange(false);
      onSuccess();
      
      // Navigate to the room
      router.push(`/chat/${data.room.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to join room'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter the 6-character room code to join an existing room.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomCode" className="text-sm font-medium">
              Room Code
            </label>
            <Input
              id="roomCode"
              placeholder="e.g., ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={6}
              className="bg-zinc-800 border-zinc-700 text-zinc-50 placeholder:text-zinc-500 uppercase"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="bg-zinc-800 border-zinc-700 text-zinc-50 hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Room'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
