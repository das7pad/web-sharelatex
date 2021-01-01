const REGEX_FOR_INNER_HTML = /[&<>]/g
export function escapeForInnerHTML(text) {
  return text.replace(REGEX_FOR_INNER_HTML, function(char) {
    if (char === '&') return '&amp;'
    if (char === '<') return '&lt;'
    if (char === '>') return '&gt;'
  })
}
