import { makeSingleMark } from '../single_mark'
import { markCoversWholeLines, deTex, clearOnMouseDown } from '../utils'

const FigureMarker = {
  matcher(cm, sourceMark) {
    return (
      sourceMark.kind === 'figure' &&
      sourceMark.hasContent(cm) &&
      !sourceMark.containsCursor(cm, 'outer')
    )
  },

  marker(cm, sourceMark, rtAdapter) {
    if (!markCoversWholeLines(cm, sourceMark)) return

    const wrapperDiv = makeWrapperDiv()

    getInnerMarks(cm, sourceMark).forEach((mark) => {
      const region = mark.rangeForRegion('inner')

      if (mark.kind === 'caption') {
        wrapperDiv.append(makeCaptionDiv(cm, region))
      } else if (mark.kind === 'includegraphics') {
        const path = cm.getRange(region.from, region.to).replace(/"/g, '')
        const entity = rtAdapter.getEntityForPath(path)

        if (!entity) {
          wrapperDiv.append(makeNotFoundSpan(path))
        } else if (rtAdapter.isPreviewableEntity(entity)) {
          wrapperDiv
            .append(makeImg(rtAdapter.getPreviewUrlForEntity(entity)))
            .append(makeFileNameSpan(path))
        } else {
          wrapperDiv.append(makeFileNameSpan(path))
        }
      }
    })

    const mark = makeSingleMark(cm, sourceMark, 'outer', false, {
      clearOnEnter: true,
      inclusiveLeft: true,
      inclusiveRight: true,
      replacedWith: wrapperDiv[0]
    })
    clearOnMouseDown(cm, wrapperDiv[0], mark)
  }
}

/**
 * Given a sourceMark, it will return an array containing
 * all the marks inside the sourceMark range
 */
function getInnerMarks(cm, sourceMark) {
  const marks = cm.getTokenAt(sourceMark.to, true).state.marks

  return marks.filter((mark) => {
    return (
      mark.from.line >= sourceMark.from.line &&
      mark.to.line <= sourceMark.to.line &&
      !(
        mark.from.line === sourceMark.from.line &&
        mark.from.ch === sourceMark.from.ch &&
        mark.kind === sourceMark.kind
      )
    )
  })
}

function makeWrapperDiv() {
  return $('<div>').addClass('wl-figure-wrap')
}

function makeCaptionDiv(cm, region) {
  const { from, to } = region
  const caption = deTex(cm.getRange(from, to))

  return $('<div>').text(caption).addClass('wl-figure-caption')
}

function makeImg(previewUrl) {
  return $('<img>').attr('src', previewUrl).addClass('img-responsive wl-figure')
}

function makeNotFoundSpan(path) {
  return $('<span>')
    .text(`[Not Found: ${path}]`)
    .css({
      'font-size': 'small',
      color: 'red'
    })
    .addClass('wl-figure-not-found')
}

function makeFileNameSpan(path) {
  return $('<span>')
    .text(`[${path}]`)
    .css('font-size', 'small')
    .addClass('wl-figure-name')
}

export default FigureMarker
