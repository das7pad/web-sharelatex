/*
 This script will replace inlined HTML elements with numeric stubs.

 We are migrating from
    locale: 'PRE <code>INNER</code> POST'
    pug: translate(localeKey)
 to
    locale: 'PRE <0>INNER</0> POST'
    pug: translate(localeKey, { }, ['code'])


 MAPPING entries:
  localeKey: ['ELEMENT'],
  autocomplete_references: ['code']
 */
const MAPPING = {
  autocomplete_references: ['code'],
}

const { transformLocales } = require('./transformLocales')

function transformLocale(locale, components) {
  components.forEach((element, idx) => {
    const open = `<${element}.*?>`
    const close = `</${element}>`
    const replacementOpen = `<${idx}>`
    const replacementClose = `</${idx}>`
    if (!locale.includes(replacementOpen)) {
      locale = locale
        .replace(new RegExp(open, 'g'), replacementOpen)
        .replace(close, replacementClose)
    }
  })
  return locale
}

function main() {
  transformLocales(MAPPING, transformLocale)
}

if (require.main === module) {
  main()
}
