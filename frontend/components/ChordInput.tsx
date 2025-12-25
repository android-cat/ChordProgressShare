/**
 * コード入力コンポーネント
 * 
 * プルダウン連鎖選択方式でコードを入力。
 * - 度数（Ⅰ〜Ⅶ、修飾子込み）
 * - クオリティ（M7, m, aug等）
 * - オンコード（/ベース音）
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Volume2 } from 'lucide-react'
import { playChordPreview } from '@/lib/audio'
import { DEGREE_OPTIONS, QUALITY_OPTIONS } from '@/lib/chord-constants'
import { parseChord, buildChord } from '@/lib/chord-parser'

interface ChordInputProps {
  value: string | null
  onChange: (value: string | null) => void
  index: number
  isPlaying?: boolean
  showBeatLabel?: boolean
}

export function ChordInput({ value, onChange, index, isPlaying = false, showBeatLabel = false }: ChordInputProps) {
  const parsed = parseChord(value)
  const [showBass, setShowBass] = useState(!!parsed.bass)

  const handleChange = (field: keyof typeof parsed, newValue: string) => {
    const current = parseChord(value)
    const updated = { ...current, [field]: newValue }
    onChange(buildChord(updated.degree, updated.quality, updated.bass))
  }

  const handlePreview = async () => {
    if (value) {
      await playChordPreview(value)
    }
  }

  const handleClear = () => {
    onChange(null)
    setShowBass(false)
  }

  const measureNumber = Math.floor(index / 2) + 1
  const isFirstBeat = index % 2 === 0

  return (
    <div className={`relative p-2 border rounded-lg space-y-2 ${isPlaying ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {measureNumber}小節{showBeatLabel ? ` - ${isFirstBeat ? '前半' : '後半'}` : ''}
        </span>
        <div className="flex gap-1">
          {value && (
            <>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handlePreview}>
                <Volume2 className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        {/* 度数（修飾子込み） */}
        <Select value={parsed.degree || 'none'} onValueChange={(v: string) => handleChange('degree', v === 'none' ? '' : v)}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="度数" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">空白</SelectItem>
            {DEGREE_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* クオリティ */}
        <Select value={parsed.quality || 'major'} onValueChange={(v: string) => handleChange('quality', v === 'major' ? '' : v)}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="種類" />
          </SelectTrigger>
          <SelectContent>
            {QUALITY_OPTIONS.map((q) => (
              <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* オンコード */}
      {showBass ? (
        <div className="flex items-center gap-1">
          <span className="text-xs">/</span>
          <Select value={parsed.bass || 'none'} onValueChange={(v: string) => handleChange('bass', v === 'none' ? '' : v)}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="ベース音" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">空白</SelectItem>
              {DEGREE_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowBass(false); handleChange('bass', '') }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => setShowBass(true)}>
          <Plus className="h-3 w-3 mr-1" /> オンコード
        </Button>
      )}

      {/* 現在のコード表示 */}
      {value ? (
        <div className="text-center font-bold text-lg">
          {value}
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm">
          空白
        </div>
      )}
    </div>
  )
}
