/** Fotos sintéticas (canvas) para simular el antes y el después de un trabajo de vidrio. */
import type { Browser } from '@playwright/test'

export type PhotoVariant = 'before' | 'after' | 'work'

export async function drawPhoto(browser: Browser, label: string, variant: PhotoVariant): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  await page.setContent('<canvas id="c" width="800" height="600"></canvas>')
  const data = await page.evaluate(({ label, variant }) => {
    const c = document.getElementById('c') as HTMLCanvasElement
    const g = c.getContext('2d')!
    g.fillStyle = '#e7e5e4'; g.fillRect(0, 0, 800, 600)
    g.strokeStyle = '#d6d3d1'
    for (let x = 0; x < 800; x += 80) for (let y = 0; y < 600; y += 60) g.strokeRect(x, y, 80, 60)
    g.fillStyle = '#a8a29e'; g.fillRect(0, 520, 800, 80)
    if (variant !== 'before') {
      g.fillStyle = 'rgba(147,197,253,0.45)'; g.fillRect(180, 60, 440, 460)
      g.strokeStyle = '#64748b'; g.lineWidth = 8; g.strokeRect(180, 60, 440, 460)
      g.beginPath(); g.moveTo(400, 60); g.lineTo(400, 520); g.stroke()
      g.fillStyle = '#475569'; g.fillRect(380, 280, 10, 60)
    } else {
      g.fillStyle = '#78716c'; g.fillRect(560, 60, 20, 460)
      g.fillStyle = '#f5f5f4'; g.fillRect(200, 80, 340, 420)
    }
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, 800, 56)
    g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.fillText(label, 24, 38)
    return c.toDataURL('image/png').split(',')[1]!
  }, { label, variant })
  await page.close()
  return Buffer.from(data, 'base64')
}
