/**
 * コード進行詳細ページ
 * 
 * 個別のコード進行を表示。
 * - 詳細情報の表示
 * - 試聴機能
 * - 編集リクエスト機能
 */

"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProgressionCard } from '@/components/ProgressionCard'
import { ProgressionForm } from '@/components/ProgressionForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft } from 'lucide-react'
import { fetchProgression, requestEdit, type Progression, type ProgressionCreate } from '@/lib/api'

export default function ProgressionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [progression, setProgression] = useState<Progression | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadProgression = async () => {
      try {
        setIsLoading(true)
        const data = await fetchProgression(params.id as string)
        setProgression(data)
      } catch (error) {
        toast({
          title: 'エラー',
          description: 'コード進行の読み込みに失敗しました',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadProgression()
    }
  }, [params.id])

  const handleEditSubmit = async (data: ProgressionCreate) => {
    if (!progression) return
    
    try {
      setIsSubmitting(true)
      await requestEdit(progression.id, data)
      toast({
        title: '編集リクエスト完了',
        description: '編集リクエストが送信されました。管理者の承認後に反映されます。'
      })
      setShowEditDialog(false)
    } catch (error: any) {
      toast({
        title: 'エラー',
        description: error.message || '編集リクエストに失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  if (!progression) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">コード進行が見つかりませんでした</p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> トップへ戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push('/')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> 戻る
      </Button>

      <ProgressionCard
        progression={progression}
        showDetail={true}
        onEdit={() => setShowEditDialog(true)}
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編集をリクエスト</DialogTitle>
          </DialogHeader>
          <ProgressionForm
            initialData={{
              title: progression.title,
              remarks: progression.remarks || '',
              patterns: progression.patterns.map(p => ({
                label: p.label,
                chords: p.chords
              })),
              songs: progression.songs.map(s => ({
                name: s.name,
                artist: s.artist || '',
                youtube_url: s.youtube_url || '',
                spotify_url: s.spotify_url || '',
                apple_music_url: s.apple_music_url || ''
              }))
            }}
            onSubmit={handleEditSubmit}
            submitLabel="編集をリクエスト"
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
