/**
 * トップページ
 * 
 * - 検索閲覧タブ: コード進行の検索と一覧表示
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
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative py-20 text-center space-y-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-grid-pattern opacity-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-background/50" />
        
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl text-primary">
            Share Your <span className="text-accent">Chord Progressions</span>
          </h1>
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
            コード進行を共有・検索。
          </p>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/50 backdrop-blur">
            <TabsTrigger value="browse" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Search className="h-4 w-4 mr-2" /> 検索・閲覧
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> 新規投稿
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="browse" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* 検索フォーム */}
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>検索条件</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr,1fr,auto]">
                <div className="space-y-2">
                  <Input
                    placeholder="キーワード検索 (例: J-Pop, 王道)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="コード進行検索 (例: IV-V-iii-vi)"
                    value={chordQuery}
                    onChange={(e) => setChordQuery(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90">
                  <Search className="h-4 w-4 mr-2" /> 検索
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 結果一覧 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">コード進行一覧</h2>
              <span className="text-sm text-muted-foreground">{progressions.length} 件の進行が見つかりました</span>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-[200px] animate-pulse bg-muted/50" />
                ))}
              </div>
            ) : progressions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {progressions.map((progression) => (
                  <ProgressionCard key={progression.id} progression={progression} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground">条件に一致するコード進行は見つかりませんでした</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>新規コード進行の投稿</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
