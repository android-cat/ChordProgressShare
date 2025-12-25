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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Play, Volume2 } from 'lucide-react'
import { playChordPreview } from '@/lib/audio'

// コンポーネントのProps定義
interface ChordInputProps {
  value: string | null
  onChange: (value: string | null) => void
  index: number  // 0-15（16枠）
  isPlaying?: boolean  // 再生中ハイライト用
  showBeatLabel?: boolean  // 前半/後半のラベルを表示するか（後半がある場合のみtrue）
}

// 度数選択肢（全角ローマ数字 + 修飾子込み）
const DEGREE_OPTIONS = [
  { value: 'I', label: 'Ⅰ', halfWidth: 'I' },
  { value: '#I', label: '#Ⅰ', halfWidth: '#I' },
  { value: 'bII', label: '♭Ⅱ', halfWidth: 'bII' },
  { value: 'II', label: 'Ⅱ', halfWidth: 'II' },
  { value: '#II', label: '#Ⅱ', halfWidth: '#II' },
  { value: 'bIII', label: '♭Ⅲ', halfWidth: 'bIII' },
  { value: 'III', label: 'Ⅲ', halfWidth: 'III' },
  { value: 'IV', label: 'Ⅳ', halfWidth: 'IV' },
  { value: '#IV', label: '#Ⅳ', halfWidth: '#IV' },
  { value: 'bV', label: '♭Ⅴ', halfWidth: 'bV' },
  { value: 'V', label: 'Ⅴ', halfWidth: 'V' },
  { value: '#V', label: '#Ⅴ', halfWidth: '#V' },
  { value: 'bVI', label: '♭Ⅵ', halfWidth: 'bVI' },
  { value: 'VI', label: 'Ⅵ', halfWidth: 'VI' },
  { value: '#VI', label: '#Ⅵ', halfWidth: '#VI' },
  { value: 'bVII', label: '♭Ⅶ', halfWidth: 'bVII' },
  { value: 'VII', label: 'Ⅶ', halfWidth: 'VII' },
]

// クオリティ選択肢（英語表記）
const QUALITIES = [
  { value: 'major', label: 'M (メジャー)', actual: '' },
  { value: 'm', label: 'm (マイナー)', actual: 'm' },
  { value: '7', label: '7 (セブンス)', actual: '7' },
  { value: 'M7', label: 'M7 (メジャーセブンス)', actual: 'maj7' },
  { value: 'm7', label: 'm7 (マイナーセブンス)', actual: 'm7' },
  { value: 'dim', label: 'dim (ディミニッシュ)', actual: 'dim' },
  { value: 'dim7', label: 'dim7', actual: 'dim7' },
  { value: 'aug', label: 'aug (オーギュメント)', actual: 'aug' },
  { value: 'sus4', label: 'sus4', actual: 'sus4' },
  { value: 'sus2', label: 'sus2', actual: 'sus2' },
  { value: '7sus4', label: '7sus4', actual: '7sus4' },
  { value: 'add9', label: 'add9', actual: 'add9' },
  { value: 'm7-5', label: 'm7-5 (ハーフディミニッシュ)', actual: 'm7b5' },
  { value: '6', label: '6', actual: '6' },
  { value: 'm6', label: 'm6', actual: 'm6' },
  { value: '9', label: '9', actual: '9' },
  { value: 'M9', label: 'M9', actual: 'maj9' },
  { value: 'm9', label: 'm9', actual: 'm9' },
]

/**
 * コードをパースして各要素に分解
 */
function parseChordValue(chord: string | null): { degree: string; quality: string; bass: string } {
  if (!chord) return { degree: '', quality: '', bass: '' }
  
  let bass = ''
  let mainChord = chord
  
  if (chord.includes('/')) {
    const parts = chord.split('/')
    mainChord = parts[0]
    bass = parts[1]
  }
  
  // 度数部分を抽出（#IV, bVII, IIなど）
  const pattern = /^([b#]?)(I{1,3}|IV|VI{0,2}|VII?)(.*)$/i
  const match = mainChord.match(pattern)
  
  if (!match) return { degree: '', quality: '', bass: '' }
  
  const degreeWithModifier = (match[1] + match[2]).toUpperCase()
  const actualQuality = match[3] || ''
  
  // 内部形式からUI形式に変換（maj7→M7など）
  let displayQuality = 'major'
  const qualityMatch = QUALITIES.find(q => q.actual === actualQuality)
  if (qualityMatch) {
    displayQuality = qualityMatch.value
  }
  
  return { degree: degreeWithModifier, quality: displayQuality, bass }
}

/**
 * コード要素を結合してコード文字列を構築
 */
function buildChordValue(degree: string, quality: string, bass: string): string | null {
  if (!degree) return null
  
  // UI形式から内部形式に変換（M7→maj7など）
  const qualityMatch = QUALITIES.find(q => q.value === quality)
  const actualQuality = qualityMatch ? qualityMatch.actual : quality
  
  let chord = `${degree}${actualQuality}`
  if (bass) {
    chord += `/${bass}`
  }
  return chord
}

export function ChordInput({ value, onChange, index, isPlaying = false, showBeatLabel = false }: ChordInputProps) {
  const parsed = parseChordValue(value)
  const [showBass, setShowBass] = useState(!!parsed.bass)

  const handleChange = (field: string, newValue: string) => {
    const current = parseChordValue(value)
    const updated = { ...current, [field]: newValue }
    onChange(buildChordValue(updated.degree, updated.quality, updated.bass))
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

  // 小節の区切りを表示
  const measureNumber = Math.floor(index / 2) + 1
  const isFirstBeat = index % 2 === 0
  const isLastBeat = index % 2 === 1
  const isFirstInMeasure = index % 2 === 0
  const isLastInMeasure = index % 2 === 1

  return (
    <div className={`relative p-2 border rounded-lg space-y-2 ${isPlaying ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
      {/* 小節区切り線 */}
      {isFirstBeat && (
        <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-border" />
      )}
      {isLastBeat && (
        <div className="absolute -right-1 top-0 bottom-0 w-0.5 bg-border" />
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isFirstBeat && '||'} {measureNumber}小節{showBeatLabel ? ` - ${isFirstBeat ? '前半' : '後半'}` : ''} {isLastBeat && '||'}
        </span>
        <div className="flex gap-1">
          {value && (
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handlePreview}>
              <Volume2 className="h-3 w-3" />
            </Button>
          )}
          {value && (
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
              <X className="h-3 w-3" />
            </Button>
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
              <SelectItem key={d.value} value={d.halfWidth}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* クオリティ */}
        <Select value={parsed.quality || 'major'} onValueChange={(v: string) => handleChange('quality', v === 'major' ? '' : v)}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="種類" />
          </SelectTrigger>
          <SelectContent>
            {QUALITIES.map((q) => (
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
                <SelectItem key={d.value} value={d.halfWidth}>{d.label}</SelectItem>
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
