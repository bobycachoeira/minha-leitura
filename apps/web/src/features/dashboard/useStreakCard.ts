import { getCardTheme } from '../../composables/useCardTheme.js'

export type StreakCardFormat = 'square' | 'story'

export interface StreakCardInput {
  current: number
  best: number
  periodStreak: number
}

const W = 1080

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Shareable "reading streak" card drawn locally (canvas). */
export function useStreakCard() {
  function render(input: StreakCardInput, format: StreakCardFormat = 'square'): string {
    const c = getCardTheme().canvas
    const H = format === 'story' ? 1920 : 1080
    const oy = format === 'story' ? 430 : 0
    const y = (v: number): number => v + oy

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, c.bg0)
    grad.addColorStop(0.6, c.bg1)
    grad.addColorStop(1, c.bg2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = 'rgba(128,128,128,0.06)'
    for (let i = 0; i < 460; i += 1) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
    }

    ctx.strokeStyle = c.frame
    ctx.lineWidth = 4
    roundRect(ctx, 48, 48, W - 96, H - 96, 40)
    ctx.stroke()

    ctx.textAlign = 'center'
    const cx = W / 2

    ctx.fillStyle = c.muted
    ctx.font = '600 32px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText('MINHA CONSTÂNCIA', cx, y(180))

    ctx.fillStyle = c.text
    ctx.font = 'bold 84px Fraunces, Georgia, serif'
    ctx.fillText('Dias seguidos lendo', cx, y(300))

    ctx.font = 'bold 260px Fraunces, Georgia, serif'
    ctx.fillText(String(input.current), cx, y(590))

    ctx.fillStyle = c.muted
    ctx.font = '600 44px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText(input.current === 1 ? 'dia em sequência' : 'dias em sequência', cx, y(660))

    if (input.best > 0) {
      const label = `RECORDE · ${input.best} ${input.best === 1 ? 'DIA' : 'DIAS'}`
      ctx.font = '700 40px "Familjen Grotesk", system-ui, sans-serif'
      const pillW = ctx.measureText(label).width + 96
      const pillH = 96
      roundRect(ctx, cx - pillW / 2, y(740), pillW, pillH, 48)
      ctx.fillStyle = c.frame
      ctx.fill()
      ctx.fillStyle = c.text
      ctx.fillText(label, cx, y(804))
    }

    if (input.periodStreak > 0) {
      ctx.fillStyle = c.muted
      ctx.font = '600 38px "Familjen Grotesk", system-ui, sans-serif'
      const periods = `${input.periodStreak} ${input.periodStreak === 1 ? 'período de meta' : 'períodos de meta'} em sequência`
      ctx.fillText(periods, cx, y(940))
    }

    ctx.fillStyle = c.muted
    ctx.font = '600 30px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText('Minha Leitura', cx, H - 90)

    return canvas.toDataURL('image/png')
  }

  async function toBlob(dataUrl: string): Promise<Blob> {
    return (await fetch(dataUrl)).blob()
  }

  return { render, toBlob }
}
