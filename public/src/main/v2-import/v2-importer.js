define(['base'], function(App) {
  function v2ImporterController($scope, $element, $attrs, $http) {
    const ctrl = this

    ctrl.doImport = () => {}
  }

  return App.component('v2Importer', {
    bindings: {
      projectId: '@'
    },
    controller: v2ImporterController,
    templateUrl: 'v2ImporterTemplate'
  })
})
