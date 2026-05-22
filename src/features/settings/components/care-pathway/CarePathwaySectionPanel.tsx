type Section = {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

type Props = {
  title: string
  intro: string
  sections: Section[]
}

export function CarePathwaySectionPanel({ title, intro, sections }: Props) {
  return (
    <div className="space-y-6" data-testid="care-pathway-section-panel">
      <div>
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
      </div>
      <div className="space-y-5">
        {sections.map(section => (
          <section key={section.title} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {section.bullets.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Configuration for this area is not available yet. The workflow above describes how it will work once
        implemented.
      </p>
    </div>
  )
}
