define [
  "base"
  "utils/EventEmitter"
], (App, EventEmitter) ->
  App.controller "EditorLoaderController", ($scope, ide) ->
    $scope.richText = {
      bundle: null
      formattingEvents: new EventEmitter()
    }

    $scope.$watch "editor.showRichText", (val) ->
      if val and !$scope.richText.bundle
        requirejs ['rich-text'], (bundle) ->
          $scope.$applyAsync () ->
            $scope.richText.bundle = bundle
