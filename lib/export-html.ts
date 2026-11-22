import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { safeArtifactPath } from '@/lib/artifacts'

function mimeFromPath(path: string): string {
  const ext = extname(path).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}

export async function inlineArticleImages(html: string, articleId: string): Promise<string> {
  const re = new RegExp(`src="(/api/files/${articleId}/images/([^"]+))"`, 'g')
  let out = ''
  let last = 0

  for (const match of html.matchAll(re)) {
    const idx = match.index ?? 0
    const name = decodeURIComponent(match[2] || '')
    out += html.slice(last, idx)
    try {
      const abs = safeArtifactPath(articleId, 'images', name)
      const buf = await readFile(abs)
      const data = `data:${mimeFromPath(name)};base64,${buf.toString('base64')}`
      out += `src="${data}"`
    } catch {
      out += match[0]
    }
    last = idx + match[0].length
  }

  out += html.slice(last)
  return out
}

export function localizeArticleImagesForPdf(html: string, articleId: string): string {
  const re = new RegExp(`src="(/api/files/${articleId}/images/([^"]+))"`, 'g')
  return html.replace(re, (_match, _url, name: string) => {
    try {
      const abs = safeArtifactPath(articleId, 'images', decodeURIComponent(name))
      return `src="file://${abs}"`
    } catch {
      return _match
    }
  })
}
