define ["base"], (App) ->
  App.controller "EditorLoaderController", ($scope) ->
    $scope.richText = {
      bundle: null
      editor: null
    }

    $scope.$watch "editor.showRichText", () ->
      requirejs ['rich-text'], (bundle) ->
        $scope.richText.bundle = bundle
