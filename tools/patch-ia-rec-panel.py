from pathlib import Path
p = Path(r'd:/New folder/Care/care-admin/src/features/service-users/initial-assessment/components/InitialAssessmentCarePlanRecommendationsPanel.tsx')
text = p.read_text(encoding='utf-8')
needle = '                  <p className="mt-0.5 text-xs text-muted-foreground">\n                    {rec.triggerCount}'
if 'carePathwayFormName' not in text:
    text = text.replace(
        '                    <p className="font-medium text-sm">{rec.title}</p>',
        '                    <p className="font-medium text-sm">{rec.title}</p>\n'
        '                    {rec.carePathwayFormName ? (\n'
        '                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100">\n'
        '                        {rec.carePathwayFormName}\n'
        '                      </span>\n'
        '                    ) : null}',
    )
    p.write_text(text, encoding='utf-8')
    print('panel updated')
