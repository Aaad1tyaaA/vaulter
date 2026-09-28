// Writes release/SHA256SUMS.txt for every installer, so downloads can be verified (run by `npm run dist`).
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '..', 'release')
const exes = fs.readdirSync(dir).filter(f => f.endsWith('.exe'))
const lines = exes.map(f => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')}  ${f}`)
fs.writeFileSync(path.join(dir, 'SHA256SUMS.txt'), lines.join('\n') + '\n')
console.log(lines.join('\n'))
