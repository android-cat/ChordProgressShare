import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Play, Square, ExternalLink, Music, Volume2, Activity, PenLine } from 'lucide-react'
import { playChords, stopPlayback } from '@/lib/audio'
import { formatChordsToMeasures } from '@/lib/chord-display'
import type { Progression } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ProgressionCardProps {
  progression: Progression
  showDetail?: boolean
  onEdit?: () => void
}

export function ProgressionCard({ progression, showDetail = false, onEdit }: ProgressionCardProps) {
  const router = useRouter()
  const [playingPattern, setPlayingPattern] = useState<number | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number>(-1)
  const [bpm, setBpm] = useState<number>(120)
  const [volume, setVolume] = useState<number>(-6)

  const handlePlay = async (e: React.MouseEvent, patternIndex: number, chords: (string | null)[]) => {
    e.stopPropagation()
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

  const handleCardClick = () => {
    if (!showDetail) {
      router.push('/progressions/' + progression.id)
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
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-border/50 bg-card/50 backdrop-blur",
        !showDetail && "hover:-translate-y-1 cursor-pointer"
      )}
      onClick={handleCardClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold leading-tight">
              <span className="hover:text-primary transition-colors">
                {progression.title}
              </span>
            </CardTitle>
          </div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}>
              <PenLine className="h-4 w-4 mr-2" /> 編集
            </Button>
          )}
        </div>
        {progression.remarks && (
          <CardDescription className="mt-2 line-clamp-2">
            {progression.remarks}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="relative space-y-6">
        {showDetail && (
          <div className="grid gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Label htmlFor="detail-bpm">BPM</Label>
                  <span className="text-muted-foreground">{bpm}</span>
                </div>
                <input
                  id="detail-bpm"
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
                  <Label htmlFor="detail-volume">Volume</Label>
                  <span className="text-muted-foreground">{volume}dB</span>
                </div>
                <input
                  id="detail-volume"
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
        )}

        <div className="space-y-3">
          {progression.patterns && progression.patterns.map((pattern, pIndex) => (
            <div key={pIndex} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {pattern.label || "Pattern"}
                </span>
                <Button
                  variant={playingPattern === pIndex ? "destructive" : "secondary"}
                  size="sm"
                  className="h-8 px-3 transition-all"
                  onClick={(e) => handlePlay(e, pIndex, pattern.chords)}
                >
                  {playingPattern === pIndex ? (
                    <>
                      <Square className="h-3 w-3 mr-2 fill-current" /> 停止
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-2 fill-current" /> 再生
                    </>
                  )}
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-background/80 border border-border/50 font-mono text-sm overflow-x-auto">
                <div className="flex flex-wrap gap-y-2">
                  {formatChordsToMeasures(pattern.chords).map((measure, mIndex) => (
                    <span key={mIndex} className="flex items-center">
                      <span className="text-muted-foreground/50 mx-1">|</span>
                      <span className="mx-1 font-medium">
                        {measure.firstBeat || <span className="text-muted-foreground/30">/</span>}
                      </span>
                      {measure.hasSecondBeat && (
                        <span className="mx-1 font-medium">
                          {measure.secondBeat}
                        </span>
                      )}
                    </span>
                  ))}
                  <span className="text-muted-foreground/50 mx-1">|</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Used Track Info */}
        {progression.songs && progression.songs.length > 0 && (
          <div className="pt-4 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Music className="h-4 w-4" />
              <span>Used Track</span>
            </div>
            
            <div className="space-y-6">
              {progression.songs.map((song, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex flex-col gap-1">
                    {song.name && (
                      <span className="font-medium">{song.name}</span>
                    )}
                    {song.artist && (
                      <span className="text-sm text-muted-foreground">{song.artist}</span>
                    )}
                  </div>
                  
                  {song.youtube_url && (
                    <div className="mt-1">
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {song.youtube_url}
                      </a>
                    </div>
                  )}

                  {showDetail && song.youtube_url && getYoutubeEmbedId(song.youtube_url) && (
                    <div className="mt-2 aspect-video w-full rounded-lg overflow-hidden bg-black/5">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${getYoutubeEmbedId(song.youtube_url)}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {showDetail && song.spotify_url && getSpotifyEmbedId(song.spotify_url) && (
                     <div className="mt-2 w-full rounded-lg overflow-hidden bg-black/5">
                      <iframe 
                        style={{borderRadius: "12px"}} 
                        src={`https://open.spotify.com/embed/track/${getSpotifyEmbedId(song.spotify_url)}?utm_source=generator`} 
                        width="100%" 
                        height="152" 
                        frameBorder="0" 
                        allowFullScreen 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

