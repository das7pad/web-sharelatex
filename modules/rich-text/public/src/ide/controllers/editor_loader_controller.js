import App from 'base'
import EventEmitter from 'utils/EventEmitter'

App.controller('EditorLoaderController', function($scope, localStorage) {
  $scope.richText = {
    bundle: null,
    formattingEvents: new EventEmitter()
  }

  $scope.$watch('editor.showRichText', function(val) {
    localStorage(
      `editor.mode.${$scope.project_id}`,
      val === true ? 'rich-text' : 'source'
    )

    if (val && !$scope.richText.bundle) {
      import(/* webpackChunkName: "rich-text" */ '../../rich_text_editor').then(bundle =>
        $scope.$applyAsync(() => ($scope.richText.bundle = bundle))
      )
    }
  })
})
