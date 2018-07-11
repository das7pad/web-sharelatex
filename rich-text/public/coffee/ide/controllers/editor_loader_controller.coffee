define [
  "base"
  "utils/EventEmitter"
], (App, EventEmitter) ->
  App.controller "EditorLoaderController", ($scope, localStorage) ->
    $scope.richText = {
      bundle: null
      formattingEvents: new EventEmitter()
    }

    $scope.$watch "editor.showRichText", (val) ->
      localStorage(
        "editor.mode.#{$scope.project_id}",
        if val == true then 'rich-text' else 'source'
      )

      if val and !$scope.richText.bundle
        requirejs ['rich-text'], (bundle) ->
          $scope.$applyAsync () ->
            $scope.richText.bundle = bundle
