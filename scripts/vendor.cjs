// Copies third-party browser builds into public/vendor (run by `npm run build`).
// The renderer loads them as plain scripts, so they must sit next to the app, not in node_modules.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const files = [['node_modules/hash-wasm/dist/argon2.umd.min.js', 'public/vendor/argon2.umd.min.js']]
fs.mkdirSync(path.join(root, 'public', 'vendor'), { recursive: true })
for (const [from, to] of files) fs.copyFileSync(path.join(root, from), path.join(root, to))
console.log('vendored', files.length, 'file(s)')
