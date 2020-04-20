import App from '../../../../../../frontend/js/base'
import EventEmitter from '../../../../../../frontend/js/utils/EventEmitter'

App.controller('EditorLoaderController', function ($scope, localStorage) {
  $scope.richText = {
    bundle: null,
    bundleLoading: null,
    formattingEvents: new EventEmitter()
  }

  $scope.$watch('editor.showRichText', function (val) {
    localStorage(
      `editor.mode.${$scope.project_id}`,
      val === true ? 'rich-text' : 'source'
    )

    if (val && !$scope.richText.bundle && !$scope.richText.bundleLoading) {
      const MathJaxLoading = import(
        '../../../../../../frontend/js/MathJaxBundle'
      )
      const richTextLoading = import(
        /* webpackChunkName: "rich-text" */ '../../rich_text_editor'
      )
      $scope.richText.bundleLoading = Promise.all([
        richTextLoading,
        MathJaxLoading
      ])
        .then(() =>
          richTextLoading.then((bundle) =>
            $scope.$applyAsync(() => ($scope.richText.bundle = bundle))
          )
        )
        .finally(() => ($scope.richText.bundleLoading = null))
    }
  })
})
