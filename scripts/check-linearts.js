/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const LINEARTS_DIR = path.join(__dirname, '../src/static/linearts')
const MAX_TOTAL_BYTES = 200 * 1024

const files = fs.readdirSync(LINEARTS_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
let total = 0

files.forEach((name) => {
  total += fs.statSync(path.join(LINEARTS_DIR, name)).size
})

if (total > MAX_TOTAL_BYTES) {
  console.error(`linearts 总大小 ${(total / 1024).toFixed(0)}K，超过 200K 限制（${files.length} 张）`)
  process.exit(1)
}

console.log(`check:linearts 通过（${files.length} 张，合计 ${(total / 1024).toFixed(0)}K / 200K）`)
