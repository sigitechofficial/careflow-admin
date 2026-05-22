/**
 * Download care-plan icons from Figma (Care 20:20, node 354-10508).
 *
 * Saves to: care-admin/assets/figma/care-plan-icons/
 *   svg/*.svg
 *   png/*.png  (with --png)
 *   manifest.json
 *
 * Token: create at https://www.figma.com/developers/api#access-tokens
 * Put in care-admin/.env.local:
 *   FIGMA_ACCESS_TOKEN=figd_xxxxxxxx
 *
 * Usage:
 *   pnpm run fetch:figma-icons
 *   pnpm run fetch:figma-icons -- --png
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, cpSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const FILE_KEY = 'tsJEm2ALzuckPify3DyE04'

const __dirname = dirname(fileURLToPath(import.meta.url))
const adminRoot = join(__dirname, '..')
const wantPng = process.argv.includes('--png')
const nodeArg = process.argv.find(a => a.startsWith('--node-id='))
const outArg = process.argv.find(a => a.startsWith('--out='))
const publicArg = process.argv.find(a => a.startsWith('--public='))
const ROOT_NODE_ID = nodeArg ? nodeArg.split('=')[1].replace('-', ':') : '354:10508'
const OUT_NAME = outArg?.split('=')[1] ?? 'care-plan-icons'
const PUBLIC_SUBDIR = publicArg?.split('=')[1] ?? 'figma'
const outRoot = join(adminRoot, 'assets', 'figma', OUT_NAME)
const outSvg = join(outRoot, 'svg')
const outPng = join(outRoot, 'png')

const envLocalPath = join(adminRoot, '.env.local')
loadEnvLocal(envLocalPath)

const TOKEN = (process.env.FIGMA_ACCESS_TOKEN ?? process.env.FIGMA_TOKEN ?? '').trim()

if (!TOKEN || TOKEN.includes('YOUR_TOKEN') || TOKEN.includes('paste_your')) {
  console.error(`
Missing or placeholder Figma token.

1. Open https://www.figma.com/developers/api#access-tokens
2. Create a personal access token (starts with figd_)
3. Add to care-admin/.env.local (one line, no quotes):

   FIGMA_ACCESS_TOKEN=figd_xxxxxxxx

4. Run again from care-admin: pnpm run fetch:figma-icons

${existsSync(envLocalPath) ? `Found ${envLocalPath} but FIGMA_ACCESS_TOKEN was empty or invalid.` : `File not found: ${envLocalPath}`}
If you previously ran $env:FIGMA_ACCESS_TOKEN="figd_YOUR_TOKEN" in PowerShell, close the terminal or run:
  Remove-Item Env:FIGMA_ACCESS_TOKEN -ErrorAction SilentlyContinue
`)
  process.exit(1)
}

function loadEnvLocal(envPath) {
  if (!existsSync(envPath)) return
  let text = readFileSync(envPath, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).trim()
    }
    // .env.local always wins over a stale shell variable (e.g. figd_YOUR_TOKEN)
    process.env[key] = val
  }
}

async function figmaGet(path) {
  const res = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { 'X-Figma-Token': TOKEN },
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 403) {
      throw new Error(
        `Figma API 403 — token rejected or no access to this file.\n` +
          `  • Regenerate token at https://www.figma.com/developers/api#access-tokens\n` +
          `  • Your Figma account must be able to open the Care 20:20 file\n` +
          `  • Response: ${text}`,
      )
    }
    throw new Error(`${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'icon'
}

function iconLabelFromNodeName(name) {
  if (!name) return 'icon'
  const trimmed = name.trim()
  if (trimmed.includes(':')) {
    return trimmed.split(':').pop().trim() || trimmed
  }
  return trimmed
}

/** Tray of sibling icon frames (e.g. Figma node 354-10508 / DataGridCell). */
function collectFromIconTray(root) {
  const icons = []
  const seen = new Set()

  function findTray(node) {
    if (!node?.children?.length) return null
    const iconFrames = node.children.filter(
      c =>
        (c.type === 'FRAME' || c.type === 'INSTANCE' || c.type === 'COMPONENT') &&
        c.name &&
        !/^frame\s*\d+$/i.test(c.name),
    )
    if (iconFrames.length >= 3) return node
    for (const child of node.children) {
      const tray = findTray(child)
      if (tray) return tray
    }
    return null
  }

  const tray = findTray(root)
  if (!tray) return icons

  for (const child of tray.children) {
    if (child.type === 'TEXT' || !child.id) continue
    const label = iconLabelFromNodeName(child.name)
    if (seen.has(child.id)) continue
    seen.add(child.id)
    icons.push({ id: child.id, name: label })
  }
  return icons
}

