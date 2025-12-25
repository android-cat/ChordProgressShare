/**
 * トップページ
 * 
 * - 検索・閲覧タブ: コード進行の検索と一覧表示
 * - 新規投稿タブ: コード進行の投稿フォーム
 */

"use client"

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressionCard } from '@/components/ProgressionCard'
import { ProgressionForm } from '@/components/ProgressionForm'
import { useToast } from '@/components/ui/use-toast'
import { Search, Plus, Music } from 'lucide-react'
import { fetchProgressions, createProgression, type Progression, type ProgressionCreate } from '@/lib/api'

export default function HomePage() {
  const [progressions, setProgressions] = useState<Progression[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [chordQuery, setChordQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('browse')
  const { toast } = useToast()

  const loadProgressions = async () => {
    try {
      setIsLoading(true)
      const data = await fetchProgressions(searchQuery || undefined, chordQuery || undefined)
      setProgressions(data)
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

  useEffect(() => {
    loadProgressions()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadProgressions()
  }

  const handleSubmit = async (data: ProgressionCreate) => {
    try {
      setIsSubmitting(true)
      await createProgression(data)
      toast({
        title: '投稿完了',
        description: '投稿が完了しました。管理者の承認後に公開されます。'
      })
      setActiveTab('browse')
    } catch (error: any) {
      toast({
        title: 'エラー',
        description: error.message || '投稿に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Music className="h-8 w-8" />
          コード進行共有サイト
        </h1>
        <p className="text-muted-foreground">
          度数（ディグリーネーム）によるコード進行を投稿・共有・検索できるプラットフォーム
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">
            <Search className="h-4 w-4 mr-2" /> 検索・閲覧
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" /> 新規投稿
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* 検索フォーム */}
          <Card>
            <CardHeader>
              <CardTitle>検索</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      名称・備考で検索
                    </label>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="例: 王道進行"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      コード進行で検索
                    </label>
                    <Input
                      value={chordQuery}
                      onChange={(e) => setChordQuery(e.target.value)}
                      placeholder="例: IV|V|IIIm|VIm"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Search className="h-4 w-4 mr-2" /> 検索
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 検索結果 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {searchQuery || chordQuery ? '検索結果' : 'コード進行一覧'}
              <span className="text-muted-foreground text-sm ml-2">
                ({progressions.length}件)
              </span>
            </h2>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                読み込み中...
              </div>
            ) : progressions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                コード進行が見つかりませんでした
              </div>
            ) : (
              <div className="space-y-4">
                {progressions.map((progression) => (
                  <ProgressionCard key={progression.id} progression={progression} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <ProgressionForm onSubmit={handleSubmit} isLoading={isSubmitting} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
