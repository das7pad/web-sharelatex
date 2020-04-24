/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  '../../../../frontend/js/ide/controllers/editor_loader_controller',
  '../../../../../../frontend/js/utils/EventEmitter',
  'angular-mocks'
], (EditorLoaderController, EventEmitter) =>
  describe('EditorLoaderController', function() {
    beforeEach(window.module('SharelatexApp'))

    it('inits richText scope', function() {
      inject(($rootScope, $controller) => {
        const $scope = $rootScope.$new()
        $controller('EditorLoaderController', { $scope })

        expect($scope.richText.bundle).to.equal(null)
        return expect($scope.richText.formattingEvents).to.be.an.instanceof(
          EventEmitter
        )
      })
    })

    it('watches showRichText and loads bundle if true', function(done) {
      return inject(($rootScope, $controller) => {
        const $scope = $rootScope.$new()
        $scope.editor = { showRichText: false }

        $controller('EditorLoaderController', { $scope })

        $scope.editor.showRichText = true
        $rootScope.$digest()

        expect($scope.richText.bundleLoading).to.not.equal(null)
        $scope.richText.bundleLoading
          .then(() => {
            expect($scope.richText.bundle).to.not.equal(null)
          })
          .finally(() => {
            expect($scope.richText.bundleLoading).to.equal(null)
            done()
          })
      })
    })

    return it('watches showRichText and does nothing if false', function() {
      return inject(($rootScope, $controller) => {
        const $scope = $rootScope.$new()
        $scope.editor = { showRichText: true }

        $controller('EditorLoaderController', { $scope })

        $scope.editor.showRichText = false
        $rootScope.$digest()

        expect($scope.richText.bundleLoading).to.equal(null)
        expect($scope.richText.bundle).to.equal(null)
      })
    })
  }))
