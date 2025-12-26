/**
 * 小節入力コンポーネント
 * 
 * デフォルトは1小節に1つのコード入力（前半のみ）
 * +ボタンで後半を追加可能
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChordInput } from './ChordInput'
import { Plus, Minus } from 'lucide-react'

interface MeasureInputProps {
  measureIndex: number  // 0-7（8小節）
  firstBeatValue: string | null
  secondBeatValue: string | null | undefined  // undefinedの場合は表示しない
  onFirstBeatChange: (value: string | null) => void
  onSecondBeatChange: (value: string | null) => void
  onToggleSecondBeat: (show: boolean) => void
  isFirstBeatPlaying?: boolean
  isSecondBeatPlaying?: boolean
}

export function MeasureInput({
  measureIndex,
  firstBeatValue,
  secondBeatValue,
  onFirstBeatChange,
  onSecondBeatChange,
  onToggleSecondBeat,
  isFirstBeatPlaying = false,
  isSecondBeatPlaying = false,
}: MeasureInputProps) {
  const showSecondBeat = secondBeatValue !== undefined

  const handleToggle = () => {
    onToggleSecondBeat(!showSecondBeat)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
          <ChordInput
            index={measureIndex * 2}
            value={firstBeatValue}
            onChange={onFirstBeatChange}
            isPlaying={isFirstBeatPlaying}
            showBeatLabel={showSecondBeat}
          />
        </div>
        
        {showSecondBeat && (
          <div className="flex-1 min-w-0">
            <ChordInput
              index={measureIndex * 2 + 1}
              value={secondBeatValue as string | null}
              onChange={onSecondBeatChange}
              isPlaying={isSecondBeatPlaying}
              showBeatLabel={true}
            />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleToggle}
          className="h-auto w-10 shrink-0 self-stretch"
          title={showSecondBeat ? '後半を削除' : '後半を追加'}
        >
          {showSecondBeat ? (
            <Minus className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {measureIndex + 1}小節目
      </div>
    </div>
  )
}
