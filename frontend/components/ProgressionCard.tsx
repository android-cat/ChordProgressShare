/**
 * コード進行カード表示コンポーネント
 * 
 * コード進行の表示・再生を行う。
 * - コードパターンの表示（1小節ごとに||で囲む形式）
 * - Tone.jsによる試聴機能
 * - 使用楽曲の表示とプレビュー埋め込み
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Play, Square, ExternalLink, Music } from 'lucide-react'
import { playChords, stopPlayback } from '@/lib/audio'
import { formatChordsToMeasures } from '@/lib/chord-display'
import type { Progression } from '@/lib/api'

interface ProgressionCardProps {
  progression: Progression
  showDetail?: boolean
  onEdit?: () => void
}

export function ProgressionCard({ progression, showDetail = false, onEdit }: ProgressionCardProps) {
  const [playingPattern, setPlayingPattern] = useState<number | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number>(-1)
  const [bpm, setBpm] = useState<number>(120)
  const [volume, setVolume] = useState<number>(-6)

  const handlePlay = async (patternIndex: number, chords: (string | null)[]) => {
    if (playingPattern === patternIndex) {
      stopPlayback()
      setPlayingPattern(null)
      setPlayingIndex(-1)
    } else {
      stopPlayback()
      setPlayingPattern(patternIndex)
      await playChords(chords, bpm, (index) => {
        setPlayingIndex(index)
        if (index === -1) {
          setPlayingPattern(null)
        }
      }, volume)
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
        {showDetail && (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 flex-1">
              <Label htmlFor="detail-bpm" className="text-sm whitespace-nowrap">BPM: {bpm}</Label>
              <input
                id="detail-bpm"
                type="range"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Label htmlFor="detail-volume" className="text-sm whitespace-nowrap">音量: {volume}dB</Label>
              <input
                id="detail-volume"
                type="range"
                min="-24"
                max="0"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1"
              />
            </div>
          </div>
        )}
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
            <div className="flex flex-wrap gap-1 text-sm">
              {formatChordsToMeasures(pattern.chords).map((measure) => {
                if (measure.isEmpty) return null
                
                return (
                  <div key={measure.measureIndex} className="flex items-center gap-0.5">
                    <span>|</span>
                    <span 
                      className={`px-1 ${
                        playingPattern === patternIndex && playingIndex === measure.measureIndex * 2
                          ? 'bg-primary text-primary-foreground rounded' 
                          : ''
                      }`}
                    >
                      {measure.firstBeat || '-'}
                    </span>
                    {measure.hasSecondBeat && (
                      <>
                        <span> </span>
                        <span 
                          className={`px-1 ${
                            playingPattern === patternIndex && playingIndex === measure.measureIndex * 2 + 1
                              ? 'bg-primary text-primary-foreground rounded' 
                              : ''
                          }`}
                        >
                          {measure.secondBeat}
                        </span>
                      </>
                    )}
                    <span>|</span>
                  </div>
                )
              }).filter(Boolean)}
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
