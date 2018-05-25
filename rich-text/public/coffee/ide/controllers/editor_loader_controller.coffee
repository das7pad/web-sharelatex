define [
  "base"
  "ide/rich-text/rich_text_adapter"
], (App, RichTextAdapter) ->
  App.controller "EditorLoaderController", ($scope, ide) ->
    $scope.richText = {
      bundle: null
      editor: null
    }

    $scope.$watch "editor.showRichText", (val) ->
      if val and !$scope.richText.bundle
        requirejs ['rich-text'], (bundle) ->
          $scope.$applyAsync () ->
            $scope.richText.bundle = bundle

      if !val and $scope.richText.editor
        $scope.richText.editor = null

    $scope.initCodeMirror = (element) ->
      $scope.richText.editor = new $scope.richText.bundle.Editor(
        element,
        new RichTextAdapter(ide.fileTreeManager)
      )
