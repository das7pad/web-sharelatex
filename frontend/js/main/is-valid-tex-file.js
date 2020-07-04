import getMeta from '../utils/meta'

const validTeXFileRegExp = new RegExp(
  `\\.(${getMeta('ol-validRootDocExtensions').join('|')})$`,
  'i'
)

function isValidTeXFile(filename) {
  return validTeXFileRegExp.test(filename)
}

export default isValidTeXFile
