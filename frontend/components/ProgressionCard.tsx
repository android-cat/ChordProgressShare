/**
 * コード進行カード表示コンポーネント
 * 
 * コード進行の表示・再生を行う。
 * - コードパターンの表示（8×2グリッド）
 * - Tone.jsによる試聴機能
 * - 使用楽曲の表示とプレビュー埋め込み
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Play, Square, ExternalLink, Music } from 'lucide-react'
import { playChords, stopPlayback } from '@/lib/audio'
import type { Progression, Pattern, Song } from '@/lib/api'

interface ProgressionCardProps {
  progression: Progression
  showDetail?: boolean
  onEdit?: () => void
}

export function ProgressionCard({ progression, showDetail = false, onEdit }: ProgressionCardProps) {
  const [playingPattern, setPlayingPattern] = useState<number | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number>(-1)

  const handlePlay = async (patternIndex: number, chords: (string | null)[]) => {
    if (playingPattern === patternIndex) {
      stopPlayback()
      setPlayingPattern(null)
      setPlayingIndex(-1)
    } else {
      stopPlayback()
      setPlayingPattern(patternIndex)
      await playChords(chords, 120, (index) => {
        setPlayingIndex(index)
        if (index === -1) {
          setPlayingPattern(null)
        }
      })
    }
  }

  const getYoutubeEmbedId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    return match ? match[1] : null
  }

  const getSpotifyEmbedId = (url: string): string | null => {
    const match = url.match(/spotify\.com\/(?:track|album|playlist)\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <a href={`/progressions/${progression.id}`} className="hover:underline">
            {progression.title}
          </a>
        </CardTitle>
        {progression.remarks && (
          <CardDescription>{progression.remarks}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {progression.patterns.map((pattern, patternIndex) => (
          <div key={pattern.id || patternIndex} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{pattern.label || `パターン ${patternIndex + 1}`}</span>
              <Button
                variant={playingPattern === patternIndex ? "destructive" : "outline"}
                size="sm"
                onClick={() => handlePlay(patternIndex, pattern.chords)}
              >
                {playingPattern === patternIndex ? (
                  <><Square className="h-3 w-3 mr-1" /> 停止</>
                ) : (
                  <><Play className="h-3 w-3 mr-1" /> 再生</>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {pattern.chords.map((chord, chordIndex) => (
                <div
                  key={chordIndex}
                  className={`
                    p-2 text-center text-sm border rounded
                    ${playingPattern === patternIndex && playingIndex === chordIndex 
                      ? 'bg-primary text-primary-foreground' 
                      : chord ? 'bg-muted' : 'bg-background'
                    }
                  `}
                >
                  {chord || '-'}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <span key={n} className="flex-1 text-center">{n}小節</span>
              ))}
            </div>
          </div>
        ))}

        {/* 使用楽曲 */}
        {showDetail && progression.songs && progression.songs.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium flex items-center gap-2">
              <Music className="h-4 w-4" /> 使用楽曲
            </h4>
            {progression.songs.map((song, index) => (
              <div key={song.id || index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{song.name}</span>
                  {song.artist && <span className="text-muted-foreground">- {song.artist}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {song.youtube_url && (
                    <a href={song.youtube_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" /> YouTube
                      </Button>
                    </a>
                  )}
                  {song.spotify_url && (
                    <a href={song.spotify_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" /> Spotify
                      </Button>
                    </a>
                  )}
                  {song.apple_music_url && (
                    <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" /> Apple Music
                      </Button>
                    </a>
                  )}
                </div>
                
                {/* 埋め込みプレビュー */}
                {song.youtube_url && getYoutubeEmbedId(song.youtube_url) && (
                  <iframe
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${getYoutubeEmbedId(song.youtube_url)}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                )}
                {song.spotify_url && getSpotifyEmbedId(song.spotify_url) && (
                  <iframe
                    src={`https://open.spotify.com/embed/track/${getSpotifyEmbedId(song.spotify_url)}`}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="encrypted-media"
                    className="rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {onEdit && (
        <CardFooter>
          <Button variant="outline" onClick={onEdit}>
            編集をリクエスト
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
