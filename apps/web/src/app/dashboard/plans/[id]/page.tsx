'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { PlanResult } from '@/components/features/PlanResult';
import { ChatPanel } from '@/components/features/ChatPanel';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HiOutlineArrowLeft, HiOutlineTrash, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { RiGasStationLine } from 'react-icons/ri';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Props {
  params: { id: string };
}

export default function PlanDetailPage({ params }: Props) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => apiClient.getPlan(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deletePlan(id),
    onSuccess: () => {
      toast.success('Plan deleted');
      qc.invalidateQueries({ queryKey: ['plans'] });
      router.push('/dashboard/plans');
    },
    onError: () => toast.error('Failed to delete plan'),
  });

  const { data: chatData } = useQuery({
    queryKey: ['chat', id],
    queryFn: () => apiClient.getChatHistory(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Plan not found.{' '}
        <Link href="/dashboard/plans" className="text-primary hover:underline">
          Back to plans
        </Link>
      </div>
    );
  }

  const history = (chatData?.messages ?? []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/plans" className="text-muted-foreground hover:text-foreground">
            <HiOutlineArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-xl font-semibold">Fuel Plan</h2>
            <p className="text-xs text-muted-foreground">
              {new Date(plan.generated_at ?? '').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        >
          <HiOutlineTrash className="h-4 w-4" />
          Delete
        </button>
      </div>

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <RiGasStationLine className="h-3.5 w-3.5" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
            Ask AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <PlanResult plan={plan} />
        </TabsContent>

        <TabsContent value="chat">
          <Card className="h-[500px] flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                Ask about your plan
              </CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-hidden">
              <ChatPanel planId={id} initialMessages={history} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
