/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  'base',
  'ide/colors/ColorManager',
  'ide/history/util/displayNameForUser'
], function(App, ColorManager, displayNameForUser) {
  App.controller('HistoryCompareLabelsListController', [
    '$scope',
    '$modal',
    'ide',
    function($scope, $modal, ide) {
      $scope.hoveringOverListSelectors = false
      $scope.recalculateSelectedLabels = function() {
        let beforeSelection = true
        let afterSelection = false
        for (let label of Array.from($scope.history.labels)) {
          var inSelection
          if (label.selectedTo) {
            inSelection = true
            beforeSelection = false
          }

          label.beforeSelection = beforeSelection
          label.inSelection = inSelection
          label.afterSelection = afterSelection

          if (label.selectedFrom) {
            inSelection = false
            afterSelection = true
          }
        }
        ide.historyManager.selectUpdatesFromLabelSelection()
      }

      $scope.recalculateHoveredLabels = function() {
        let inHoverSelection
        let hoverSelectedFrom = false
        let hoverSelectedTo = false
        for (var label of Array.from($scope.history.labels)) {
          // Figure out whether the to or from selector is hovered over
          if (label.hoverSelectedFrom) {
            hoverSelectedFrom = true
          }
          if (label.hoverSelectedTo) {
            hoverSelectedTo = true
          }
        }

        if (hoverSelectedFrom) {
          // We want to 'hover select' everything between hoverSelectedFrom and selectedTo
          inHoverSelection = false
          for (label of Array.from($scope.history.labels)) {
            if (label.selectedTo) {
              label.hoverSelectedTo = true
              inHoverSelection = true
            }
            label.inHoverSelection = inHoverSelection
            if (label.hoverSelectedFrom) {
              inHoverSelection = false
            }
          }
        }
        if (hoverSelectedTo) {
          // We want to 'hover select' everything between hoverSelectedTo and selectedFrom
          inHoverSelection = false

          for (label of Array.from($scope.history.labels)) {
            if (label.hoverSelectedTo) {
              inHoverSelection = true
            }
            label.inHoverSelection = inHoverSelection
            if (label.selectedFrom) {
              label.hoverSelectedFrom = true
              inHoverSelection = false
            }
          }
        }
      }

      $scope.resetHoverState = () => {
        for (let label of Array.from($scope.history.labels)) {
          delete label.hoverSelectedFrom
          delete label.hoverSelectedTo
          delete label.inHoverSelection
        }
      }

      $scope.displayName = displayNameForUser
      $scope.hueForUser = ColorManager.getHueForUserId.bind(ColorManager)
    }
  ])

  return App.controller('HistoryCompareLabelsListItemController', [
    '$scope',
    'event_tracking',
    function($scope, event_tracking) {
      $scope.$watch('label.selectedFrom', function(
        selectedFrom,
        oldSelectedFrom
      ) {
        if (selectedFrom) {
          for (let label of Array.from($scope.history.labels)) {
            if (label !== $scope.label) {
              label.selectedFrom = false
            }
          }
          $scope.recalculateSelectedLabels()
        }
      })

      $scope.$watch('label.selectedTo', function(selectedTo, oldSelectedTo) {
        if (selectedTo) {
          for (let label of Array.from($scope.history.labels)) {
            if (label !== $scope.label) {
              label.selectedTo = false
            }
          }
          $scope.recalculateSelectedLabels()
        }
      })

      $scope.select = function() {
        $scope.label.selectedTo = true
        $scope.label.selectedFrom = true
      }

      $scope.mouseOverSelectedFrom = function() {
        $scope.history.hoveringOverListSelectors = true
        $scope.label.hoverSelectedFrom = true
        $scope.recalculateHoveredLabels()
      }

      $scope.mouseOutSelectedFrom = function() {
        $scope.history.hoveringOverListSelectors = false
        $scope.resetHoverState()
      }

      $scope.mouseOverSelectedTo = function() {
        $scope.history.hoveringOverListSelectors = true
        $scope.label.hoverSelectedTo = true
        $scope.recalculateHoveredLabels()
      }

      $scope.mouseOutSelectedTo = function() {
        $scope.history.hoveringOverListSelectors = false
        $scope.resetHoverState()
      }
    }
  ])
})
