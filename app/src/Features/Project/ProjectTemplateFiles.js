const fs = require('fs')
const Path = require('path')
const _ = require('underscore')

const TEMPLATES_PATH = Path.join(__dirname, '../../../templates/project_files')

function loadTemplate(name) {
  const blob = fs.readFileSync(Path.join(TEMPLATES_PATH, name), 'utf-8')
  return _.template(blob)
}

module.exports = {
  'main.tex': loadTemplate('main.tex'),
  'mainbasic.tex': loadTemplate('mainbasic.tex'),
  'references.bib': loadTemplate('references.bib')
}
