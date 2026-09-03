import { cp, mkdir, readdir, rm } from 'node:fs/promises'

const distUrl = new URL('../dist/', import.meta.url)
const clientUrl = new URL('../dist/client/', import.meta.url)

await rm(clientUrl, { recursive: true, force: true })
await mkdir(clientUrl, { recursive: true })

for (const entry of await readdir(distUrl)) {
  if (['.openai', 'client', 'server'].includes(entry)) continue
  await cp(new URL(`../dist/${entry}`, import.meta.url), new URL(`../dist/client/${entry}`, import.meta.url), {
    recursive: true,
  })
}

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await cp(new URL('../worker/index.js', import.meta.url), new URL('../dist/server/index.js', import.meta.url))
