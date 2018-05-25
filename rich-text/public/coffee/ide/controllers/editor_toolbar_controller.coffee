define [
  "base"
  "ide/editor/Document"
], (App, Document) ->
  App.controller "EditorToolbarController", ($scope, ide) ->
    $scope.logEditor = () ->
      console.log($scope.richText.editor)
