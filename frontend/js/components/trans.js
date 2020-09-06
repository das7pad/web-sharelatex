import React from 'react'
import t from '../misc/t'
import PropTypes from 'prop-types'

export function _recursiveComponentSubstitute(chunk, components) {
  // 'PRE<0>INNER</0>POST' -> ['PRE', '0', 'INNER', 'POST']
  // '<0>INNER</0>' -> ['', '0', 'INNER', '']
  // '<0></0>' -> ['', '0', '', '']
  // '<0>INNER</0><0>INNER2</0>' -> ['', '0', 'INNER', '', '0', 'INNER2', '']
  // '<0><1>INNER</1></0>' -> ['', '0', '<1>INNER</1>', '']
  const parts = chunk.split(/<(\d+)>(.*?)<\/\1>/g)
  const output = parts.splice(0, 1) // extract the 'PRE' part
  while (parts.length) {
    // each batch consists of three items: ['0', 'INNER', 'POST']
    const [idx, innerChunk, intermediateChunk] = parts.splice(0, 3)
    const children = _recursiveComponentSubstitute(innerChunk, components)
    output.push(React.cloneElement(components[idx], {}, ...children))
    output.push(intermediateChunk)
  }
  return output
}

export function Trans({ i18nKey, values, components }) {
  return <>{_recursiveComponentSubstitute(t(i18nKey, values), components)}</>
}
Trans.propTypes = {
  i18nKey: PropTypes.string.isRequired,
  values: PropTypes.object,
  components: PropTypes.array
}
