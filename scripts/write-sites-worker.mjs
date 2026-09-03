import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'

const distUrl = new URL('../dist/', import.meta.url)
const clientUrl = new URL('../dist/client/', import.meta.url)
const otaUrl = new URL('../ota/', import.meta.url)

await rm(clientUrl, { recursive: true, force: true })
await mkdir(clientUrl, { recursive: true })

for (const entry of await readdir(distUrl)) {
  if (['.openai', 'client', 'server'].includes(entry)) continue
  await cp(new URL(`../dist/${entry}`, import.meta.url), new URL(`../dist/client/${entry}`, import.meta.url), {
    recursive: true,
  })
}

try {
  await stat(otaUrl)
  await cp(otaUrl, new URL('../dist/client/updates/', import.meta.url), { recursive: true })
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await cp(new URL('../worker/index.js', import.meta.url), new URL('../dist/server/index.js', import.meta.url))
