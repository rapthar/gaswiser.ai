'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HiOutlinePaperAirplane, HiOutlineUser } from 'react-icons/hi2';
import { RiRobotLine } from 'react-icons/ri';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  planId: string;
  initialMessages?: Message[];
}

export function ChatPanel({ planId, initialMessages = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setStreaming(true);

    let assistantMsg = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      for await (const chunk of apiClient.streamChat(planId, text)) {
        assistantMsg += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantMsg };
          return next;
        });
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Ask me anything about your fuel plan, route, or savings.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <RiRobotLine className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-bl-sm'
              }`}
            >
              {m.content || (streaming && m.role === 'assistant' ? (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                </span>
              ) : '')}
            </div>
            {m.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineUser className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4">
        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your plan…"
            disabled={streaming}
          />
          <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
            <HiOutlinePaperAirplane className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
