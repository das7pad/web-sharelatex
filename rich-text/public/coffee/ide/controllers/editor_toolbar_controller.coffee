define [
  "base"
  "ide/editor/Document"
], (App, Document) ->
  App.controller "EditorToolbarController", ($scope, ide) ->
    $scope.logEditor = () ->
      $scope.richText.formattingEvents.trigger('logEditor')
