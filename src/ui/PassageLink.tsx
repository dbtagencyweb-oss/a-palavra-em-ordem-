import { useMemo, useState } from 'react'
import { trilha } from '../content'
import { buildReadingLink, parsePassage } from '../content/readingLink'
import { BibleReader } from './BibleReader'

export function PassageLink({ reference, external, className, children }: {
  reference: string
  external?: string
  className: string
  children: string
}) {
  const [open, setOpen] = useState(false)
  const chapters = useMemo(() => parsePassage(reference), [reference])
  if (!chapters) {
    const link = external ?? buildReadingLink(reference, trilha.linkLeitura.modelo)
    return link ? <a href={link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a> : null
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-haspopup="dialog">{children}</button>
      <BibleReader key={reference} book={chapters[0].book} open={open} onClose={() => setOpen(false)} passage={{ reference, chapters }} />
    </>
  )
}
