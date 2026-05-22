/**
 * Copy backend standard care-pathway SVGs into Vite public assets.
 * Run from care-admin: node scripts/sync-standard-icons-to-public.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const adminRoot = join(__dirname, '..')
const backendIcons = join(adminRoot, '..', 'careadmin-backend', 'uploads', 'care-pathway', 'standard')
const publicDir = join(adminRoot, 'public', 'care-plan-icons', 'standard')

if (!existsSync(backendIcons)) {
  console.error(`Source not found: ${backendIcons}`)
  console.error('Run: cd careadmin-backend && pnpm exec prisma db seed')
  process.exit(1)
}

mkdirSync(publicDir, { recursive: true })
const files = readdirSync(backendIcons).filter(f => f.endsWith('.svg'))
for (const file of files) {
  cpSync(join(backendIcons, file), join(publicDir, file))
}
function titleFromSlug(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const manifest = files.map(file => {
  const slug = file.replace(/\.svg$/i, '')
  return {
    name: titleFromSlug(slug),
    slug,
    file: `/care-plan-icons/standard/${file}`,
  }
})
writeFileSync(
  join(publicDir, 'manifest.json'),
  JSON.stringify({ source: 'careadmin-backend/uploads/care-pathway/standard', icons: manifest }, null, 2),
)
console.log(`Synced ${files.length} icon(s) to public/care-plan-icons/standard/`)
