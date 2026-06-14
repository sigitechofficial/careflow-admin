# Plan canvases

Cursor’s **Canvas** panel only lists files under:

`C:\Users\<you>\.cursor\projects\<workspace>\canvases\`

This repo keeps the real files in **`Care/canvases/`**. A directory junction links the Cursor folder to here so both stay in sync.

## Open a canvas

1. **Canvas panel** — Click **Canvas** in the sidebar (or `+ Create new canvas` area); pick e.g. `daily-work-log`.
2. **From the file** — Open any `*.canvas.tsx` in this folder; use **Open in Canvas** if the editor offers it.

## Files

| File | Purpose |
|------|---------|
| `careflow-master-plan.canvas.tsx` | End-to-end enterprise roadmap (PH0–PH12): IA, assessments, care plans, risks, referrals, consent, Care Review, visit delivery, legacy retire |
| `care-pathway-roadmap.canvas.tsx` | Care Pathway gap analysis: built vs partial vs missing, referrals, build order |
| `initial-assessment-enterprise-plan.canvas.tsx` | 14-section IA phase tasks |
| `enterprise-design-plan.canvas.tsx` | Cross-module enterprise UX |
| `body-map-plan.canvas.tsx` | Body map + MAR |
| `daily-work-log.canvas.tsx` | Per-day shipped work log |

If the Canvas panel shows **No canvases found**, reload the window after the junction is created, or open a `.canvas.tsx` file directly.
