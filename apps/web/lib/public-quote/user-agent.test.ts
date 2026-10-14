import { describe, expect, it } from 'vitest'
import { isLinkPreviewAgent } from './user-agent'

describe('isLinkPreviewAgent', () => {
  it.each([
    'WhatsApp/2.23.20.0 A',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'TelegramBot (like TwitterBot)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ])('detecta %s', (ua) => {
    expect(isLinkPreviewAgent(ua)).toBe(true)
  })

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  ])('no confunde un navegador real: %s', (ua) => {
    expect(isLinkPreviewAgent(ua)).toBe(false)
  })

  it('sin agente no es vista previa', () => {
    expect(isLinkPreviewAgent(null)).toBe(false)
  })
})
