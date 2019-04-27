/* eslint-disable
    camelcase,
    max-len,
    no-cond-assign,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base', 'ace/ace'], function(App) {
  const { Range } = ace.require('ace/range')

  const getLastCommandFragment = function(lineUpToCursor) {
    let m
    if ((m = lineUpToCursor.match(/(\\[^\\]+)$/))) {
      return m[1]
    } else {
      return null
    }
  }

  return App.controller('ReferencesSearchController', function(
    $scope,
    $modal,
    ide,
    $timeout,
    sixpack,
    eventTracking,
    $rootScope
  ) {
    $scope.searchFeatureEnabled = () => true
    // return (
    // 	window._BIB_SEARCH_ENABLED || window?.location?.search in ['?ft=ersreraprf', '?ft=references']
    // )

    if (!$scope.searchFeatureEnabled()) {
      return
    }

    $scope.searchEnabled = false

    const _abTestStartDate = new Date(Date.UTC(2016, 6, 22))
    const _userSignUpDate = new Date(window.user.signUpDate)

    $scope.shouldABTestBibSearch = _userSignUpDate > _abTestStartDate

    $scope.isCursorAtCitation = function(editor) {
      // FIXME: duped code from AutocompletManager
      const pos = editor.getCursorPosition()
      const range = new Range(pos.row, 0, pos.row, pos.column)
      const lineUpToCursor = editor.getSession().getTextRange(range)
      const commandFragment = getLastCommandFragment(lineUpToCursor)
      if (commandFragment) {
        const citeMatch = commandFragment.match(
          /^~?\\([a-z]*cite[a-z]*(?:\[.*])?){([^}]*, *)?(\w*)/
        )
        if (citeMatch) {
          return true
        }
      }
      return false
    }

    $scope._hintNode = null
    $scope._buildHintNode = function() {
      eventTracking.sendMBOnce('bib-search-hint-shown-once')
      // pluck the hidden node out of the dom,
      // make it visible then hand it over to the caller
      const hintNode = $('.sl_references_search_hint')[0]
      if (!hintNode) {
        console.log(
          'Error: could not find .sl_references_search_hint node in dom'
        )
        return
      }
      hintNode.style.display = 'block'
      hintNode.style.visibility = 'visible'
      return hintNode
    }

    // set up the search hint text on the popup,
    // and make it visible if the cursor is currently
    // in a `cite` block.
    $scope.updateHintNode = function(editor) {
      if (
        __guard__(
          __guard__(
            editor != null ? editor.completer : undefined,
            x1 => x1.popup
          ),
          x => x.isOpen
        ) === true
      ) {
        if (!$scope._hintNode) {
          if ($scope.isCursorAtCitation(editor)) {
            // we need to create the hint dom-node and
            // attach it to the popup
            const newNode = $scope._buildHintNode()
            const container = __guard__(
              __guard__(
                __guard__(
                  editor != null ? editor.completer : undefined,
                  x4 => x4.popup
                ),
                x3 => x3.renderer
              ),
              x2 => x2.container
            )
            if (!container) {
              console.log(
                'Error attaching search hint: could not find popup container'
              )
              return
            }
            container.style.overflow = 'visible'
            $(container).append(newNode)
            $scope._hintNode = newNode
            // hook into the `hide` method on the popup,
            // and hide the hint when the poupup is hidden
            const { popup } = editor.completer
            if (!popup.hide._sl_patched) {
              const oldHide = popup.hide.bind(popup)
              popup.hide = function() {
                // delay the decision to hide the hint, prevents flickering
                $timeout(function() {
                  if (!$scope.isCursorAtCitation(editor)) {
                    return $scope._hideHint()
                  }
                }, 0)
                return oldHide()
              }
              popup.hide._sl_patched = true
            }
          }
        }
      }

      // as a fail-safe, always update visibility if the node exists
      if ($scope._hintNode) {
        if ($scope.isCursorAtCitation(editor)) {
          return $scope._showHint()
        } else {
          return $scope._hideHint()
        }
      }
    }

    $scope._showHint = function() {
      if ($scope._hintNode) {
        return ($scope._hintNode.style.visibility = 'visible')
      }
    }

    $scope._hideHint = function() {
      if ($scope._hintNode) {
        return ($scope._hintNode.style.visibility = 'hidden')
      }
    }

    // set up key bindings for references search
    $scope._inited = false
    $scope._sixpackParticipating = false
    $scope.setup = function() {
      if ($scope.settings.autoComplete === false) {
        return
      }
      if ($scope._inited) {
        return
      }
      // try to get the 'main' editor and it's `startAutocomplete` (Ctrl-Space)
      // key-command object
      if (editor == null) {
        console.log('no editor found')
        return
      }
      const startAutocomplete = __guard__(
        __guard__(
          editor != null ? editor.commands : undefined,
          x1 => x1.commands
        ),
        x => x.startAutocomplete
      )
      if (!startAutocomplete) {
        console.log('could not find startAutocomplete command')
        return
      }

      // only do this patchery once
      if (!startAutocomplete._sl_patched) {
        // wrap the existing `exec` function of startAutocomplete,
        // use it to update the hint node
        const oldExec = startAutocomplete.exec
        startAutocomplete.exec = function(ed, a, b, c, d) {
          $timeout(() => $scope.updateHintNode(ed), 0)
          return oldExec(ed)
        }
        startAutocomplete._sl_patched = true

        // on Ctrl-space:
        // if we're already showing the popup for a `\cite{}` block
        // then show the References Search modal, otherwise do the default behaviour
        const handleControlSpace = function(ed) {
          $timeout(() => $scope.updateHintNode(ed), 0)
          const isAtCitation = $scope.isCursorAtCitation(ed)
          if (
            __guard__(
              __guard__(ed != null ? ed.completer : undefined, x3 => x3.popup),
              x2 => x2.isOpen
            ) === true &&
            isAtCitation === true
          ) {
            eventTracking.sendMB('bib-search-modal-opened')

            if ($scope.shouldABTestBibSearch) {
              sixpack.convert('bib-search-highlight')
            }

            $scope.searchEnabled =
              __guard__(
                __guard__(
                  __guard__(
                    ide != null ? ide.$scope : undefined,
                    x6 => x6.project
                  ),
                  x5 => x5.features
                ),
                x4 => x4.referencesSearch
              ) === true
            return $scope.openReferencesSearchModal()
          } else {
            return startAutocomplete.exec(ed)
          }
        }

        // Expose the handleControlSpace method to the scope, in order to bind it
        // via ng-click.
        $scope.handleOpenSearch = () => handleControlSpace(editor)

        // BUG: Safari/Ace/Ctrl-Space don't seem to get along.
        // If we detect we're in Safari, just add a key listener to the
        // #editor node, otherwise register a command with ace
        if (ide.browserIsSafari) {
          document.querySelector('#editor').onkeyup = function(e) {
            if (e.ctrlKey && e.keyCode === 32) {
              return handleControlSpace(editor)
            }
          }
        } else {
          editor.commands.addCommand({
            name: 'triggerReferencesSearchPopup',
            exec: handleControlSpace,
            bindKey: startAutocomplete.bindKey
          })
        }

        return ($scope._inited = true)
      }
    }

    // do setup when project loads
    var editor = null
    $rootScope.$on('editor:inited', function(event, _editor) {
      editor = _editor
      return setTimeout($scope.setup)
    })

    $scope.insertKeyAtCursor = function(key) {
      if (editor == null) {
        console.log('no editor found')
        return
      }
      let pos = editor.getCursorPosition()
      const session = editor.getSession()
      // check if the user has partially typed a key already,
      // example: `\cite{one:1,tw|}`
      // in this case we need to delete back to the ',' and then insert the new key
      const lineUpToCursor = editor
        .getSession()
        .getTextRange(new Range(pos.row, 0, pos.row, pos.column))
      const lineBeyondCursor = editor
        .getSession()
        .getTextRange(new Range(pos.row, pos.column, pos.row, 99999))
      const needsClosingBrace = !lineBeyondCursor.match(/^[^{]*}/)
      const lastSeparatorPosition = Math.max(
        lineUpToCursor.lastIndexOf('{'),
        lineUpToCursor.lastIndexOf(','),
        lineUpToCursor.lastIndexOf(' ')
      )
      if (lastSeparatorPosition < pos.column - 1) {
        // delete back to the last separator, then insert new key
        session.remove(
          new Range(pos.row, lastSeparatorPosition + 1, pos.row, pos.column)
        )
        pos = editor.getCursorPosition()
        session.insert(pos, key)
      } else {
        // just insert the new key
        session.insert(pos, key)
      }
      if (needsClosingBrace) {
        return session.insert(editor.getCursorPosition(), '}')
      }
    }

    $scope.openReferencesSearchModal = function() {
      const modal = $modal.open({
        templateUrl: 'referencesSearchModalTemplate',
        controller: 'ReferencesSearchModalController',
        scope: $scope,
        size: 'lg',
        animation: false,
        backdrop: true,
        backdropClass: 'references-search-modal-backdrop',
        keyboard: true
      })
      return modal.result.then(keyString => $scope.insertKeyAtCursor(keyString))
    }

    return (ide.referencesSearchManager = {
      openReferencesModal(providerStr) {
        return $scope.openReferencesSearchModal(providerStr)
      }
    })
  })
})

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
