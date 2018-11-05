/* eslint-disable
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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], function(App) {
  const BUTTON_WIDTH = 33;
  const OVERFLOWED_BUTTON_WIDTH = 70;

  return App.directive("formattingButtons", () =>
    ({
      scope: {
        buttons: "=",
        opening: "=",
        isFullscreenEditor: "="
      },

      link(scope, element, attrs) {
        scope.showMore = false;
        scope.shownButtons = [];
        scope.overflowedButtons = [];

        // Wait until the editor is not "opening" anymore (i.e. it's fully
        // loaded). This means we can acurately measure the element width
        var unbindOpeningWatcher = scope.$watch('opening', function(isOpening) {
          if (!isOpening) {
            measure();
            setUpWindowResizeListeners();
            return unbindOpeningWatcher();
          }
        });

        var measure = function() {
          let availableSpace = element.width();
          let noOfShowableButtons = Math.floor(availableSpace / BUTTON_WIDTH);

          if (noOfShowableButtons < scope.buttons.length) {
            scope.showMore = true;

            availableSpace = availableSpace - OVERFLOWED_BUTTON_WIDTH;
            noOfShowableButtons = Math.floor(availableSpace / BUTTON_WIDTH);

            return split(noOfShowableButtons);
          } else {
            scope.showMore = false;
            return split(noOfShowableButtons);
          }
        };

        var split = splitIndex =>
          scope.$applyAsync(function() {
            scope.shownButtons = scope.buttons.slice(0, splitIndex);
            return scope.overflowedButtons = scope.buttons.slice(splitIndex);
          })
        ;

        const debouncedMeasure = _.debounce(measure, 300);

        var setUpWindowResizeListeners = function() {
          $(window).on('resize', debouncedMeasure);
          if (attrs.resizeOn != null) {
            return Array.from(attrs.resizeOn.split(',')).map((event) =>
              scope.$on(event, debouncedMeasure));
          }
        };

        const tearDownResizeListeners = () => $(window).off('resize', debouncedMeasure);

        scope.$watch('$destroy', () => tearDownResizeListeners());

        return scope.$watch('isFullscreenEditor', function(oldVal, newVal) {
          if (oldVal === newVal) { return; }
          return debouncedMeasure();
        });
      },

      templateUrl: 'formattingButtonsTpl'
    })
);
});
