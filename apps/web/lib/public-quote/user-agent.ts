/** Generadores de vista previa de ligas: abren la página pero no son el cliente. */
const PREVIEW_AGENT =
  /^WhatsApp\/|facebookexternalhit|facebookcatalog|TelegramBot|Twitterbot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|Googlebot|bingbot|Applebot|Pinterestbot|redditbot|Embedly/i

export function isLinkPreviewAgent(userAgent: string | null): boolean {
  return userAgent !== null && PREVIEW_AGENT.test(userAgent)
}
