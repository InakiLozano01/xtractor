import { rm } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

export const ARTIFACTS_DIR = resolve(process.env.ARTIFACTS_DIR || '/app/artifacts')

export function safeArtifactPath(...parts: string[]): string {
  const target = resolve(ARTIFACTS_DIR, ...parts)
  const rel = relative(ARTIFACTS_DIR, target)
  if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
    throw new Error('path traversal')
  }
  return target
}

export async function removeArticleArtifacts(articleId: string, pdfPath?: string | null) {
  const dirs = new Set<string>()

  try {
    dirs.add(safeArtifactPath(articleId))
  } catch {
    /* ignore invalid legacy ids */
  }

  if (pdfPath) {
    try {
      dirs.add(dirname(safeArtifactPath(pdfPath)))
    } catch {
      /* ignore invalid legacy paths */
    }
  }

  await Promise.all([...dirs].map((dir) => rm(dir, { recursive: true, force: true }).catch(() => {})))
}
