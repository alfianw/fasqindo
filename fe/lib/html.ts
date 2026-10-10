const ALLOWED_TAGS = /^(p|div|span|br|strong|b|em|i|u|s|strike|h[1-6]|ul|ol|li|a|blockquote)$/i

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Converts legacy plain-text content (no markup) into safe HTML so it can be
// fed to a rich text field without losing line breaks.
export function toHtml(input: string): string {
  if (!input) return ''
  if (input.includes('<')) return input
  return escapeHtml(input).replace(/\r?\n/g, '<br />')
}

// Lightweight, isomorphic sanitizer: keeps a small whitelist of formatting tags
// and removes scripts, styles, inline event handlers and javascript: URLs.
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|input|textarea|link|meta|base)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, (tag) => {
      const name = /^<\/?\s*([a-z][a-z0-9]*)/i.exec(tag)?.[1] ?? ''
      if (!ALLOWED_TAGS.test(name)) return escapeHtml(tag)
      let cleaned = tag.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      cleaned = cleaned.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"')
      if (name.toLowerCase() === 'a' && !/\shref\s*=/i.test(cleaned) && !cleaned.startsWith('</')) {
        cleaned = cleaned.replace(/^<a/i, '<a href="#"')
      }
      return cleaned
    })
}

export function stripHtml(input: string): string {
  return toHtml(input)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Returns the trimmed HTML, or an empty string when there is no visible text.
// This keeps "empty" editors (which Safari/Chrome fill with <br>) from saving.
export function cleanRichText(html: string): string {
  return stripHtml(html) ? html.trim() : ''
}
