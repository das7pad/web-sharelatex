/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  'moment',
  'ide/colors/ColorManager',
  'ide/history/util/displayNameForUser',
  'ide/history/util/HistoryViewModes',
  'ide/history/controllers/HistoryV2ListController',
  'ide/history/controllers/HistoryV2DiffController',
  'ide/history/controllers/HistoryV2FileTreeController',
  'ide/history/controllers/HistoryV2ToolbarController',
  'ide/history/controllers/HistoryV2AddLabelModalController',
  'ide/history/controllers/HistoryV2DeleteLabelModalController',
  'ide/history/directives/infiniteScroll',
  'ide/history/components/historyEntriesList',
  'ide/history/components/historyEntry',
  'ide/history/components/historyLabelsList',
  'ide/history/components/historyLabel',
  'ide/history/components/historyFileTree',
  'ide/history/components/historyFileEntity'
], function(moment, ColorManager, displayNameForUser, HistoryViewModes) {
  let HistoryManager
  return (HistoryManager = (function() {
    HistoryManager = class HistoryManager {
      static initClass() {
        this.prototype.MAX_RECENT_UPDATES_TO_SELECT = 5

        this.prototype.BATCH_SIZE = 10
      }
      constructor(ide, $scope) {
        this.labelCurrentVersion = this.labelCurrentVersion.bind(this)
        this.deleteLabel = this.deleteLabel.bind(this)
        this._addLabelToLocalUpdate = this._addLabelToLocalUpdate.bind(this)
        this.ide = ide
        this.$scope = $scope
        this.hardReset()
        this.$scope.HistoryViewModes = HistoryViewModes

        this.$scope.toggleHistory = () => {
          if (this.$scope.ui.view === 'history') {
            this.hide()
          } else {
            this.show()
            this._handleHistoryUIStateChange()
          }
          this.ide.$timeout(() => {
            this.$scope.$broadcast('history:toggle')
          }, 0)
        }

        this.$scope.toggleHistoryViewMode = () => {
          if (this.$scope.history.viewMode === HistoryViewModes.COMPARE) {
            this.softReset()
            this.$scope.history.viewMode = HistoryViewModes.POINT_IN_TIME
          } else {
            this.softReset()
            this.$scope.history.viewMode = HistoryViewModes.COMPARE
          }
          this._handleHistoryUIStateChange()
          this.ide.$timeout(() => {
            this.$scope.$broadcast('history:toggle')
          }, 0)
        }

        this.$scope.$watch(
          'history.showOnlyLabels',
          (showOnlyLabels, prevVal) => {
            if (showOnlyLabels != null && showOnlyLabels !== prevVal) {
              this._handleHistoryUIStateChange()
            }
          }
        )

        this.$scope.$watchGroup(
          ['history.selection.range.toV', 'history.selection.range.fromV'],
          (newRange, prevRange) => {
            if (this.$scope.history.viewMode === HistoryViewModes.COMPARE) {
              let [newTo, newFrom] = newRange
              let [prevTo, prevFrom] = prevRange
              if (
                newTo &&
                newFrom &&
                newTo !== prevTo &&
                newFrom !== prevFrom
              ) {
                this.loadFileTreeDiff(newTo, newFrom).then(response =>
                  console.log(response)
                )
              }
            }
          }
        )

        this.$scope.$watch('history.selection.pathname', pathname => {
          if (pathname != null) {
            if (
              this.$scope.history.viewMode === HistoryViewModes.POINT_IN_TIME
            ) {
              this.loadFileAtPointInTime()
            } else {
              this.reloadDiff()
            }
          }
        })

        let _deregisterFeatureWatcher = this.$scope.$watch(
          'project.features.versioning',
          hasVersioning => {
            if (hasVersioning != undefined) {
              this.$scope.history.userHasFullFeature = hasVersioning
              _deregisterFeatureWatcher()
            }
          }
        )
      }

      show() {
        this.$scope.ui.view = 'history'
        this.hardReset()
        this.$scope.history.viewMode = HistoryViewModes.POINT_IN_TIME
      }

      hide() {
        this.$scope.ui.view = 'editor'
      }

      hardReset() {
        this.$scope.history = {
          isV2: true,
          updates: [],
          viewMode: null,
          nextBeforeTimestamp: null,
          atEnd: false,
          userHasFullFeature: undefined,
          freeHistoryLimitHit: false,
          selection: {
            docs: {},
            pathname: null,
            range: {
              fromV: null,
              toV: null
            },
            hoveredRange: {
              fromV: null,
              toV: null
            },
            diff: null, // When history.viewMode == HistoryViewModes.COMPARE
            files: [], // When history.viewMode == HistoryViewModes.COMPARE
            update: null, // When history.viewMode == HistoryViewModes.POINT_IN_TIME
            label: null, // When history.viewMode == HistoryViewModes.POINT_IN_TIME
            file: null // When history.viewMode == HistoryViewModes.POINT_IN_TIME
          },
          error: null,
          showOnlyLabels: false,
          labels: null,
          loadingFileTree: true
        }
      }

      softReset() {
        ;(this.$scope.history.viewMode = null),
          (this.$scope.history.selection = {
            docs: {},
            pathname: null,
            range: {
              fromV: null,
              toV: null
            },
            hoveredRange: {
              fromV: null,
              toV: null
            },
            diff: null, // When history.viewMode == HistoryViewModes.COMPARE
            files: [], // When history.viewMode == HistoryViewModes.COMPARE
            update: null, // When history.viewMode == HistoryViewModes.POINT_IN_TIME
            label: null, // When history.viewMode == HistoryViewModes.POINT_IN_TIME
            file: null // When history.viewMode == HistoryViewModes.POINT_IN_TIME
          })
        this.$scope.history.error = null
        this.$scope.history.showOnlyLabels = false
        this.$scope.history.loadingFileTree = true
      }

      _handleHistoryUIStateChange() {
        if (this.$scope.history.viewMode === HistoryViewModes.COMPARE) {
          if (this.$scope.history.showOnlyLabels) {
            this.autoSelectLabelsForComparison()
          } else {
            this.autoSelectRecentUpdates()
          }
        } else {
          // Point-in-time mode
          if (this.$scope.history.showOnlyLabels) {
            this.selectedLabelFromUpdatesSelection()
          } else {
            this.autoSelectLastVersionForPointInTime()
          }
        }
      }

      setHoverFrom(fromV) {
        let selection = this.$scope.history.selection
        selection.hoveredRange.fromV = fromV
        selection.hoveredRange.toV = selection.range.toV
        this.$scope.history.hoveringOverListSelectors = true
      }

      setHoverTo(toV) {
        let selection = this.$scope.history.selection
        selection.hoveredRange.toV = toV
        selection.hoveredRange.fromV = selection.range.fromV
        this.$scope.history.hoveringOverListSelectors = true
      }

      resetHover() {
        let selection = this.$scope.history.selection
        selection.hoveredRange.toV = null
        selection.hoveredRange.fromV = null
        this.$scope.history.hoveringOverListSelectors = false
      }

      restoreFile(version, pathname) {
        const url = `/project/${this.$scope.project_id}/restore_file`

        return this.ide.$http.post(url, {
          version,
          pathname,
          _csrf: window.csrfToken
        })
      }

      loadFileTreeForVersion(version) {
        return this._loadFileTree(version, version)
      }

      loadFileTreeDiff(toV, fromV) {
        return this._loadFileTree(toV, fromV)
      }

      _loadFileTree(toV, fromV) {
        let url = `/project/${this.$scope.project_id}/filetree/diff`
        let selection = this.$scope.history.selection
        const query = [`from=${fromV}`, `to=${toV}`]
        url += `?${query.join('&')}`
        this.$scope.history.loadingFileTree = true
        selection.file = null
        selection.pathname = null
        if (selection.diff) {
          selection.diff.loading = true
        }
        return this.ide.$http
          .get(url)
          .then(response => {
            this.$scope.history.selection.files = response.data.diff
          })
          .finally(() => {
            this.$scope.history.loadingFileTree = false
            if (selection.diff) {
              selection.diff.loading = true
            }
          })
      }

      autoSelectRecentUpdates() {
        if (this.$scope.history.updates.length === 0) {
          return
        }

        this.$scope.history.selection.range.toV = this.$scope.history.updates[0].toV

        let indexOfLastUpdateNotByMe = 0
        for (let i = 0; i < this.$scope.history.updates.length; i++) {
          const update = this.$scope.history.updates[i]
          if (
            this._updateContainsUserId(update, this.$scope.user.id) ||
            i > this.MAX_RECENT_UPDATES_TO_SELECT
          ) {
            break
          }
          indexOfLastUpdateNotByMe = i
        }

        this.$scope.history.selection.range.fromV = this.$scope.history.updates[
          indexOfLastUpdateNotByMe
        ].fromV
      }

      autoSelectLastVersionForPointInTime() {
        this.$scope.history.selection.label = null
        if (this.$scope.history.updates.length === 0) {
          return
        }
        return this.selectVersionForPointInTime(
          this.$scope.history.updates[0].toV
        )
      }

      autoSelectLastLabel() {
        if (this.$scope.history.labels.length === 0) {
          return
        }
        return this.selectLabelForPointInTime(this.$scope.history.labels[0])
      }

      expandSelectionToVersion(version) {
        console.log(
          version,
          this.$scope.history.selection.range.toV,
          this.$scope.history.selection.range.fromV
        )
        if (version > this.$scope.history.selection.range.toV) {
          this.$scope.history.selection.range.toV = version
        } else if (version < this.$scope.history.selection.range.fromV) {
          this.$scope.history.selection.range.fromV = version
        }
      }

      selectVersionForPointInTime(version) {
        let selection = this.$scope.history.selection
        selection.range.toV = version
        selection.range.fromV = version
        selection.update = this._getUpdateForVersion(version)
        this.loadFileTreeForVersion(version)
      }

      selectedLabelFromUpdatesSelection() {
        const selectedUpdate = this._getUpdateForVersion(
          this.$scope.history.selection.range.toV
        )
        const nSelectedLabels =
          selectedUpdate.labels != null ? selectedUpdate.labels.length : 0
        // If the currently selected update has no labels, select the last one (version-wise)
        if (nSelectedLabels === 0) {
          this.autoSelectLastLabel()
          // If the update has one label, select it
        } else if (nSelectedLabels === 1) {
          this.selectLabelForPointInTime(
            this.$scope.history.selection.update.labels[0]
          )
          // If there are multiple labels for the update, select the latest
        } else if (nSelectedLabels > 1) {
          const sortedLabels = this.ide.$filter('orderBy')(
            selectedUpdate.labels,
            '-created_at'
          )
          const lastLabelFromUpdate = sortedLabels[0]
          this.selectLabelForPointInTime(lastLabelFromUpdate)
        }
      }

      selectLabelForPointInTime(labelToSelect) {
        let updateToSelect = null

        if (this._isLabelSelected(labelToSelect)) {
          // Label already selected
          return
        }

        for (let update of Array.from(this.$scope.history.updates)) {
          if (update.toV === labelToSelect.version) {
            updateToSelect = update
            break
          }
        }

        this.$scope.history.selection.label = labelToSelect
        if (updateToSelect != null) {
          this.selectVersionForPointInTime(updateToSelect.toV)
        } else {
          this.loadFileTreeForVersion(labelToSelect.version)
        }
      }

      _getUpdateForVersion(version) {
        for (let update of this.$scope.history.updates) {
          if (update.toV === version) {
            return update
          }
        }
      }

      autoSelectLabelsForComparison() {
        let labels = this.$scope.history.labels
        let selection = this.$scope.history.selection
        let nLabels = 0
        if (Array.isArray(labels)) {
          nLabels = labels.length
        }
        if (nLabels === 0) {
          return
        } else if (nLabels === 1) {
          selection.range.toV = labels[0].version
          selection.range.fromV = labels[0].version
        } else {
          selection.range.toV = labels[0].version
          selection.range.fromV = labels[1].version
        }
      }

      // _waitUntilUpdatesAreAvailable(toV, fromV) {
      //   let deferred = this.ide.$q.defer()
      //   let updates = []
      //   let gotToVUpdate = false
      //   let gotFromVUpdate = false
      //   let curUpdatesArrayIndex = 0
      //   let checkUpdates = () => {
      //     this._checkAvailableUpdatesForVersions(
      //       toV,
      //       fromV,
      //       curUpdatesArrayIndex
      //     ).then(function(result) {
      //       gotToVUpdate = result.gotToVUpdate
      //       gotFromVUpdate = result.gotFromVUpdate
      //       curUpdatesArrayIndex = result.lastIndex + 1
      //       if (gotToVUpdate && gotFromVUpdate) {
      //         deferred.resolve(true)
      //       } else {
      //         checkUpdates()
      //       }
      //     })
      //   }
      //   checkUpdates()
      //   return deferred.promise
      // }

      // _checkAvailableUpdatesForVersions(toV, fromV, startIndex) {
      //   let deferred = this.ide.$q.defer()
      //   let result = {
      //     gotToVUpdate: false,
      //     gotFromVUpdate: false,
      //     lastIndex: null
      //   }
      //   let fetchNextBatchOfUpdatesIfNeeded =
      //     startIndex >= this.$scope.history.updates.length
      //       ? this.fetchNextBatchOfUpdates()
      //       : null
      //   this.ide.$q.when(fetchNextBatchOfUpdatesIfNeeded).then(() => {
      //     const nUpdates = this.$scope.history.updates.length
      //     for (var i = startIndex; i < nUpdates; i++) {
      //       let update = this.$scope.history.updates[i]
      //       result.lastIndex = i
      //       if (update.toV <= toV && update.fromV >= fromV) {
      //         result.gotToVUpdate = true
      //       } else if (update.fromV < fromV) {
      //         result.gotFromVUpdate = true
      //         break
      //       }
      //     }
      //     deferred.resolve(result)
      //   })
      //   return deferred.promise
      // }

      fetchNextBatchOfUpdates() {
        let updatesURL = `/project/${this.ide.project_id}/updates?min_count=${
          this.BATCH_SIZE
        }`
        if (this.$scope.history.nextBeforeTimestamp != null) {
          updatesURL += `&before=${this.$scope.history.nextBeforeTimestamp}`
        }
        const labelsURL = `/project/${this.ide.project_id}/labels`

        const requests = { updates: this.ide.$http.get(updatesURL) }

        if (this.$scope.history.labels == null) {
          requests.labels = this.ide.$http.get(labelsURL)
        }

        return this.ide.$q
          .all(requests)
          .then(response => {
            const updatesData = response.updates.data
            if (response.labels != null) {
              this.$scope.history.labels = this._loadLabels(
                response.labels.data,
                updatesData.updates[0].toV
              )
            }
            this._loadUpdates(updatesData.updates)
            this.$scope.history.nextBeforeTimestamp =
              updatesData.nextBeforeTimestamp
            if (
              updatesData.nextBeforeTimestamp == null ||
              this.$scope.history.freeHistoryLimitHit
            ) {
              this.$scope.history.atEnd = true
            }
            if (this.$scope.history.updates.length === 0) {
              this.$scope.history.loadingFileTree = false
            }
          })
          .catch(error => {
            const { status, statusText } = error
            this.$scope.history.error = { status, statusText }
          })
      }

      _loadLabels(labels, lastUpdateToV) {
        sortedLabels = this._sortLabelsByVersionAndDate(labels)
        if (
          sortedLabels.length > 0 &&
          sortedLabels[0].version !== lastUpdateToV
        ) {
          sortedLabels.unshift({
            id: '1',
            isPseudoCurrentStateLabel: true,
            version: lastUpdateToV,
            created_at: new Date().toISOString()
          })
        }

        return sortedLabels
      }

      _sortLabelsByVersionAndDate(labels) {
        return this.ide.$filter('orderBy')(labels, ['-version', '-created_at'])
      }

      loadFileAtPointInTime() {
        const toV = this.$scope.history.selection.range.toV
        const { pathname } = this.$scope.history.selection
        if (toV == null) {
          return
        }
        let url = `/project/${this.$scope.project_id}/diff`
        const query = [
          `pathname=${encodeURIComponent(pathname)}`,
          `from=${toV}`,
          `to=${toV}`
        ]
        url += `?${query.join('&')}`
        this.$scope.history.selection.file = { loading: true }
        return this.ide.$http
          .get(url)
          .then(response => {
            const { text, binary } = this._parseDiff(response.data.diff)
            this.$scope.history.selection.file.binary = binary
            this.$scope.history.selection.file.text = text
            this.$scope.history.selection.file.loading = false
          })
          .catch(function() {})
      }

      reloadDiff() {
        let { diff } = this.$scope.history.selection
        // const { updates } = this.$scope.history.selection
        // const { fromV, toV, pathname } = this._calculateDiffDataFromSelection()
        const { range, pathname } = this.$scope.history.selection
        const { fromV, toV } = range

        if (pathname == null) {
          this.$scope.history.selection.diff = null
          return
        }

        if (
          diff != null &&
          diff.pathname === pathname &&
          diff.fromV === fromV &&
          diff.toV === toV
        ) {
          return this.ide.$q.when(true)
        }

        this.$scope.history.selection.diff = diff = {
          fromV,
          toV,
          pathname,
          error: false
        }

        diff.loading = true
        let url = `/project/${this.$scope.project_id}/diff`
        const query = [`pathname=${encodeURIComponent(pathname)}`]
        if (diff.fromV != null && diff.toV != null) {
          query.push(`from=${diff.fromV}`, `to=${diff.toV}`)
        }
        url += `?${query.join('&')}`
        return this.ide.$http
          .get(url)
          .then(response => {
            const { data } = response
            diff.loading = false
            const { text, highlights, binary } = this._parseDiff(data.diff)
            diff.binary = binary
            diff.text = text
            diff.highlights = highlights
          })
          .catch(function() {
            diff.loading = false
            diff.error = true
          })
      }

      labelCurrentVersion(labelComment) {
        return this._labelVersion(
          labelComment,
          this.$scope.history.selection.range.toV
        )
      }

      deleteLabel(label) {
        const url = `/project/${this.$scope.project_id}/labels/${label.id}`

        return this.ide
          .$http({
            url,
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': window.csrfToken
            }
          })
          .then(response => {
            return this._deleteLabelLocally(label)
          })
      }

      _isLabelSelected(label) {
        return (
          label.id ===
          (this.$scope.history.selection.label != null
            ? this.$scope.history.selection.label.id
            : undefined)
        )
      }

      _deleteLabelLocally(labelToDelete) {
        for (let i = 0; i < this.$scope.history.updates.length; i++) {
          const update = this.$scope.history.updates[i]
          if (update.toV === labelToDelete.version) {
            update.labels = _.filter(
              update.labels,
              label => label.id !== labelToDelete.id
            )
            break
          }
        }
        return (this.$scope.history.labels = _.filter(
          this.$scope.history.labels,
          label => label.id !== labelToDelete.id
        ))
      }

      _parseDiff(diff) {
        if (diff.binary) {
          return { binary: true }
        }
        let row = 0
        let column = 0
        const highlights = []
        let text = ''
        const iterable = diff || []
        for (let i = 0; i < iterable.length; i++) {
          var endColumn, endRow
          const entry = iterable[i]
          let content = entry.u || entry.i || entry.d
          if (!content) {
            content = ''
          }
          text += content
          const lines = content.split('\n')
          const startRow = row
          const startColumn = column
          if (lines.length > 1) {
            endRow = startRow + lines.length - 1
            endColumn = lines[lines.length - 1].length
          } else {
            endRow = startRow
            endColumn = startColumn + lines[0].length
          }
          row = endRow
          column = endColumn

          const range = {
            start: {
              row: startRow,
              column: startColumn
            },
            end: {
              row: endRow,
              column: endColumn
            }
          }

          if (entry.i != null || entry.d != null) {
            const user =
              entry.meta.users != null ? entry.meta.users[0] : undefined
            const name = displayNameForUser(user)
            const date = moment(entry.meta.end_ts).format('Do MMM YYYY, h:mm a')
            if (entry.i != null) {
              highlights.push({
                label: `Added by ${name} on ${date}`,
                highlight: range,
                hue: ColorManager.getHueForUserId(
                  user != null ? user.id : undefined
                )
              })
            } else if (entry.d != null) {
              highlights.push({
                label: `Deleted by ${name} on ${date}`,
                strikeThrough: range,
                hue: ColorManager.getHueForUserId(
                  user != null ? user.id : undefined
                )
              })
            }
          }
        }

        return { text, highlights }
      }

      _loadUpdates(updates) {
        if (updates == null) {
          updates = []
        }
        let previousUpdate = this.$scope.history.updates[
          this.$scope.history.updates.length - 1
        ]
        const dateTimeNow = new Date()
        const timestamp24hoursAgo = dateTimeNow.setDate(
          dateTimeNow.getDate() - 1
        )
        let cutOffIndex = null

        const iterable = updates || []
        for (let i = 0; i < iterable.length; i++) {
          const update = iterable[i]
          for (let user of Array.from(update.meta.users || [])) {
            if (user != null) {
              user.hue = ColorManager.getHueForUserId(user.id)
            }
          }
          if (
            previousUpdate == null ||
            !moment(previousUpdate.meta.end_ts).isSame(
              update.meta.end_ts,
              'day'
            )
          ) {
            update.meta.first_in_day = true
          }

          previousUpdate = update

          if (
            !this.$scope.history.userHasFullFeature &&
            update.meta.end_ts < timestamp24hoursAgo
          ) {
            cutOffIndex = i || 1 // Make sure that we show at least one entry (to allow labelling).
            this.$scope.history.freeHistoryLimitHit = true
          }
        }

        const firstLoad = this.$scope.history.updates.length === 0

        if (!this.$scope.history.userHasFullFeature && cutOffIndex != null) {
          updates = updates.slice(0, cutOffIndex)
        }

        this.$scope.history.updates = this.$scope.history.updates.concat(
          updates
        )

        if (firstLoad) {
          // Make sure that at least the first update is visible
          this._handleHistoryUIStateChange()
        }
      }

      _labelVersion(comment, version) {
        const url = `/project/${this.$scope.project_id}/labels`
        return this.ide.$http
          .post(url, {
            comment,
            version,
            _csrf: window.csrfToken
          })
          .then(response => {
            return this._addLabelToLocalUpdate(response.data)
          })
      }

      _addLabelToLocalUpdate(label) {
        const localUpdate = _.find(
          this.$scope.history.updates,
          update => update.toV === label.version
        )
        if (localUpdate != null) {
          localUpdate.labels = this._sortLabelsByVersionAndDate(
            localUpdate.labels.concat(label)
          )
        }
        return (this.$scope.history.labels = this._sortLabelsByVersionAndDate(
          this.$scope.history.labels.concat(label)
        ))
      }

      // _perDocSummaryOfUpdates(updates) {
      //   // Track current_pathname -> original_pathname
      //   // create bare object for use as Map
      //   // http://ryanmorr.com/true-hash-maps-in-javascript/
      //   const original_pathnames = Object.create(null)

      //   // Map of original pathname -> doc summary
      //   const docs_summary = Object.create(null)

      //   const updatePathnameWithUpdateVersions = function(
      //     pathname,
      //     update,
      //     deletedAtV
      //   ) {
      //     // docs_summary is indexed by the original pathname the doc
      //     // had at the start, so we have to look this up from the current
      //     // pathname via original_pathname first
      //     if (original_pathnames[pathname] == null) {
      //       original_pathnames[pathname] = pathname
      //     }
      //     const original_pathname = original_pathnames[pathname]
      //     const doc_summary =
      //       docs_summary[original_pathname] != null
      //         ? docs_summary[original_pathname]
      //         : (docs_summary[original_pathname] = {
      //             fromV: update.fromV,
      //             toV: update.toV
      //           })
      //     doc_summary.fromV = Math.min(doc_summary.fromV, update.fromV)
      //     doc_summary.toV = Math.max(doc_summary.toV, update.toV)
      //     if (deletedAtV != null) {
      //       return (doc_summary.deletedAtV = deletedAtV)
      //     }
      //   }

      //   // Put updates in ascending chronological order
      //   updates = this._getSelectedUpdates()
      //   for (let update of Array.from(updates)) {
      //     for (let pathname of Array.from(update.pathnames || [])) {
      //       updatePathnameWithUpdateVersions(pathname, update)
      //     }
      //     for (let project_op of Array.from(update.project_ops || [])) {
      //       if (project_op.rename != null) {
      //         const { rename } = project_op
      //         updatePathnameWithUpdateVersions(rename.pathname, update)
      //         original_pathnames[rename.newPathname] =
      //           original_pathnames[rename.pathname]
      //         delete original_pathnames[rename.pathname]
      //       }
      //       if (project_op.add != null) {
      //         const { add } = project_op
      //         updatePathnameWithUpdateVersions(add.pathname, update)
      //       }
      //       if (project_op.remove != null) {
      //         const { remove } = project_op
      //         updatePathnameWithUpdateVersions(
      //           remove.pathname,
      //           update,
      //           project_op.atV
      //         )
      //       }
      //     }
      //   }

      //   return docs_summary
      // }

      // _getSelectedUpdates() {
      //   let { toV, fromV } = this.$scope.history.selection.range
      //   let selectedUpdates = []
      //   for (let update of this.$scope.history.updates) {
      //     if (update.toV <= toV && update.fromV >= fromV) {
      //       selectedUpdates.push(update)
      //     }
      //     if (update.fromV <= fromV) {
      //       break
      //     }
      //   }
      //   return selectedUpdates.reverse()
      // }

      // _calculateDiffDataFromSelection() {
      //   let pathname, toV
      //   let fromV = (toV = pathname = null)

      //   const selected_pathname = this.$scope.history.selection.pathname

      //   const object = this._perDocSummaryOfUpdates()
      //   for (pathname in object) {
      //     const doc = object[pathname]
      //     if (pathname === selected_pathname) {
      //       ;({ fromV, toV } = doc)
      //       return { fromV, toV, pathname }
      //     }
      //   }

      //   return {}
      // }

      // Set the track changes selected doc to one of the docs in the range
      // of currently selected updates. If we already have a selected doc
      // then prefer this one if present.
      // _selectDocFromUpdates() {
      //   let pathname
      //   const affected_docs = this._perDocSummaryOfUpdates()
      //   this.$scope.history.selection.docs = affected_docs

      //   let selected_pathname = this.$scope.history.selection.pathname
      //   if (selected_pathname != null && affected_docs[selected_pathname]) {
      //     // Selected doc is already open
      //   } else {
      //     // Set to first possible candidate
      //     for (pathname in affected_docs) {
      //       const doc = affected_docs[pathname]
      //       selected_pathname = pathname
      //       break
      //     }
      //   }

      //   this.$scope.history.selection.pathname = selected_pathname
      // }

      _updateContainsUserId(update, user_id) {
        for (let user of Array.from(update.meta.users)) {
          if ((user != null ? user.id : undefined) === user_id) {
            return true
          }
        }
        return false
      }
    }
    HistoryManager.initClass()
    return HistoryManager
  })())
})

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
