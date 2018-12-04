/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base', 'ide/history/util/displayNameForUser'], function(
  App,
  displayNameForUser
) {
  App.controller('HistoryCompareController', [
    '$scope',
    '$modal',
    'ide',
    '_',
    function($scope, $modal, ide, _) {
      $scope.projectUsers = []
      $scope.versionsWithLabels = []

      $scope.$watch('project.members', function(newVal) {
        if (newVal != null) {
          return ($scope.projectUsers = newVal.concat($scope.project.owner))
        }
      })

      $scope.$watchCollection('history.labels', function(labels) {
        if (labels != null && labels.length > 0) {
          const groupedLabelsHash = _.groupBy(labels, 'version')
          $scope.versionsWithLabels = _.map(
            groupedLabelsHash,
            (labels, version) => {
              return {
                version: parseInt(version, 10),
                labels
              }
            }
          )
        }
      })

      $scope.loadMore = () => ide.historyManager.fetchNextBatchOfUpdates()

      $scope.setHoverFrom = fromV => ide.historyManager.setHoverFrom(fromV)

      $scope.setHoverTo = toV => ide.historyManager.setHoverTo(toV)

      $scope.resetHover = () => ide.historyManager.resetHover()

      // This method (and maybe the one below) will be removed soon. User details data will be
      // injected into the history API responses, so we won't need to fetch user data from other
      // local data structures.
      $scope.getUserById = id =>
        _.find($scope.projectUsers, function(user) {
          const curUserId =
            (user != null ? user._id : undefined) ||
            (user != null ? user.id : undefined)
          return curUserId === id
        })

      $scope.getDisplayNameById = id =>
        displayNameForUser($scope.getUserById(id))

      $scope.deleteLabel = labelDetails =>
        $modal.open({
          templateUrl: 'historyV2DeleteLabelModalTemplate',
          controller: 'HistoryV2DeleteLabelModalController',
          resolve: {
            labelDetails() {
              return labelDetails
            }
          }
        })
    }
  ])
})
