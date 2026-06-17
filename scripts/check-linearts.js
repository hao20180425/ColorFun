/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const LINEARTS_DIR = path.join(__dirname, '../src/static/linearts')
const LINEARTS_JS = path.join(__dirname, '../src/data/linearts.js')

const filesOnDisk = new Set(
  fs.readdirSync(LINEARTS_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
)

const src = fs.readFileSync(LINEARTS_JS, 'utf8')
const refs = [...src.matchAll(/path:\s*'(\/static\/linearts\/[^']+)'/g)].map(m => m[1])
const missing = refs.filter(ref => {
  const name = path.basename(ref)
  return !filesOnDisk.has(name)
})

let total = 0
filesOnDisk.forEach((name) => {
  total += fs.statSync(path.join(LINEARTS_DIR, name)).size
})

if (missing.length) {
  console.error('linearts.js 引用了不存在的文件：')
  missing.forEach(f => console.error('  -', f))
  process.exit(1)
}

console.log(`check:linearts 通过（${filesOnDisk.size} 张，引用 ${refs.length} 项，合计 ${(total / 1024).toFixed(0)}K）`)
