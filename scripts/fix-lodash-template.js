// Postinstall script: fix react-scripts 5 + Node.js 20 compatibility
//
// Root cause: workbox-build uses lodash.template() which injects a
// '//# sourceURL=...' comment into the string passed to new Function().
// Node.js 20 is stricter and throws "SyntaxError: Unexpected string"
// when parsing that generated source.
//
// Fix: patch lodash/template.js so it never generates the sourceURL line.
'use strict'
const fs = require('fs')
const path = require('path')

const templatePath = path.resolve(__dirname, '../node_modules/lodash/template.js')

if (!fs.existsSync(templatePath)) {
  console.log('[postinstall] lodash/template.js not found — skipping patch')
  process.exit(0)
}

let src = fs.readFileSync(templatePath, 'utf8')

// The line that builds the sourceURL string injected into new Function():
//   var sourceURL = 'sourceURL' in options ? '//# sourceURL=' + ... + '\n' : '';
// We force it to always be an empty string so Node 20 doesn't choke.
const original = `var sourceURL = 'sourceURL' in options ? '//# sourceURL=' +\n      (options.sourceURL + '').replace(/\\s/g, ' ') + '\\n' : '';`
const replacement = `var sourceURL = ''; // patched by fix-lodash-template.js (Node 20 compat)`

if (src.includes(original)) {
  fs.writeFileSync(templatePath, src.replace(original, replacement), 'utf8')
  console.log('[postinstall] lodash/template.js patched for Node 20 compatibility')
  process.exit(0)
}

// Fallback: try a more lenient regex in case formatting differs
const patched = src.replace(
  /var sourceURL = 'sourceURL' in options \? '\/\/# sourceURL=' \+[\s\S]*?'\n' : '';/,
  `var sourceURL = ''; // patched by fix-lodash-template.js (Node 20 compat)`
)

if (patched !== src) {
  fs.writeFileSync(templatePath, patched, 'utf8')
  console.log('[postinstall] lodash/template.js patched for Node 20 compatibility (fallback regex)')
} else {
  console.log('[postinstall] lodash/template.js — pattern not found, already patched or different version')
}
