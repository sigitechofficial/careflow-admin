# Care plan icons (from Figma)

Permanent storage for icons exported from **Care 20:20** — Figma node [354-10508](https://www.figma.com/design/tsJEm2ALzuckPify3DyE04/Care-20--20?node-id=354-10508).

## Download from Figma

1. Create a [Figma personal access token](https://www.figma.com/developers/api#access-tokens) (scope: read files).
2. In `care-admin/.env.local` (create if missing):

   ```
   FIGMA_ACCESS_TOKEN=figd_your_token_here
   ```

   Do **not** commit this file.

3. From `care-admin`:

   ```powershell
   pnpm run fetch:figma-icons
   ```

   Optional PNG copies at 2×:

   ```powershell
   pnpm run fetch:figma-icons -- --png
   ```

## Output layout

```
assets/figma/care-plan-icons/
  README.md
  manifest.json    # names, slugs, paths, Figma node ids
  svg/             # one SVG per care plan icon
  png/             # optional, if --png was used
```

Use paths from `manifest.json` when wiring icons in the app, e.g. import or `/src/assets/...` via Vite.

## Re-export

Re-run the same command after Figma design updates. Existing files with the same slug are overwritten.
