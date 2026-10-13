import { getCardTheme } from '../../composables/useCardTheme.js'

export type RetroFormat = 'square' | 'story'

export interface RetroCardInput {
  title: string
  periodLabel: string
  pages: number
  books: number
  days: number
  streak: number
  topBook?: string
  myPages: number
  partnerName?: string
  partnerPages?: number
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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Shareable "retrospective" summary card drawn locally (canvas). */
export function useRetroCard() {
  function render(input: RetroCardInput, format: RetroFormat = 'square'): string {
    const c = getCardTheme().canvas
    const H = format === 'story' ? 1920 : 1080
    const oy = format === 'story' ? 420 : 0
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
    ctx.fillText('RETROSPECTIVA', cx, y(180))
    ctx.fillStyle = c.text
    ctx.font = 'bold 74px Fraunces, Georgia, serif'
    wrap(ctx, input.title, W - 200)
      .slice(0, 2)
      .forEach((line, index) => ctx.fillText(line, cx, y(270 + index * 82)))

    ctx.fillStyle = c.text
    ctx.font = 'bold 210px Fraunces, Georgia, serif'
    ctx.fillText(String(input.pages), cx, y(560))
    ctx.fillStyle = c.muted
    ctx.font = '600 38px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText(`páginas · ${input.books} livro(s) terminado(s)`, cx, y(620))

    ctx.fillStyle = c.text
    ctx.font = '600 40px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText(`${input.days} dia(s) de leitura · sequência ${input.streak}`, cx, y(700))

    if (input.topBook) {
      ctx.fillStyle = c.muted
      ctx.font = '600 30px "Familjen Grotesk", system-ui, sans-serif'
      ctx.fillText('DESTAQUE', cx, y(790))
      ctx.fillStyle = c.text
      ctx.font = 'italic 46px Fraunces, Georgia, serif'
      wrap(ctx, input.topBook, W - 240)
        .slice(0, 2)
        .forEach((line, index) => ctx.fillText(line, cx, y(850 + index * 56)))
    }

    if (input.partnerName) {
      ctx.fillStyle = c.text
      ctx.font = '600 38px "Familjen Grotesk", system-ui, sans-serif'
      ctx.fillText(`Você ${input.myPages} × ${input.partnerPages ?? 0} ${input.partnerName}`, cx, y(970))
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
