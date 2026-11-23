export function Paragraphs({ items, className = 'l-text' }: { items: string[]; className?: string }) {
  return (
    <div className={className}>
      {items.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  )
}
