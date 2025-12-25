/**
 * コード進行投稿フォームコンポーネント
 * 
 * 新規投稿・編集リクエストの両方で使用。
 * - 基本情報（タイトル、備考）
 * - コードパターン（複数登録可能、各16枠）
 * - 使用楽曲（YouTube/Spotify/Apple Music URL）
 * - Tone.jsによる試聴機能
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ChordInput } from './ChordInput'
import { MeasureInput } from './MeasureInput'
import { Plus, Trash2, Play, Square, Music, Volume2, Activity } from 'lucide-react'
import { playChords, stopPlayback } from '@/lib/audio'
import type { Pattern, Song, ProgressionCreate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PatternInput {
  label: string
  chords: (string | null)[]
}

interface SongInput {
  name: string
  artist: string
  youtube_url: string
  spotify_url: string
  apple_music_url: string
}

interface ProgressionFormProps {
  initialData?: {
    title: string
    remarks: string
    patterns: PatternInput[]
    songs: SongInput[]
  }
  onSubmit: (data: ProgressionCreate) => Promise<void>
  submitLabel?: string
  isLoading?: boolean
}

const emptyPattern = (): PatternInput => ({
  label: '',
  chords: Array(16).fill(null)
})

const emptySong = (): SongInput => ({
  name: '',
  artist: '',
  youtube_url: '',
  spotify_url: '',
  apple_music_url: ''
})

export function ProgressionForm({ 
  initialData, 
  onSubmit, 
  submitLabel = '投稿する',
  isLoading = false 
}: ProgressionFormProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState(initialData?.title || '')
  const [remarks, setRemarks] = useState(initialData?.remarks || '')
  const [patterns, setPatterns] = useState<PatternInput[]>(
    initialData?.patterns?.length ? initialData.patterns : [{ ...emptyPattern(), label: '基本形' }]
  )
  const [songs, setSongs] = useState<SongInput[]>(initialData?.songs || [])
  const [playingPattern, setPlayingPattern] = useState<number | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number>(-1)
  const [bpm, setBpm] = useState<number>(120)
  const [volume, setVolume] = useState<number>(-6)
  
  // 各パターンの各小節について、後半を表示するかどうかの状態
  // patterns[patternIndex].chords[measureIndex*2+1] がnullでない場合は初期表示
  const [showSecondBeats, setShowSecondBeats] = useState<boolean[][]>(() => {
    return patterns.map(pattern => 
      Array.from({ length: 8 }).map((_, measureIndex) => 
        pattern.chords[measureIndex * 2 + 1] !== null
      )
    )
  })

  const updatePattern = (patternIndex: number, field: keyof PatternInput, value: any) => {
    const newPatterns = [...patterns]
    newPatterns[patternIndex] = { ...newPatterns[patternIndex], [field]: value }
    setPatterns(newPatterns)
  }

  const updateChord = (patternIndex: number, chordIndex: number, value: string | null) => {
    const newPatterns = [...patterns]
    const newChords = [...newPatterns[patternIndex].chords]
    newChords[chordIndex] = value
    newPatterns[patternIndex] = { ...newPatterns[patternIndex], chords: newChords }
    setPatterns(newPatterns)
  }

  const addPattern = () => {
    setPatterns([...patterns, { ...emptyPattern(), label: `パターン${patterns.length + 1}` }])
    setShowSecondBeats([...showSecondBeats, Array(8).fill(false)])
  }

  const removePattern = (index: number) => {
    if (patterns.length > 1) {
      setPatterns(patterns.filter((_, i) => i !== index))
      setShowSecondBeats(showSecondBeats.filter((_, i) => i !== index))
    }
  }
  
  const toggleSecondBeat = (patternIndex: number, measureIndex: number, show: boolean) => {
    const newShowSecondBeats = [...showSecondBeats]
    newShowSecondBeats[patternIndex] = [...newShowSecondBeats[patternIndex]]
    newShowSecondBeats[patternIndex][measureIndex] = show
    setShowSecondBeats(newShowSecondBeats)
    
    if (!show) {
      // 後半を非表示にする場合はnullに設定
      updateChord(patternIndex, measureIndex * 2 + 1, null)
    }
  }

  const updateSong = (songIndex: number, field: keyof SongInput, value: string) => {
    const newSongs = [...songs]
    newSongs[songIndex] = { ...newSongs[songIndex], [field]: value }
    setSongs(newSongs)
  }

  const addSong = () => {
    setSongs([...songs, emptySong()])
  }

  const removeSong = (index: number) => {
    setSongs(songs.filter((_, i) => i !== index))
  }

  const handlePlay = async (patternIndex: number) => {
    if (playingPattern === patternIndex) {
      stopPlayback()
      setPlayingPattern(null)
      setPlayingIndex(-1)
    } else {
      stopPlayback()
      setPlayingPattern(patternIndex)
      await playChords(patterns[patternIndex].chords, bpm, (index) => {
        setPlayingIndex(index)
        if (index === -1) {
          setPlayingPattern(null)
        }
      }, volume)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 楽曲タイトルがない場合にURLが入力されているかチェック
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i]
      const hasUrl = song.youtube_url || song.spotify_url || song.apple_music_url
      if (hasUrl && !song.name) {
        toast({
          title: 'バリデーションエラー',
          description: `楽曲 ${i + 1}: URLが入力されている場合は曲名も入力してください`,
          variant: 'destructive'
        })
        return
      }
    }
    
    const data: ProgressionCreate = {
      title,
      remarks: remarks || undefined,
      patterns: patterns.map(p => ({
        label: p.label,
        chords: p.chords
      })),
      songs: songs.filter(s => s.name).map(s => ({
        name: s.name,
        artist: s.artist || undefined,
        youtube_url: s.youtube_url || undefined,
        spotify_url: s.spotify_url || undefined,
        apple_music_url: s.apple_music_url || undefined
      }))
    }
    
    await onSubmit(data)
  }

  // YouTube埋め込みIDの抽出
  const getYoutubeEmbedId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    return match ? match[1] : null
  }

  // Spotify埋め込みIDの抽出
  const getSpotifyEmbedId = (url: string): string | null => {
    const match = url.match(/spotify\.com\/(?:track|album|playlist)\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">名称 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 王道進行"
              required
              className="bg-background/50"
            />
          </div>
          <div>
            <Label htmlFor="remarks">備考</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="コード進行についての説明や補足情報"
              rows={3}
              className="bg-background/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* パターン入力 */}
      {patterns.map((pattern, patternIndex) => (
        <Card key={patternIndex} className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={pattern.label}
                  onChange={(e) => updatePattern(patternIndex, 'label', e.target.value)}
                  placeholder="パターン名"
                  className="max-w-xs bg-background/50"
                />
                <Button
                  type="button"
                  variant={playingPattern === patternIndex ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => handlePlay(patternIndex)}
                >
                  {playingPattern === patternIndex ? (
                    <><Square className="h-4 w-4 mr-1" /> 停止</>
                  ) : (
                    <><Play className="h-4 w-4 mr-1" /> 再生</>
                  )}
                </Button>
              </div>
              {patterns.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePattern(patternIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50 mt-4">
              <div className="flex items-center gap-4">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Label htmlFor={`bpm-${patternIndex}`}>BPM</Label>
                    <span className="text-muted-foreground">{bpm}</span>
                  </div>
                  <input
                    id={`bpm-${patternIndex}`}
                    type="range"
                    min="60"
                    max="200"
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Label htmlFor={`volume-${patternIndex}`}>Volume</Label>
                    <span className="text-muted-foreground">{volume}dB</span>
                  </div>
                  <input
                    id={`volume-${patternIndex}`}
                    type="range"
                    min="-24"
                    max="0"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, measureIndex) => {
                const firstBeatIndex = measureIndex * 2
                const secondBeatIndex = measureIndex * 2 + 1
                const firstBeat = pattern.chords[firstBeatIndex]
                const secondBeat = pattern.chords[secondBeatIndex]
                const showSecond = showSecondBeats[patternIndex]?.[measureIndex] ?? false
                
                return (
                  <MeasureInput
                    key={measureIndex}
                    measureIndex={measureIndex}
                    firstBeatValue={firstBeat}
                    secondBeatValue={showSecond ? secondBeat : undefined}
                    onFirstBeatChange={(value) => updateChord(patternIndex, firstBeatIndex, value)}
                    onSecondBeatChange={(value) => updateChord(patternIndex, secondBeatIndex, value)}
                    onToggleSecondBeat={(show) => toggleSecondBeat(patternIndex, measureIndex, show)}
                    isFirstBeatPlaying={playingPattern === patternIndex && playingIndex === firstBeatIndex}
                    isSecondBeatPlaying={playingPattern === patternIndex && playingIndex === secondBeatIndex}
                  />
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              ※ デフォルトは1小節1コード。+ボタンで後半を追加できます（最大8小節）
            </p>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addPattern} className="w-full border-dashed border-2 py-6">
        <Plus className="h-4 w-4 mr-2" /> パターンを追加
      </Button>

      {/* 使用楽曲 */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> 使用楽曲
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {songs.map((song, songIndex) => (
            <div key={songIndex} className="border border-border/50 rounded-lg p-4 space-y-3 bg-background/30">
              <div className="flex items-center justify-between">
                <span className="font-medium">楽曲 {songIndex + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSong(songIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>曲名</Label>
                  <Input
                    value={song.name}
                    onChange={(e) => updateSong(songIndex, 'name', e.target.value)}
                    placeholder="曲名"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label>アーティスト</Label>
                  <Input
                    value={song.artist}
                    onChange={(e) => updateSong(songIndex, 'artist', e.target.value)}
                    placeholder="アーティスト名"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label>YouTube URL</Label>
                  <Input
                    value={song.youtube_url}
                    onChange={(e) => updateSong(songIndex, 'youtube_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label>Spotify URL</Label>
                  <Input
                    value={song.spotify_url}
                    onChange={(e) => updateSong(songIndex, 'spotify_url', e.target.value)}
                    placeholder="https://open.spotify.com/track/..."
                    className="bg-background/50"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Apple Music URL</Label>
                  <Input
                    value={song.apple_music_url}
                    onChange={(e) => updateSong(songIndex, 'apple_music_url', e.target.value)}
                    placeholder="https://music.apple.com/..."
                    className="bg-background/50"
                  />
                </div>
              </div>
              
              {/* プレビュー */}
              {song.youtube_url && getYoutubeEmbedId(song.youtube_url) && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">YouTube プレビュー</Label>
                  <iframe
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${getYoutubeEmbedId(song.youtube_url)}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg mt-1"
                  />
                </div>
              )}
              {song.spotify_url && getSpotifyEmbedId(song.spotify_url) && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Spotify プレビュー</Label>
                  <iframe
                    src={`https://open.spotify.com/embed/track/${getSpotifyEmbedId(song.spotify_url)}`}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="encrypted-media"
                    className="rounded-lg mt-1"
                  />
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addSong} className="w-full border-dashed border-2 py-6">
            <Plus className="h-4 w-4 mr-2" /> 楽曲を追加
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={isLoading || !title}>
        {isLoading ? '送信中...' : submitLabel}
      </Button>
      
      <p className="text-sm text-muted-foreground text-center">
        ※ 投稿は管理者の承認後に公開されます
      </p>
    </form>
  )
}

