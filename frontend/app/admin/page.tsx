/**
 * 管理者画面
 * 
 * パスワード認証後に以下の機能を提供:
 * - 承認待ち投稿の管理（承認/却下）
 * - 編集リクエストの差分表示
 * - IPアドレスブロック管理
 */

"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Check, X, Eye, Shield, Trash2, Plus } from 'lucide-react'
import {
  fetchPendingProgressions,
  fetchDiff,
  processPending,
  fetchBlockedIPs,
  blockIP,
  unblockIP,
  type Progression,
  type DiffResponse,
  type BlockedIP
} from '@/lib/api'

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingList, setPendingList] = useState<Progression[]>([])
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDiff, setSelectedDiff] = useState<DiffResponse | null>(null)
  const [showDiffDialog, setShowDiffDialog] = useState(false)
  const [newBlockIP, setNewBlockIP] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      await fetchPendingProgressions(adminPassword)
      setIsAuthenticated(true)
      loadData()
    } catch (error: any) {
      toast({
        title: 'エラー',
        description: error.message || '認証に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [pending, blocked] = await Promise.all([
        fetchPendingProgressions(adminPassword),
        fetchBlockedIPs(adminPassword)
      ])
      setPendingList(pending)
      setBlockedIPs(blocked)
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'データの読み込みに失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDiff = async (id: string) => {
    try {
      const diff = await fetchDiff(id, adminPassword)
      setSelectedDiff(diff)
      setShowDiffDialog(true)
    } catch (error) {
      toast({
        title: 'エラー',
        description: '差分の取得に失敗しました',
        variant: 'destructive'
      })
    }
  }

  const handleProcess = async (id: string, action: 'approve' | 'reject') => {
    try {
      await processPending(id, action, adminPassword)
      toast({
        title: '完了',
        description: action === 'approve' ? '承認しました' : '却下しました'
      })
      loadData()
      setShowDiffDialog(false)
    } catch (error) {
      toast({
        title: 'エラー',
        description: '処理に失敗しました',
        variant: 'destructive'
      })
    }
  }

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBlockIP) return
    
    try {
      await blockIP(newBlockIP, newBlockReason, adminPassword)
      toast({
        title: '完了',
        description: 'IPアドレスをブロックしました'
      })
      setNewBlockIP('')
      setNewBlockReason('')
      loadData()
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ブロックに失敗しました',
        variant: 'destructive'
      })
    }
  }

  const handleUnblockIP = async (id: string) => {
    try {
      await unblockIP(id, adminPassword)
      toast({
        title: '完了',
        description: 'ブロックを解除しました'
      })
      loadData()
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ブロック解除に失敗しました',
        variant: 'destructive'
      })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> 管理者ログイン
            </CardTitle>
            <CardDescription>
              管理者パスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> 管理者画面
        </h1>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          ログアウト
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            承認待ち ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="blocked">
            ブロックIP ({blockedIPs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              読み込み中...
            </div>
          ) : pendingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              承認待ちの投稿はありません
            </div>
          ) : (
            pendingList.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>
                        {item.original_id ? '編集リクエスト' : '新規投稿'}
                        {' - '}
                        {new Date(item.created_at).toLocaleString('ja-JP')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDiff(item.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> 詳細
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleProcess(item.id, 'approve')}
                      >
                        <Check className="h-4 w-4 mr-1" /> 承認
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleProcess(item.id, 'reject')}
                      >
                        <X className="h-4 w-4 mr-1" /> 却下
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.remarks && (
                    <p className="text-sm text-muted-foreground mb-2">{item.remarks}</p>
                  )}
                  <div className="space-y-2">
                    {item.patterns.map((pattern, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{pattern.label}: </span>
                        <span className="text-muted-foreground">
                          {pattern.chords.filter(Boolean).join(' - ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IPアドレスをブロック</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBlockIP} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>IPアドレス</Label>
                    <Input
                      value={newBlockIP}
                      onChange={(e) => setNewBlockIP(e.target.value)}
                      placeholder="192.168.1.1"
                      required
                    />
                  </div>
                  <div>
                    <Label>理由</Label>
                    <Input
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                      placeholder="スパム投稿"
                    />
                  </div>
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" /> ブロック追加
                </Button>
              </form>
            </CardContent>
          </Card>

          {blockedIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ブロック中のIPアドレスはありません
            </div>
          ) : (
            <div className="space-y-2">
              {blockedIPs.map((ip) => (
                <Card key={ip.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <span className="font-mono">{ip.ip_address}</span>
                      {ip.reason && (
                        <span className="text-muted-foreground ml-2">- {ip.reason}</span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(ip.blocked_at).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblockIP(ip.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> 解除
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 差分ダイアログ */}
      <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDiff?.original ? '編集リクエストの差分' : '新規投稿の詳細'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDiff && (
            <div className="space-y-4">
              {selectedDiff.original && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2 text-red-600">変更前</h3>
                    <Card className="border-red-200">
                      <CardContent className="pt-4">
                        <p className="font-medium">{selectedDiff.original.title}</p>
                        <p className="text-sm text-muted-foreground">{selectedDiff.original.remarks}</p>
                        {selectedDiff.original.patterns.map((p, i) => (
                          <div key={i} className="text-sm mt-2">
                            <span className="font-medium">{p.label}: </span>
                            {p.chords.filter(Boolean).join(' - ')}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 text-green-600">変更後</h3>
                    <Card className="border-green-200">
                      <CardContent className="pt-4">
                        <p className="font-medium">{selectedDiff.updated.title}</p>
                        <p className="text-sm text-muted-foreground">{selectedDiff.updated.remarks}</p>
                        {selectedDiff.updated.patterns.map((p, i) => (
                          <div key={i} className="text-sm mt-2">
                            <span className="font-medium">{p.label}: </span>
                            {p.chords.filter(Boolean).join(' - ')}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!selectedDiff.original && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="font-medium text-lg">{selectedDiff.updated.title}</p>
                    <p className="text-muted-foreground">{selectedDiff.updated.remarks}</p>
                    <div className="mt-4 space-y-2">
                      {selectedDiff.updated.patterns.map((p, i) => (
                        <div key={i}>
                          <span className="font-medium">{p.label}: </span>
                          <div className="grid grid-cols-8 gap-1 mt-1">
                            {p.chords.map((c, ci) => (
                              <div key={ci} className={`p-2 text-center text-sm border rounded ${c ? 'bg-muted' : ''}`}>
                                {c || '-'}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedDiff.updated.songs.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium">使用楽曲</h4>
                        {selectedDiff.updated.songs.map((s, i) => (
                          <div key={i} className="text-sm">
                            {s.name} {s.artist && `- ${s.artist}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDiffDialog(false)}
            >
              閉じる
            </Button>
            {selectedDiff && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleProcess(selectedDiff.updated.id, 'reject')}
                >
                  <X className="h-4 w-4 mr-1" /> 却下
                </Button>
                <Button
                  onClick={() => handleProcess(selectedDiff.updated.id, 'approve')}
                >
                  <Check className="h-4 w-4 mr-1" /> 承認
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
