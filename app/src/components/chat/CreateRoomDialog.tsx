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

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateRoomDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsLoading(true);

    try {
      const data = await roomAPI.createRoom(roomName.trim());
      
      toast.success(`Room "${data.room.name}" created with code: ${data.room.code}`);

      setRoomName('');
      onOpenChange(false);
      onSuccess();
      
      // Navigate to the new room
      router.push(`/chat/${data.room.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create room'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter a name for your new chat room. A unique code will be generated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomName" className="text-sm font-medium">
              Room Name
            </label>
            <Input
              id="roomName"
              placeholder="e.g., General Discussion"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              disabled={isLoading}
              className="bg-zinc-800 border-zinc-700 text-zinc-50 placeholder:text-zinc-500"
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
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
