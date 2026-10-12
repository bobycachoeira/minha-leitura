import { buildAchievementPayload, type AchievementPayloadInput } from '@ml/shared'
import { getCardTheme } from '../../composables/useCardTheme.js'

export type CardFormat = 'square' | 'story'

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

function shortDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
      new Date(`${value.slice(0, 10)}T00:00:00Z`),
    )
  } catch {
    return value.slice(0, 10)
  }
}

/** Deterministic, shareable achievement card drawn locally (canvas). */
export function useAchievementCard() {
  function render(input: AchievementPayloadInput, format: CardFormat = 'square'): string {
    const payload = buildAchievementPayload(input)
    const c = getCardTheme().canvas
    const H = format === 'story' ? 1920 : 1080
    const oy = format === 'story' ? 430 : 0
    const y = (v: number): number => v + oy

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const defeated = payload.kind === 'meta_nao_batida'
    const unit = payload.metric === 'paginas' ? 'páginas' : 'livros'

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
    ctx.fillText(defeated ? 'QUASE LÁ' : 'CONQUISTA DE LEITURA', cx, y(190))

    ctx.fillStyle = c.text
    ctx.font = 'bold 96px Fraunces, Georgia, serif'
    ctx.fillText(defeated ? 'Não foi dessa vez' : 'Meta batida!', cx, y(310))

    ctx.font = 'bold 230px Fraunces, Georgia, serif'
    ctx.fillText(String(payload.progress), cx, y(560))
    ctx.font = '600 40px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillStyle = c.muted
    ctx.fillText(`de ${payload.target} ${unit}`, cx, y(620))

    const barW = 720
    const barX = cx - barW / 2
    roundRect(ctx, barX, y(680), barW, 20, 10)
    ctx.fillStyle = c.barTrack
    ctx.fill()
    const ratio = Math.max(0, Math.min(1, payload.progress / Math.max(1, payload.target)))
    roundRect(ctx, barX, y(680), Math.max(20, barW * ratio), 20, 10)
    ctx.fillStyle = defeated ? c.barDefeated : c.bar
    ctx.fill()

    ctx.fillStyle = c.text
    ctx.font = '500 40px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText(`${shortDate(payload.startDate)} — ${shortDate(payload.endDate)}`, cx, y(760))
    ctx.font = '600 38px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText(`Sequência: ${payload.streak} período(s)`, cx, y(820))

    if (payload.books.length > 0) {
      ctx.font = 'italic 42px Fraunces, Georgia, serif'
      ctx.fillStyle = c.text
      wrap(ctx, payload.books.join(' · '), W - 260)
        .slice(0, 3)
        .forEach((line, index) => ctx.fillText(line, cx, y(900 + index * 54)))
    } else if (defeated) {
      ctx.font = 'italic 40px Fraunces, Georgia, serif'
      ctx.fillStyle = c.muted
      ctx.fillText(`Faltaram ${payload.remaining} ${unit}`, cx, y(910))
    }

    ctx.fillStyle = c.muted
    ctx.font = '600 30px "Familjen Grotesk", system-ui, sans-serif'
    ctx.fillText('Minha Leitura', cx, H - 90)

    return canvas.toDataURL('image/png')
  }

  async function toBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl)
    return res.blob()
  }

  return { render, toBlob, build: buildAchievementPayload }
}
