// Postinstall script: patch lodash template to avoid sourceURL leaking in evals
// This is a no-op if the patching is not needed in the current environment.
const fs = require('fs')
const path = require('path')

const templatePath = path.resolve(__dirname, '../node_modules/lodash/template.js')

if (!fs.existsSync(templatePath)) {
  // lodash not installed yet or not used — nothing to patch
  process.exit(0)
}

let src = fs.readFileSync(templatePath, 'utf8')

// Remove the sourceURL comment injected into compiled templates (security/CSP fix)
const patched = src.replace(
  /\/\/# sourceURL=[^\n]*\n/g,
  ''
)

if (patched !== src) {
  fs.writeFileSync(templatePath, patched, 'utf8')
  console.log('[postinstall] lodash/template.js patched (sourceURL removed)')
} else {
  // Already patched or pattern not found — safe to ignore
}
