"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { createFeedback } from '@/lib/api';
import { MessageSquare } from 'lucide-react';

export function FeedbackForm() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createFeedback(content);
      toast({
        title: "送信しました",
        description: "貴重なご意見ありがとうございます。",
      });
      setContent('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to send feedback:', error);
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: "送信に失敗しました。後でもう一度お試しください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <MessageSquare className="mr-2 h-4 w-4" />
          ご意見・ご感想
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ご意見・ご感想</DialogTitle>
          <DialogDescription>
            サイトの改善要望やバグ報告など、お気軽にお送りください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="ここに内容を入力してください..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '送信中...' : '送信する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
