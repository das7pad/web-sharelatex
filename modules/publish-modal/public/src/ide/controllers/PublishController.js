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
define(['base'], App =>
  App.controller(
    'PublishController',
    ($scope, $modal, CobrandingDataService) =>
      ($scope.openPublishProjectModal = function() {
        $modal.open({
          templateUrl: 'publishProjectModalTemplate',
          scope: $scope,
          size: 'lg'
        })

        return requirejs(['publish-modal'], function(pm) {
          let downloadLink
          if ($scope.pdf.url) {
            downloadLink = $scope.pdf.downloadUrl
          }

          const initParams = {
            projectId: $scope.project_id,
            pdfUrl: downloadLink,
            logs: $scope.pdf.logEntries,
            hasFolders: window._ide.fileTreeManager.projectContainsFolder(),
            firstName: $scope.user.first_name,
            lastName: $scope.user.last_name,
            title: $scope.project.name
          }
          const publishModalConfig = {
            isBranded:
              CobrandingDataService.isProjectCobranded() &&
              ((CobrandingDataService.getPublishGuideHtml() != null &&
                CobrandingDataService.getPublishGuideHtml() !== '') ||
                CobrandingDataService.getPartner() != null),
            brandedMenu: CobrandingDataService.hasBrandedMenu(),
            brandId: CobrandingDataService.getBrandId(),
            brandVariationId: CobrandingDataService.getBrandVariationId(),
            partner: CobrandingDataService.getPartner()
          }
          const modalBody = document.getElementsByClassName(
            'modal-body-publish'
          )[0]
          return pm.init(modalBody, initParams, publishModalConfig)
        })
      })
  ))
