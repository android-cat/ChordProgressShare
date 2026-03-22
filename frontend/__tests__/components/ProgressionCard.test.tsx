/**
 * ProgressionCard コンポーネントのテスト
 *
 * 表示内容・クリック動作・編集ボタン等をテスト。
 * 外部依存 (next/navigation, audio, tone) はモック。
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressionCard } from '@/components/ProgressionCard'
import type { Progression } from '@/lib/api'

// ==================================================
// モック設定
// ==================================================

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('@/lib/audio', () => ({
  playChords: jest.fn(),
  stopPlayback: jest.fn(),
}))

// Tone.js は jsdom 環境で動作しないためモック
jest.mock('tone', () => ({}), { virtual: true })

// ==================================================
// テストデータ
// ==================================================

const mockProgression: Progression = {
  id: 'test-id-1234',
  title: 'カノン進行',
  remarks: 'ソ・ファ・ミ・ラ...',
  status: 'approved',
  normalized_chords: 'I|V|VIm|IIIm|IV|I|IV|V',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  patterns: [
    {
      id: 'pattern-id-1',
      label: 'A',
      chords: ['I', 'V', 'VIm', 'IIIm', 'IV', 'I', 'IV', 'V',
               null, null, null, null, null, null, null, null],
      sort_order: 0,
    },
  ],
  songs: [],
}

const mockProgressionWithSong: Progression = {
  ...mockProgression,
  id: 'test-id-5678',
  songs: [
    {
      id: 'song-id-1',
      name: 'テスト曲',
      artist: 'テストアーティスト',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  ],
}

// ==================================================
// テスト
// ==================================================

describe('ProgressionCard', () => {
  describe('基本表示', () => {
    test('タイトルが表示される', () => {
      render(<ProgressionCard progression={mockProgression} />)
      expect(screen.getByText('カノン進行')).toBeInTheDocument()
    })

    test('備考が表示される', () => {
      render(<ProgressionCard progression={mockProgression} />)
      expect(screen.getByText('ソ・ファ・ミ・ラ...')).toBeInTheDocument()
    })

    test('パターンラベルが表示される', () => {
      render(<ProgressionCard progression={mockProgression} />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    test('再生ボタンが表示される', () => {
      render(<ProgressionCard progression={mockProgression} />)
      expect(screen.getByRole('button', { name: /再生/ })).toBeInTheDocument()
    })

    test('備考がない場合は表示されない', () => {
      const noRemarks: Progression = { ...mockProgression, remarks: undefined }
      render(<ProgressionCard progression={noRemarks} />)
      expect(screen.queryByText('ソ・ファ・ミ・ラ...')).not.toBeInTheDocument()
    })
  })

  describe('showDetail=false (一覧モード)', () => {
    test('BPMスライダーが表示されない', () => {
      render(<ProgressionCard progression={mockProgression} showDetail={false} />)
      expect(screen.queryByLabelText('BPM')).not.toBeInTheDocument()
    })
  })

  describe('showDetail=true (詳細モード)', () => {
    test('BPMスライダーが表示される', () => {
      render(<ProgressionCard progression={mockProgression} showDetail={true} />)
      expect(screen.getByLabelText('BPM')).toBeInTheDocument()
    })

    test('Volumeスライダーが表示される', () => {
      render(<ProgressionCard progression={mockProgression} showDetail={true} />)
      expect(screen.getByLabelText('Volume')).toBeInTheDocument()
    })
  })

  describe('楽曲情報', () => {
    test('楽曲名が表示される', () => {
      render(<ProgressionCard progression={mockProgressionWithSong} />)
      expect(screen.getByText('テスト曲')).toBeInTheDocument()
    })

    test('アーティスト名が表示される', () => {
      render(<ProgressionCard progression={mockProgressionWithSong} />)
      expect(screen.getByText('テストアーティスト')).toBeInTheDocument()
    })

    test('YouTubeリンクが表示される', () => {
      render(<ProgressionCard progression={mockProgressionWithSong} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'href',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      )
    })

    test('楽曲なしの場合は Used Track セクションが表示されない', () => {
      render(<ProgressionCard progression={mockProgression} />)
      expect(screen.queryByText('Used Track')).not.toBeInTheDocument()
    })
  })

  describe('編集ボタン', () => {
    test('onEdit が渡された場合は編集ボタンが表示される', () => {
      const onEdit = jest.fn()
      render(<ProgressionCard progression={mockProgression} onEdit={onEdit} />)
      expect(screen.getByRole('button', { name: /編集/ })).toBeInTheDocument()
    })

    test('onEdit が渡されない場合は編集ボタンが表示されない', () => {
      render(<ProgressionCard progression={mockProgression} />)
      expect(screen.queryByRole('button', { name: /編集/ })).not.toBeInTheDocument()
    })

    test('編集ボタンをクリックすると onEdit が呼ばれる', () => {
      const onEdit = jest.fn()
      render(<ProgressionCard progression={mockProgression} onEdit={onEdit} />)
      fireEvent.click(screen.getByRole('button', { name: /編集/ }))
      expect(onEdit).toHaveBeenCalledTimes(1)
    })
  })

  describe('再生ボタン', () => {
    test('再生ボタンをクリックすると停止ボタンに変わる', async () => {
      const { playChords } = require('@/lib/audio')
      // playChords が終了しないように pending Promise を返す
      playChords.mockReturnValue(new Promise(() => {}))

      render(<ProgressionCard progression={mockProgression} />)
      const playBtn = screen.getByRole('button', { name: /再生/ })
      fireEvent.click(playBtn)

      expect(screen.getByRole('button', { name: /停止/ })).toBeInTheDocument()
    })

    test('再生中に停止ボタンをクリックすると停止する', async () => {
      const { playChords, stopPlayback } = require('@/lib/audio')
      playChords.mockReturnValue(new Promise(() => {}))

      render(<ProgressionCard progression={mockProgression} />)
      fireEvent.click(screen.getByRole('button', { name: /再生/ }))
      fireEvent.click(screen.getByRole('button', { name: /停止/ }))

      expect(stopPlayback).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /再生/ })).toBeInTheDocument()
    })
  })
})
