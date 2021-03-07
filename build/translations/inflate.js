const fs = require('fs')

const FALLBACK_LOCALES = load('en')
function load(lng) {
  return JSON.parse(fs.readFileSync(`${process.cwd()}/locales/${lng}.json`))
}

function getInflatedLocales(lng) {
  return Object.entries(Object.assign({}, FALLBACK_LOCALES, load(lng)))
}

module.exports = { getInflatedLocales }
