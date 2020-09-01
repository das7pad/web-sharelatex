const fs = require('fs')
const Path = require('path')
const Generator = require('./generator')

const SOURCE_DIRECTORY = `${__dirname}/../../locales/`
const TARGET_DIRECTORY = `${__dirname}/../../generated/lng`

function createTargetDirectory() {
  return fs.mkdirSync(TARGET_DIRECTORY, { recursive: true })
}
function getAvailableLngCodes() {
  if (process.argv.length === 3) {
    return [process.argv[2]]
  }

  function stripExtension(file) {
    return Path.basename(file, '.json')
  }
  return fs
    .readdirSync(SOURCE_DIRECTORY)
    .filter(path => path.endsWith('.json'))
    .map(stripExtension)
}

function persistToDisk() {
  createTargetDirectory()
  getAvailableLngCodes().forEach(lng => {
    const blob = Generator.generateModule(lng)
    fs.writeFileSync(`${TARGET_DIRECTORY}/${lng}.js`, blob)
  })
}

if (!module.parent) {
  persistToDisk()
}