/** Service user module tabs (node 321-11019): icon + label columns. */
function collectModuleTabs(root) {
  const slugOverrides = { 'visit-plan': 'care-plan' }
  const tabs = []

  for (const column of root.children ?? []) {
    const textChild = column.children?.find(c => c.type === 'TEXT' && c.characters?.trim())
    const iconFrame = column.children?.find(
      c =>
        (c.type === 'FRAME' || c.type === 'INSTANCE' || c.type === 'COMPONENT') &&
        c.name &&
        !/^frame\s*1000/i.test(c.name),
    )
    if (!textChild || !iconFrame?.id) continue
    let slug = slugify(textChild.characters.trim())
    if (slugOverrides[slug]) slug = slugOverrides[slug]
    tabs.push({ id: iconFrame.id, name: slug })
  }

  return tabs.length >= 5 ? tabs : []
}

/** Quick-select filter row (node 354-11100): person ×3, care ×3, DoLS, absent. */
function collectOrderedQuickSelect(root) {
  const labels = [
    'person-all',
    'person-active',
    'person-discharged',
    'care-low',
    'care-medium',
    'care-high',
    'dols',
    'absent',
  ]

  function findTrayContainer(node) {
    if (!node) return null
    if (node.name === 'Frame 1000004965') return node
    for (const child of node.children ?? []) {
      const found = findTrayContainer(child)
      if (found) return found
    }
    return null
  }

  const container = findTrayContainer(root)
  if (!container) return []

  const frames = []
  for (const group of container.children ?? []) {
    for (const icon of group.children ?? []) {
      if (icon.type === 'FRAME' && icon.id) frames.push(icon)
    }
  }

  if (frames.length !== labels.length) return []

  return frames.map((frame, i) => ({ id: frame.id, name: labels[i] }))
}

/** Report letter buttons (node 354-10537): frame exports with CS, D, O, A, C, H. */
function collectReportButtons(root) {
  const icons = []
  const seen = new Set()

  const walk = node => {
    if (!node) return
    const children = node.children ?? []
    const textChild = children.find(c => c.type === 'TEXT' && c.characters?.trim())
    const nonText = children.filter(c => c.type !== 'TEXT' && c.type !== 'SLICE')

    if (
      textChild &&
      nonText.length === 0 &&
      /^[A-Za-z]{1,3}$/.test(textChild.characters.trim()) &&
      node.id &&
      !seen.has(node.id)
    ) {
      seen.add(node.id)
      icons.push({ id: node.id, name: textChild.characters.trim().toUpperCase() })
      return
    }

    for (const child of children) walk(child)
  }

  walk(root)
  return icons
}

/**
 * Care-plan cards (frame + text label) or icon tray (node 354-10508).
 */
