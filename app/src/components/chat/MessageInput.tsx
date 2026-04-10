'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  return (
    <div className="relative px-3 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-zinc-950/85 via-zinc-950/45 to-transparent"
      />
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full items-end gap-3 rounded-3xl border border-zinc-800/90 bg-transparent px-4 py-2.5 shadow-[0_14px_45px_-24px_rgba(0,0,0,0.85)] sm:gap-4 sm:px-5"
      >
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          disabled={disabled}
          className="flex-1 min-h-6 max-h-32 resize-none border-0 bg-transparent px-1 py-2.5 text-zinc-50 leading-5 placeholder:text-zinc-500 shadow-none focus-visible:border-0 focus-visible:ring-0"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="h-10 w-10 shrink-0 rounded-full bg-emerald-500 text-white shadow-[0_10px_20px_-12px_rgba(16,185,129,0.85)] transition-transform hover:scale-[1.02] hover:bg-emerald-400"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
