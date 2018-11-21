/* global $ */

import { deTex, splitAuthors, clearOnMouseDown } from '../utils'
import { makePreambleMark } from '../preamble_mark'

const PreambleMarker = {
  marker(cm, titleMark, authorMark, maketitleMark) {
    var preamble = makePreambleDiv(cm, titleMark)

    if (authorMark) {
      preamble.append(makeAuthors(cm, authorMark))
    }

    var widget = cm.addLineWidget(0, preamble[0], { above: true })
    var mark = makePreambleMark(cm, titleMark, authorMark, maketitleMark)

    function clearWidget() {
      widget.clear()
    }
    mark.on('clear', clearWidget)
    mark.on('hide', clearWidget)
    clearOnMouseDown(cm, preamble, mark)
  }
}

function makePreambleDiv(cm, titleMark) {
  const title = $('<h1>')
    .addClass('title')
    .text(deTex(titleMark.getContent(cm)))

  return $('<div>')
    .addClass('preamble')
    .append(title)
}

function makeAuthors(cm, authorMark) {
  const authorEls = splitAuthors(authorMark.getContent(cm)).map(author =>
    $('<li>').text(deTex(author))
  )

  return $('<ul>')
    .addClass('authors')
    .append(authorEls)
}

export default PreambleMarker
