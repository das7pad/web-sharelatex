/* global MathJax */

import { ignoreErrors, lastRenderedLine, getMarks } from './utils'
import MathMarker from './markers/math_marker'
import SectionMarker from './markers/section_marker'
import FormattingMarker from './markers/formatting_marker'
import AbstractMarker from './markers/abstract_marker'
import ListEnvsMarker from './markers/list_envs_marker'
import ListItemsMarker from './markers/list_items_marker'
import FigureMarker from './markers/figure_marker'
import IconCommandMarker from './markers/icon_command_marker'
import InputMarker from './markers/input_marker'
import PreambleMarker from './markers/preamble_marker'

export default function RichText(_cm, rtAdapter) {
  var _updating = false
  var _enabled = false

  function attemptUpdate(isEnabling) {
    // have to guard against re-entrance, because adding marks can move the
    // cursor due to the inclusiveLeft and inclusiveRight options to markText
    if (_updating) return

    _updating = true
    _update(isEnabling)
    _updating = false
  }

  /**
   * To make this fast enough, we have to re-use existing TextMarkers.
   * Otherwise, CodeMirror spends a long time updating the DOM after every
   * keystroke.
   *
   * The general idea is that we want to match the TextMarkers already in the
   * document to the Marks that we've identified in the source code. If a
   * TextMarker doesn't match a Mark, we can remove it. If a Mark has no
   * matching TextMarker, then we need to add a new TextMarker.
   *
   * One complication is that a Mark often maps to multiple TextMarkers, e.g.
   * for section headings and inline formatting. So, the condition for a set of
   * TextMarkers matching a Mark is that all of the TextMarkers linked to that
   * Mark must be equal.
   *
   * Another complication is that the standard CodeMirror API does not make it
   * very easy to find TextMarkers -- it just lets us get an array of all of
   * them. This determines the order of the loops: the outer loop is over the
   * TextMarkers, and for each TextMarker, we search for corresponding source
   * markers.
   *
   * @param {Boolean} enabling when updating for the first time, we will move
   * the cursor out of the preamble, if it's there
   */
  function _update(enabling) {
    // Get the "source" marks - metadata about commands produced during the
    // LateMode parse
    var sourceMarks = getMarks(_cm)

    // Prepare "editor" marks - TextMarkers used in the DOM that must be matched
    // up with parser marks
    const editorMarks = _cm.getAllMarks().filter(editorMark => {
      return typeof editorMark.wlClearMatch === 'function'
    })
    // Reset any existing editor marks
    editorMarks.forEach(editorMark => editorMark.wlClearMatch())
    // Attempt to match up parser marks with existing editor marks
    editorMarks.forEach(editorMark => editorMark.wlMatch(_cm, sourceMarks))
    // Remove editor marks that don't match any source marks
    editorMarks.forEach(editorMark => {
      if (editorMark.wlIsMatched()) return
      const pos = editorMark.find()
      if (pos && pos.to.line < lastRenderedLine(_cm)) {
        editorMark.clear()
      }
    })

    const newMathMarks = []
    let titleMark, authorMark, maketitleMark
    // Create new editor marks for unmatched source marks
    for (const sourceMark of sourceMarks) {
      if (!sourceMark) continue

      if (MathMarker.matcher(_cm, sourceMark)) {
        newMathMarks.push(MathMarker.marker(_cm, sourceMark))
      } else if (SectionMarker.matcher(_cm, sourceMark)) {
        SectionMarker.marker(_cm, sourceMark)
      } else if (FormattingMarker.matcher(_cm, sourceMark)) {
        FormattingMarker.marker(_cm, sourceMark)
      } else if (AbstractMarker.matcher(_cm, sourceMark)) {
        AbstractMarker.marker(_cm, sourceMark)
      } else if (ListEnvsMarker.matcher(_cm, sourceMark)) {
        ListEnvsMarker.marker(_cm, sourceMark)
      } else if (ListItemsMarker.matcher(_cm, sourceMark)) {
        ListItemsMarker.marker(_cm, sourceMark)
      } else if (FigureMarker.matcher(_cm, sourceMark)) {
        FigureMarker.marker(_cm, sourceMark, rtAdapter)
      } else if (IconCommandMarker.matcher(_cm, sourceMark)) {
        IconCommandMarker.marker(_cm, sourceMark)
      } else if (InputMarker.matcher(_cm, sourceMark)) {
        InputMarker.marker(_cm, sourceMark, rtAdapter)
      } else if (sourceMark.kind === 'title') {
        titleMark = sourceMark
      } else if (sourceMark.kind === 'author') {
        authorMark = sourceMark
      } else if (sourceMark.kind === 'maketitle') {
        maketitleMark = sourceMark
      }
    }

    if (titleMark && maketitleMark) {
      var cursorIndex = _cm.indexFromPos(_cm.getCursor('head'))
      var makeTitleIndex = _cm.indexFromPos(maketitleMark.to)
      // For initial run or cursor is outside of preamble, render preamble
      if (enabling || cursorIndex > makeTitleIndex) {
        // When enabling, if cursor is within preamble, move it out
        if (enabling && cursorIndex <= makeTitleIndex) {
          _cm.setCursor(_cm.posFromIndex(makeTitleIndex + 1))
        }
        PreambleMarker.marker(_cm, titleMark, authorMark, maketitleMark)
      }
    }

    if (newMathMarks.length > 0) {
      const mathEls = newMathMarks.map(mark => mark.replacedWith)
      // Note: see http://docs.mathjax.org/en/latest/advanced/typeset.html for
      // why we have to reset MathJax's equation numbers when re-rendering an
      // equation with a label.
      MathJax.Hub.Queue(
        ['resetEquationNumbers', MathJax.InputJax.TeX],
        [
          'Process',
          MathJax.Hub,
          mathEls,
          function refreshAfterMathUpdate() {
            // NB: In MathJax 2.7, if we don't pass a callback as an argument
            // here, MathJax's `elementCallback` method ignores the element
            // list. We need to refresh codemirror in any case, but it's very
            // important that we do so by passing a callback function rather
            // than passing a second callback spec to Queue. I want my afternoon
            // back. JLM 20161222
            newMathMarks.forEach(mark => mark.changed())
          }
        ]
      )
    }
  }

  /// ////////////////////////////////////////////////////////////////////////
  // Buttons
  /// ////////////////////////////////////////////////////////////////////////

  function _cursorActivity() {
    attemptUpdate(false)
  }

  function _viewportChange() {
    attemptUpdate(false)
  }

  this.enable = function() {
    if (!_enabled) {
      _cm.on('cursorActivity', _cursorActivity)
      _cm.on('viewportChange', _viewportChange)

      attemptUpdate(true)

      _enabled = true
      _cm.refresh()
      _cm.scrollIntoView(null, 100)
      ignoreErrors(function() {
        _cm.focus() // can get errors due to popup blockers
      })
    }
  }

  this.disable = function() {
    if (_enabled) {
      _cm.off('cursorActivity', _cursorActivity)
      _cm.off('viewportChange', _viewportChange)

      var marks = _cm.getAllMarks()
      for (var i = 0; i < marks.length; ++i) {
        marks[i].clear()
      }

      // Remove every line class when disabling richText
      _.forEach(_.range(0, _cm.doc.lineCount()), function(x) {
        _cm.doc.removeLineClass(x, 'text')
      })

      _enabled = false
      _cm.refresh()
      ignoreErrors(function() {
        _cm.focus() // can get errors due to popup blockers
      })
    }
  }

  function _updateIfEnabled() {
    if (_enabled) {
      attemptUpdate(false)
    }
  }

  this.update = _updateIfEnabled

  this.cmRefresh = function() {
    _cm.refresh()
  }

  this.isEnabled = function() {
    return _enabled
  }
}