function collectIconNodes(root) {
  const icons = []
  const seen = new Set()

  const add = (id, name) => {
    if (!id || !name || seen.has(id)) return
    seen.add(id)
    icons.push({ id, name: name.trim() })
  }

  const reportIcons = collectReportButtons(root)
  if (reportIcons.length >= 3) return reportIcons

  const moduleTabs = collectModuleTabs(root)
  if (moduleTabs.length) return moduleTabs

  const quickSelectIcons = collectOrderedQuickSelect(root)
  if (quickSelectIcons.length) return quickSelectIcons

  const trayIcons = collectFromIconTray(root)
  if (trayIcons.length) return trayIcons

  const walk = node => {
    if (!node) return
    const children = node.children ?? []

    if (children.length >= 1) {
      const textChild = children.find(c => c.type === 'TEXT' && c.characters?.trim())
      const graphicChildren = children.filter(c => c.type !== 'TEXT' && c.type !== 'SLICE')
      if (textChild && graphicChildren.length >= 1) {
        add(graphicChildren[0].id, textChild.characters.trim())
        return
      }
      if (textChild && graphicChildren.length === 0 && /^[A-Za-z]{1,3}$/.test(textChild.characters.trim())) {
        add(node.id, textChild.characters.trim().toUpperCase())
        return
      }
    }

    if (
      (node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
      node.name &&
      !/^frame\s*\d*$/i.test(node.name) &&
      !/^icons?\s*$/i.test(node.name)
    ) {
      add(node.id, iconLabelFromNodeName(node.name))
    }

    for (const child of children) walk(child)
  }

  walk(root)

  if (icons.length === 0 && root.children?.length) {
    for (const child of root.children) {
      if (child.type === 'TEXT' && child.characters) continue
      const label =
        child.children?.find(c => c.type === 'TEXT')?.characters?.trim() ??
        iconLabelFromNodeName(child.name)
      if (label && child.id) add(child.id, label)
    }
  }

  return icons
}

async function downloadUrl(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

async function exportBatch(candidates, format, destDir, ext, assetsFolderName) {
  const manifest = []
  const batchSize = 30

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const ids = batch.map(c => c.id).join(',')
    const scale = format === 'png' ? '&scale=2' : ''
    const fmt =
      format === 'svg'
        ? '&format=svg&svg_include_id=false&svg_simplify_stroke=true'
        : '&format=png'
    const imgRes = await figmaGet(`/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}${fmt}${scale}`)

    for (const c of batch) {
      const url = imgRes.images?.[c.id]
      if (!url) {
        console.warn(`  skip (no URL): ${c.name}`)
        continue
      }
      const slug = slugify(c.name)
      let filename = `${slug}.${ext}`
      let n = 1
      while (manifest.some(m => m.slug === slug && m.format === format && m.file.endsWith(filename))) {
        filename = `${slug}-${n++}.${ext}`
      }
      await downloadUrl(url, join(destDir, filename))
      manifest.push({
        name: c.name,
        slug,
        format,
        file: `assets/figma/${assetsFolderName}/${format}/${filename}`,
        nodeId: c.id,
      })
      console.log(`  ${format.toUpperCase()}: ${c.name} → ${filename}`)
    }
  }

  return manifest
}

async function main() {
  mkdirSync(outSvg, { recursive: true })
  if (wantPng) mkdirSync(outPng, { recursive: true })

  console.log(`Figma file ${FILE_KEY}, node ${ROOT_NODE_ID}`)
  const nodesRes = await figmaGet(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ROOT_NODE_ID)}`)
  const root = nodesRes.nodes?.[ROOT_NODE_ID]?.document
  if (!root) throw new Error(`Node ${ROOT_NODE_ID} not found. Check the link is still valid.`)

  const candidates = collectIconNodes(root)
  if (!candidates.length) {
    console.error('No icon nodes found. Open the Figma node in Dev Mode and confirm node-id=354-10508.')
    process.exit(1)
  }

  console.log(`Found ${candidates.length} icon(s). Downloading…`)

  const manifest = []
  manifest.push(...(await exportBatch(candidates, 'svg', outSvg, 'svg', OUT_NAME)))
  if (wantPng) {
    manifest.push(...(await exportBatch(candidates, 'png', outPng, 'png', OUT_NAME)))
  }

  const nodeIdUrl = ROOT_NODE_ID.replace(':', '-')
  const payload = {
    exportedAt: new Date().toISOString(),
    figmaFileKey: FILE_KEY,
    figmaNodeId: ROOT_NODE_ID,
    figmaUrl: `https://www.figma.com/design/tsJEm2ALzuckPify3DyE04/Care-20--20?node-id=${nodeIdUrl}`,
    icons: manifest,
  }

  writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(payload, null, 2))

  const publicDir = join(adminRoot, 'public', 'care-plan-icons', PUBLIC_SUBDIR)
  mkdirSync(publicDir, { recursive: true })
  for (const f of readdirSync(outSvg).filter(x => x.endsWith('.svg'))) {
    cpSync(join(outSvg, f), join(publicDir, f))
  }
  writeFileSync(
    join(publicDir, 'manifest.json'),
    JSON.stringify(
      {
        ...payload,
        icons: manifest.filter(m => m.format === 'svg').map(m => ({
          name: m.name,
          slug: m.slug,
          file: `/care-plan-icons/${PUBLIC_SUBDIR}/${m.file.split('/').pop()}`,
          nodeId: m.nodeId,
        })),
      },
      null,
      2,
    ),
  )

  console.log(`\nSaved ${manifest.length} file(s) under:\n  ${outRoot}`)
  console.log(`Copied SVGs for dev preview → public/care-plan-icons/${PUBLIC_SUBDIR}/`)
}

main().catch(err => {
  console.error(err.message ?? err)
  process.exit(1)
})
