/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  "base",
  "utils/EventEmitter"
], (App, EventEmitter) =>
  App.controller("EditorLoaderController", function($scope, localStorage) {
    $scope.richText = {
      bundle: null,
      formattingEvents: new EventEmitter()
    };

    return $scope.$watch("editor.showRichText", function(val) {
      localStorage(
        `editor.mode.${$scope.project_id}`,
        val === true ? 'rich-text' : 'source'
      );

      if (val && !$scope.richText.bundle) {
        return requirejs(['rich-text'], bundle =>
          $scope.$applyAsync(() => $scope.richText.bundle = bundle)
        );
      }
    });
  })
);
