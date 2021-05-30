import App from '../../../base'
import HumanReadableLogs from '../../human-readable-logs/HumanReadableLogs'
import BibLogParser from 'libs/bib-log-parser'
import PreviewPane from '../../../features/preview/components/preview-pane'
import { react2angular } from 'react2angular'
import { rootContext } from '../../../shared/context/root-context'
import 'ace/ace'
import { localStorage } from '../../../modules/storage'
import getMeta from '../../../utils/meta'

const AUTO_COMPILE_MAX_WAIT = 5000
// We add a 1 second debounce to sending user changes to server if they aren't
// collaborating with anyone. This needs to be higher than that, and allow for
// client to server latency, otherwise we compile before the op reaches the server
// and then again on ack.
const AUTO_COMPILE_DEBOUNCE = 2000

App.filter('trusted', $sce => url => $sce.trustAsResourceUrl(url))

App.controller(
  'PdfController',
  function ($scope, $http, ide, $modal, synctex, eventTracking, $q) {
    let autoCompileOnJoinProject = true

    // pdf.view = uncompiled | pdf | errors
    $scope.pdf.view = $scope.pdf.url ? 'pdf' : 'uncompiled'
    $scope.pdf.clearingCache = false
    $scope.shouldShowLogs = false

    $scope.logsUISubvariant = window.logsUISubvariant

    // view logic to check whether the files dropdown should "drop up" or "drop down"
    $scope.shouldDropUp = false

    // Exposed methods for React layout handling
    $scope.setPdfSplitLayout = function () {
      $scope.$applyAsync(() => $scope.switchToSideBySideLayout('editor'))
    }
    $scope.setPdfFullLayout = function () {
      $scope.$applyAsync(() => $scope.switchToFlatLayout('pdf'))
    }

    const logsContainerEl = document.querySelector('.pdf-logs')
    const filesDropdownEl =
      logsContainerEl && logsContainerEl.querySelector('.files-dropdown')

    // get the top coordinate of the files dropdown as a ratio (to the logs container height)
    // logs container supports scrollable content, so it's possible that ratio > 1.
    function getFilesDropdownTopCoordAsRatio() {
      if (filesDropdownEl == null || logsContainerEl == null) {
        return 0
      }
      return (
        filesDropdownEl.getBoundingClientRect().top /
        logsContainerEl.getBoundingClientRect().height
      )
    }

    $scope.$watch('shouldShowLogs', shouldShow => {
      if (shouldShow) {
        $scope.$applyAsync(() => {
          $scope.shouldDropUp = getFilesDropdownTopCoordAsRatio() > 0.65
        })
      }
    })

    $scope.trackLogHintsLearnMore = function () {
      eventTracking.sendMB('logs-hints-learn-more')
    }

    if (ace.require('ace/lib/useragent').isMac) {
      $scope.modifierKey = 'Cmd'
    } else {
      $scope.modifierKey = 'Ctrl'
    }

    // utility for making a query string from a hash, could use jquery $.param
    function createQueryString(args) {
      const qsArgs = []
      for (const k in args) {
        const v = args[k]
        qsArgs.push(`${k}=${v}`)
      }
      if (qsArgs.length) {
        return `?${qsArgs.join('&')}`
      } else {
        return ''
      }
    }

    // Wait for joinDoc to complete.
    // We may need to read the doc contents for a rootDoc override.
    $scope.$on('doc:after-opened', () => {
      $scope.hasPremiumCompile =
        $scope.project.features.compileGroup === 'priority'
      if (!autoCompileOnJoinProject) {
        return
      }
      autoCompileOnJoinProject = false
      // Apparently the scope is not ready in the same event loop cycle.
      setTimeout(() => {
        $scope.recompile({ isAutoCompileOnLoad: true })
      })
    })

    $scope.$on('pdf:error:display', function () {
      $scope.pdf.view = 'errors'
      $scope.pdf.renderingError = true
    })

    let autoCompileInterval = null
    function autoCompileIfReady() {
      if (
        $scope.pdf.compiling ||
        !$scope.autocompile_enabled ||
        !$scope.pdf.uncompiled
      ) {
        return
      }

      // Only checking linting if syntaxValidation is on and visible to the user
      const autoCompileLintingError =
        ide.$scope.hasLintingError && ide.$scope.settings.syntaxValidation
      if ($scope.autoCompileLintingError !== autoCompileLintingError) {
        $scope.$apply(() => {
          $scope.autoCompileLintingError = autoCompileLintingError
          // We've likely been waiting a while until the user fixed the linting, but we
          // don't want to compile as soon as it is fixed, so reset the timeout.
          $scope.startedTryingAutoCompileAt = Date.now()
          $scope.docLastChangedAt = Date.now()
        })
      }
      if (autoCompileLintingError && $scope.stop_on_validation_error) {
        return
      }

      // If there's a longish compile, don't compile immediately after if user is still typing
      const startedTryingAt = Math.max(
        $scope.startedTryingAutoCompileAt,
        $scope.lastFinishedCompileAt || 0
      )

      const timeSinceStartedTrying = Date.now() - startedTryingAt
      const timeSinceLastChange = Date.now() - $scope.docLastChangedAt

      let shouldCompile = false
      if (timeSinceLastChange > AUTO_COMPILE_DEBOUNCE) {
        // Don't compile in the middle of the user typing
        shouldCompile = true
      } else if (timeSinceStartedTrying > AUTO_COMPILE_MAX_WAIT) {
        // Unless they type for a long time
        shouldCompile = true
      } else if (timeSinceStartedTrying < 0 || timeSinceLastChange < 0) {
        // If time is non-monotonic, assume that the user's system clock has been
        // changed and continue with compile
        shouldCompile = true
      }

      if (shouldCompile) {
        return triggerAutoCompile()
      }
    }

    function triggerAutoCompile() {
      $scope.recompile({ isAutoCompileOnChange: true })
    }

    function startTryingAutoCompile() {
      if (autoCompileInterval != null) {
        return
      }
      $scope.startedTryingAutoCompileAt = Date.now()
      autoCompileInterval = setInterval(autoCompileIfReady, 200)
    }

    function stopTryingAutoCompile() {
      clearInterval(autoCompileInterval)
      autoCompileInterval = null
    }

    $scope.changesToAutoCompile = false
    $scope.$watch('pdf.uncompiled', uncompiledChanges => {
      // don't autocompile if disabled or the pdf is not visible
      if (
        $scope.pdf.uncompiled &&
        $scope.autocompile_enabled &&
        !$scope.ui.pdfHidden
      ) {
        $scope.changesToAutoCompile = true
        startTryingAutoCompile()
      } else {
        $scope.changesToAutoCompile = false
        stopTryingAutoCompile()
      }
    })

    function recalculateUncompiledChanges() {
      if ($scope.docLastChangedAt == null) {
        $scope.pdf.uncompiled = false
      } else if (
        $scope.lastStartedCompileAt == null ||
        $scope.docLastChangedAt > $scope.lastStartedCompileAt
      ) {
        $scope.pdf.uncompiled = true
      } else {
        $scope.pdf.uncompiled = false
      }
    }

    function _updateDocLastChangedAt() {
      $scope.docLastChangedAt = Date.now()
      recalculateUncompiledChanges()
    }

    function onDocChanged() {
      _updateDocLastChangedAt()
    }

    function onDocSaved() {
      // We use the save as a trigger too, to account for the delay between the client
      // and server. Otherwise, we might have compiled after the user made
      // the change on the client, but before the server had it.
      _updateDocLastChangedAt()
    }

    function onCompilingStateChanged(compiling) {
      recalculateUncompiledChanges()
    }

    ide.$scope.$on('doc:changed', onDocChanged)
    ide.$scope.$on('doc:saved', onDocSaved)
    $scope.$watch('pdf.compiling', onCompilingStateChanged)

    $scope.autocompile_enabled =
      localStorage(`autocompile_enabled:${$scope.project_id}`) || false
    $scope.$watch('autocompile_enabled', (newValue, oldValue) => {
      if (newValue != null && oldValue !== newValue) {
        if (newValue === true) {
          $scope.autoCompileLintingError = false
          autoCompileIfReady()
        }
        localStorage(`autocompile_enabled:${$scope.project_id}`, newValue)
        eventTracking.sendMB('autocompile-setting-changed', {
          value: newValue,
        })
      }
    })

    // abort compile if syntax checks fail
    $scope.stop_on_validation_error = localStorage(
      `stop_on_validation_error:${$scope.project_id}`
    )
    if ($scope.stop_on_validation_error == null) {
      $scope.stop_on_validation_error = true
    }
    // turn on for all users by default
    $scope.$watch('stop_on_validation_error', (newValue, oldValue) => {
      if (newValue != null && oldValue !== newValue) {
        localStorage(`stop_on_validation_error:${$scope.project_id}`, newValue)
      }
    })

    $scope.draft = localStorage(`draft:${$scope.project_id}`) || false
    $scope.$watch('draft', (newValue, oldValue) => {
      if (newValue != null && oldValue !== newValue) {
        localStorage(`draft:${$scope.project_id}`, newValue)
      }
    })

    function sendCompileRequest(options) {
      if (options == null) {
        options = {}
      }
      const url = `/project/${$scope.project_id}/compile`
      const params = {}
      if (options.isAutoCompileOnLoad || options.isAutoCompileOnChange) {
        params.auto_compile = true
      }
      // if the previous run was a check, clear the error logs
      if ($scope.check) {
        $scope.pdf.logEntries = {}
      }
      // keep track of whether this is a compile or check
      $scope.check = !!options.check
      if (options.check) {
        eventTracking.sendMB('syntax-check-request')
      }
      // send appropriate check type to clsi
      let checkType
      if ($scope.check) {
        checkType = 'validate' // validate only
      } else if (options.try) {
        checkType = 'silent' // allow use to try compile once
      } else if ($scope.stop_on_validation_error) {
        checkType = 'error' // try to compile
      } else {
        checkType = 'silent' // ignore errors
      }

      // FIXME: Temporarily disable syntax checking as it is causing
      // excessive support requests for projects migrated from v1
      // https://github.com/overleaf/sharelatex/issues/911
      if (checkType === 'error') {
        checkType = 'silent'
      }

      return $http.post(
        url,
        {
          rootDoc_id: options.rootDocOverride_id || null,
          draft: $scope.draft,
          check: checkType,
          // use incremental compile for all users but revert to a full
          // compile if there is a server error
          incrementalCompilesEnabled: !$scope.pdf.error,
          _csrf: window.csrfToken,
        },
        { params }
      )
    }

    function buildPdfDownloadUrl(pdfDownloadDomain, url) {
      if (pdfDownloadDomain) {
        return `${pdfDownloadDomain}${url}`
      } else {
        return url
      }
    }

    function parseCompileResponse(response) {
      // keep last url
      const lastPdfUrl = $scope.pdf.url
      const { pdfDownloadDomain } = response
      // Reset everything
      $scope.pdf.error = false
      $scope.pdf.timedout = false
      $scope.pdf.failure = false
      $scope.pdf.url = null
      $scope.pdf.clsiMaintenance = false
      $scope.pdf.tooRecentlyCompiled = false
      $scope.pdf.renderingError = false
      $scope.pdf.projectTooLarge = false
      $scope.pdf.compileTerminated = false
      $scope.pdf.compileExited = false
      $scope.pdf.failedCheck = false
      $scope.pdf.compileInProgress = false
      $scope.pdf.autoCompileDisabled = false
      if (window.showNewLogsUI) {
        $scope.clsiErrors = {}
      }

      // make a cache to look up files by name
      const fileByPath = {}
      if (response.outputFiles != null) {
        for (const file of response.outputFiles) {
          fileByPath[file.path] = file
        }
      }

      // Reset global context.
      ide.buildId = ''

      // prepare query string
      let qs = {}
      // add a query string parameter for the compile group
      if (response.compileGroup != null) {
        ide.compileGroup = qs.compileGroup = response.compileGroup
      }
      // add a query string parameter for the clsi server id
      if (response.clsiServerId != null) {
        ide.clsiServerId = qs.clsiserverid = response.clsiServerId
      }

      // TODO(das7pad): drop this hack once 2747f0d40af8729304 has landed in clsi
      if (response.status === 'success' && !fileByPath['output.pdf']) {
        response.status = 'failure'
      }

      if (response.status === 'success') {
        $scope.pdf.view = 'pdf'
        $scope.shouldShowLogs = false
        $scope.pdf.lastCompileTimestamp = Date.now()
        $scope.pdf.validation = {}
        $scope.pdf.url = buildPdfDownloadUrl(
          pdfDownloadDomain,
          fileByPath['output.pdf'].url
        )
        // convert the qs hash into a query string and append it
        $scope.pdf.url += createQueryString(qs)

        // Save all downloads as files
        qs.popupDownload = true

        const { build: buildId } = fileByPath['output.pdf']
        ide.buildId = buildId
        $scope.pdf.downloadUrl =
          `/download/project/${$scope.project_id}/build/${buildId}/output/output.pdf` +
          createQueryString(qs)
        fetchLogs(fileByPath, { pdfDownloadDomain })
      } else if (response.status === 'timedout') {
        $scope.pdf.view = 'errors'
        $scope.pdf.timedout = true
        fetchLogs(fileByPath, { pdfDownloadDomain })
        if (
          !$scope.hasPremiumCompile &&
          ide.$scope.project.owner._id === ide.$scope.user.id
        ) {
          eventTracking.send(
            'subscription-funnel',
            'editor-click-feature',
            'compile-timeout'
          )
        }
      } else if (response.status === 'terminated') {
        $scope.pdf.view = 'errors'
        $scope.pdf.compileTerminated = true
        fetchLogs(fileByPath, { pdfDownloadDomain })
      } else if (
        ['validation-fail', 'validation-pass'].includes(response.status)
      ) {
        $scope.pdf.view = 'pdf'
        $scope.pdf.url = lastPdfUrl
        $scope.shouldShowLogs = true
        if (response.status === 'validation-fail') {
          $scope.pdf.failedCheck = true
        }
        eventTracking.sendMB(`syntax-check-${response.status}`)
        fetchLogs(fileByPath, { validation: true, pdfDownloadDomain })
      } else if (response.status === 'exited') {
        $scope.pdf.view = 'pdf'
        $scope.pdf.compileExited = true
        $scope.pdf.url = lastPdfUrl
        $scope.shouldShowLogs = true
        fetchLogs(fileByPath, { pdfDownloadDomain })
      } else if (response.status === 'autocompile-backoff') {
        if ($scope.pdf.isAutoCompileOnLoad) {
          // initial autocompile
          $scope.pdf.view = 'uncompiled'
        } else {
          // background autocompile from typing
          $scope.pdf.view = 'errors'
          $scope.pdf.autoCompileDisabled = true
          $scope.autocompile_enabled = false // disable any further autocompiles
          eventTracking.sendMB('autocompile-rate-limited', {
            hasPremiumCompile: $scope.hasPremiumCompile,
          })
        }
      } else if (response.status === 'project-too-large') {
        $scope.pdf.view = 'errors'
        $scope.pdf.projectTooLarge = true
      } else if (response.status === 'failure') {
        $scope.pdf.view = 'errors'
        $scope.pdf.failure = true
        $scope.shouldShowLogs = true
        fetchLogs(fileByPath, { pdfDownloadDomain })
      } else if (response.status === 'clsi-maintenance') {
        $scope.pdf.view = 'errors'
        $scope.pdf.clsiMaintenance = true
      } else if (response.status === 'unavailable') {
        $scope.pdf.view = 'errors'
        $scope.pdf.clsiUnavailable = true
      } else if (response.status === 'too-recently-compiled') {
        $scope.pdf.view = 'errors'
        $scope.pdf.tooRecentlyCompiled = true
      } else if (response.status === 'validation-problems') {
        $scope.pdf.view = 'validation-problems'
        $scope.pdf.validation = response.validationProblems
        $scope.shouldShowLogs = false
      } else if (response.status === 'compile-in-progress') {
        $scope.pdf.view = 'errors'
        $scope.pdf.compileInProgress = true
      } else {
        // fall back to displaying an error
        $scope.pdf.view = 'errors'
        $scope.pdf.error = true
      }

      if (window.showNewLogsUI) {
        $scope.pdf.compileFailed = false
        // `$scope.clsiErrors` stores the error states nested within `$scope.pdf`
        // for use with React's <PreviewPane errors={$scope.clsiErrors}/>
        $scope.clsiErrors = Object.assign(
          {},
          $scope.pdf.error ? { error: true } : null,
          $scope.pdf.renderingError ? { renderingError: true } : null,
          $scope.pdf.clsiMaintenance ? { clsiMaintenance: true } : null,
          $scope.pdf.clsiUnavailable ? { clsiUnavailable: true } : null,
          $scope.pdf.tooRecentlyCompiled ? { tooRecentlyCompiled: true } : null,
          $scope.pdf.compileTerminated ? { compileTerminated: true } : null,
          $scope.pdf.rateLimited ? { rateLimited: true } : null,
          $scope.pdf.compileInProgress ? { compileInProgress: true } : null,
          $scope.pdf.timedout ? { timedout: true } : null,
          $scope.pdf.autoCompileDisabled ? { autoCompileDisabled: true } : null
        )

        if (
          $scope.pdf.view === 'errors' ||
          $scope.pdf.view === 'validation-problems'
        ) {
          $scope.shouldShowLogs = true
          $scope.pdf.compileFailed = true
        }
      }

      const IGNORE_FILES = ['output.fls', 'output.fdb_latexmk']
      $scope.pdf.outputFiles = []

      if (response.outputFiles == null) {
        return
      }

      // prepare list of output files for download dropdown
      qs = {}
      if (response.clsiServerId != null) {
        qs.clsiserverid = response.clsiServerId
      }
      for (const file of response.outputFiles) {
        if (IGNORE_FILES.indexOf(file.path) === -1) {
          const isOutputFile = /^output\./.test(file.path)
          $scope.pdf.outputFiles.push({
            // Turn 'output.blg' into 'blg file'.
            name: isOutputFile
              ? `${file.path.replace(/^output\./, '')} file`
              : file.path,
            url: file.url + createQueryString(qs),
            main: !!isOutputFile,
            fileName: file.path,
            type: file.type,
          })
        }
      }

      // sort the output files into order, main files first, then others
      $scope.pdf.outputFiles.sort(
        (a, b) => b.main - a.main || a.name.localeCompare(b.name)
      )
    }

    function fetchLogs(fileByPath, options) {
      let blgFile, chktexFile, logFile

      if (options != null ? options.validation : undefined) {
        chktexFile = fileByPath['output.chktex']
      } else {
        logFile = fileByPath['output.log']
        blgFile = fileByPath['output.blg']
      }

      function getFile(name, file) {
        const opts = {
          method: 'GET',
          url: buildPdfDownloadUrl(options.pdfDownloadDomain, file.url),
          params: {
            compileGroup: ide.compileGroup,
            clsiserverid: ide.clsiServerId,
          },
        }
        return $http(opts)
      }

      // accumulate the log entries
      const logEntries = {
        all: [],
        errors: [],
        warnings: [],
        typesetting: [],
      }

      function accumulateResults(newEntries) {
        for (const key of ['all', 'errors', 'warnings', 'typesetting']) {
          if (newEntries[key]) {
            if (newEntries.type != null) {
              for (const entry of newEntries[key]) {
                entry.type = newEntries.type
              }
            }
            logEntries[key] = logEntries[key].concat(newEntries[key])
          }
        }
      }

      // use the parsers for each file type
      function processLog(log) {
        $scope.pdf.rawLog = log
        const { errors, warnings, typesetting } = HumanReadableLogs.parse(log, {
          ignoreDuplicates: true,
        })
        const all = [].concat(errors, warnings, typesetting)
        accumulateResults({ all, errors, warnings, typesetting })
      }

      function processChkTex(log) {
        const errors = []
        const warnings = []
        for (const line of log.split('\n')) {
          var m
          if ((m = line.match(/^(\S+):(\d+):(\d+): (Error|Warning): (.*)/))) {
            const result = {
              file: m[1],
              line: m[2],
              column: m[3],
              level: m[4].toLowerCase(),
              message: `${m[4]}: ${m[5]}`,
            }
            if (result.level === 'error') {
              errors.push(result)
            } else {
              warnings.push(result)
            }
          }
        }
        const all = [].concat(errors, warnings)
        const logHints = HumanReadableLogs.parse({
          type: 'Syntax',
          all,
          errors,
          warnings,
        })
        eventTracking.sendMB('syntax-check-return-count', {
          errors: errors.length,
          warnings: warnings.length,
        })
        accumulateResults(logHints)
      }

      function processBiber(log) {
        const { errors, warnings } = BibLogParser.parse(log, {})
        const all = [].concat(errors, warnings)
        accumulateResults({ type: 'BibTeX:', all, errors, warnings })
      }

      // output the results
      function handleError() {
        $scope.pdf.logEntries = {}
        $scope.pdf.rawLog = ''
      }

      function annotateFiles() {
        $scope.pdf.logEntries = logEntries
        $scope.pdf.logEntryAnnotations = {}
        for (const entry of logEntries.all) {
          if (entry.file != null) {
            entry.file = normalizeFilePath(entry.file)
            const entity = ide.fileTreeManager.findEntityByPath(entry.file)
            if (entity != null) {
              if (!$scope.pdf.logEntryAnnotations[entity.id]) {
                $scope.pdf.logEntryAnnotations[entity.id] = []
              }
              $scope.pdf.logEntryAnnotations[entity.id].push({
                row: entry.line - 1,
                type: entry.level === 'error' ? 'error' : 'warning',
                text: entry.message,
              })
            }
          }
        }
      }

      // retrieve the logfile and process it
      let response
      if (logFile != null) {
        response = getFile('output.log', logFile).then(response =>
          processLog(response.data)
        )

        if (blgFile != null) {
          // retrieve the blg file if present
          response = response.then(() =>
            getFile('output.blg', blgFile).then(
              response => processBiber(response.data),
              () => true
            )
          )
        }
      }

      if (response != null) {
        response.catch(handleError)
      } else {
        handleError()
      }

      if (chktexFile != null) {
        const getChkTex = () =>
          getFile('output.chktex', chktexFile).then(response =>
            processChkTex(response.data)
          )
        // always retrieve the chktex file if present
        if (response != null) {
          response = response.then(getChkTex, getChkTex)
        } else {
          response = getChkTex()
        }
      }

      // display the combined result
      if (response != null) {
        response.finally(() => {
          annotateFiles()
          sendCompileMetrics()
        })
      }
    }

    function sendCompileMetrics() {
      const hasCompiled =
        $scope.pdf.view !== 'errors' &&
        $scope.pdf.view !== 'validation-problems'

      if (hasCompiled && !window.user.alphaProgram) {
        const metadata = {
          errors: $scope.pdf.logEntries.errors.length,
          warnings: $scope.pdf.logEntries.warnings.length,
          typesetting: $scope.pdf.logEntries.typesetting.length,
          newLogsUI: window.showNewLogsUI,
          subvariant: window.showNewLogsUI ? window.logsUISubvariant : null,
        }
        eventTracking.sendMBSampled(
          'compile-result',
          JSON.stringify(metadata),
          0.01
        )
      }
    }

    function getRootDocOverrideId() {
      const rootDocId = $scope.project.rootDoc_id
      const currentDocId = ide.editorManager.getCurrentDocId()
      if (currentDocId === rootDocId) {
        return null // no need to override when in the root doc itself
      }
      const doc = ide.editorManager.getCurrentDocValue()
      if (doc == null) {
        return null
      }
      for (const line of doc.split('\n')) {
        if (/^[^%]*\\documentclass/.test(line)) {
          localStorage(`doc.isValidRootDoc.${currentDocId}`, true)
          return ide.editorManager.getCurrentDocId()
        }
      }
      localStorage(`doc.isValidRootDoc.${currentDocId}`, false)
      return null
    }

    function normalizeFilePath(path) {
      path = path.replace(
        /^(.*)\/compiles\/[0-9a-f]{24}(-[0-9a-f]{24})?\/(\.\/)?/,
        ''
      )
      path = path.replace(/^\/compile\//, '')

      const rootDocDirname = ide.fileTreeManager.getRootDocDirname()
      if (rootDocDirname != null) {
        path = path.replace(/^\.\//, rootDocDirname + '/')
      }

      return path
    }

    $scope.recompile = function (options) {
      if (options == null) {
        options = {}
      }
      if ($scope.pdf.compiling) {
        return
      }

      eventTracking.sendMBSampled('editor-recompile-sampled', options)

      $scope.lastStartedCompileAt = Date.now()
      $scope.pdf.compiling = true
      $scope.pdf.isAutoCompileOnLoad =
        options != null ? options.isAutoCompileOnLoad : undefined // initial autocompile

      if (options != null ? options.force : undefined) {
        // for forced compile, turn off validation check and ignore errors
        $scope.stop_on_validation_error = false
        $scope.shouldShowLogs = false // hide the logs while compiling
        eventTracking.sendMB('syntax-check-turn-off-checking')
      }

      if (options != null ? options.try : undefined) {
        $scope.shouldShowLogs = false // hide the logs while compiling
        eventTracking.sendMB('syntax-check-try-compile-anyway')
      }

      ide.$scope.$broadcast('flush-changes')

      if (options.rootDocOverride_id === undefined) {
        options.rootDocOverride_id = getRootDocOverrideId()
      }

      sendCompileRequest(options)
        .then(function (response) {
          const { data } = response
          $scope.pdf.view = 'pdf'
          $scope.pdf.compiling = false
          parseCompileResponse(data)
        })
        .catch(function (response) {
          const { status } = response
          if (status === 429) {
            $scope.pdf.rateLimited = true
          }
          $scope.pdf.compiling = false
          $scope.pdf.renderingError = false
          $scope.pdf.error = true
          $scope.pdf.view = 'errors'
          if (window.showNewLogsUI) {
            $scope.clsiErrors = { error: true }
            $scope.shouldShowLogs = true
            $scope.pdf.compileFailed = true
          }
        })
        .finally(() => {
          $scope.lastFinishedCompileAt = Date.now()
        })
    }

    // This needs to be public.
    ide.$scope.recompile = $scope.recompile
    // This method is a simply wrapper and exists only for tracking purposes.
    ide.$scope.recompileViaKey = function () {
      $scope.recompile({ keyShortcut: true })
    }

    $scope.stop = function () {
      if (!$scope.pdf.compiling) {
        return
      }

      return $http({
        url: `/project/${$scope.project_id}/compile/stop`,
        method: 'POST',
        params: {
          clsiserverid: ide.clsiServerId,
        },
        headers: {
          'X-Csrf-Token': window.csrfToken,
        },
      })
    }

    $scope.clearCache = function () {
      $scope.pdf.clearingCache = true
      const deferred = $q.defer()

      // disable various download buttons
      $scope.pdf.url = null
      $scope.pdf.downloadUrl = null
      $scope.pdf.outputFiles = []

      $http({
        url: `/project/${$scope.project_id}/output`,
        method: 'DELETE',
        params: {
          clsiserverid: ide.clsiServerId,
        },
        headers: {
          'X-Csrf-Token': window.csrfToken,
        },
      })
        .then(function (response) {
          $scope.pdf.clearingCache = false
          return deferred.resolve()
        })
        .catch(function (response) {
          console.error(response)
          const error = response.data
          $scope.pdf.clearingCache = false
          $scope.pdf.renderingError = false
          $scope.pdf.error = true
          $scope.pdf.view = 'errors'
          return deferred.reject(error)
        })
      return deferred.promise
    }

    $scope.recompileFromScratch = function () {
      $scope.pdf.compiling = true
      return $scope
        .clearCache()
        .then(() => {
          $scope.pdf.compiling = false
          $scope.recompile()
        })
        .catch(error => {
          console.error(error)
        })
    }

    $scope.toggleLogs = function () {
      $scope.$applyAsync(() => {
        $scope.shouldShowLogs = !$scope.shouldShowLogs
        if ($scope.shouldShowLogs) {
          eventTracking.sendMBOnce('ide-open-logs-once')
        }
      })
    }

    $scope.showPdf = function () {
      $scope.pdf.view = 'pdf'
      $scope.shouldShowLogs = false
    }

    $scope.toggleRawLog = function () {
      $scope.pdf.showRawLog = !$scope.pdf.showRawLog
      if ($scope.pdf.showRawLog) {
        eventTracking.sendMB('logs-view-raw')
      }
    }

    $scope.openClearCacheModal = function () {
      $modal.open({
        templateUrl: 'clearCacheModalTemplate',
        controller: 'ClearCacheModalController',
        scope: $scope,
      })
    }

    $scope.syncToCode = function (position) {
      synctex.syncToCode(position).then(function (data) {
        const { doc, line } = data
        ide.editorManager.openDoc(doc, { gotoLine: line })
      })
    }

    $scope.setAutoCompile = function (isOn) {
      $scope.$applyAsync(function () {
        $scope.autocompile_enabled = isOn
      })
    }
    $scope.setDraftMode = function (isOn) {
      $scope.$applyAsync(function () {
        $scope.draft = isOn
      })
    }
    $scope.setSyntaxCheck = function (isOn) {
      $scope.$applyAsync(function () {
        $scope.stop_on_validation_error = isOn
      })
    }
    $scope.runSyntaxCheckNow = function () {
      $scope.$applyAsync(function () {
        $scope.recompile({ check: true })
      })
    }

    $scope.openInEditor = function (entry) {
      let column, line
      eventTracking.sendMBOnce('logs-jump-to-location-once')
      const entity = ide.fileTreeManager.findEntityByPath(entry.file)
      if (entity == null || entity.type !== 'doc') {
        return
      }
      if (entry.line != null) {
        line = entry.line
      }
      if (entry.column != null) {
        column = entry.column
      }
      ide.editorManager.openDoc(entity, {
        gotoLine: line,
        gotoColumn: column,
      })
    }

    const initialRootDocId = getMeta('ol-projectRootDoc_id')
    const lastOpenedDoc = localStorage(`doc.open_id.${$scope.project_id}`)
    let lastOpenedDocIsValidRootDoc
    if (lastOpenedDoc) {
      lastOpenedDocIsValidRootDoc = localStorage(
        `doc.isValidRootDoc.${lastOpenedDoc}`
      )
    }
    if (
      // This project has not been opened yet.
      !lastOpenedDoc ||
      // The last time this project was open, the rootDoc was open.
      lastOpenedDoc === initialRootDocId ||
      // A manual compile request with this doc opened was triggered before.
      typeof lastOpenedDocIsValidRootDoc === 'boolean'
    ) {
      // Fast path: Trigger compile request before joinProject yields.
      $scope.recompile({
        rootDocOverride_id:
          // Set the custom rootDoc when valid, else use null for default.
          (lastOpenedDocIsValidRootDoc && lastOpenedDoc) || null,
        isAutoCompileOnLoad: true,
      })
      autoCompileOnJoinProject = false
    }
  }
)

App.factory('synctex', function (ide, $http, $q) {
  const synctex = {
    syncToPdfInFlight: false,
    syncToCodeInFlight: false,

    syncToPdf(cursorPosition) {
      const deferred = $q.defer()

      const docId = ide.editorManager.getCurrentDocId()
      if (docId == null) {
        deferred.reject()
        return deferred.promise
      }
      const doc = ide.fileTreeManager.findEntityById(docId)
      if (doc == null) {
        deferred.reject()
        return deferred.promise
      }
      let path = ide.fileTreeManager.getEntityPath(doc)
      if (path == null) {
        deferred.reject()
        return deferred.promise
      }

      // If the root file is folder/main.tex, then synctex sees the
      // path as folder/./main.tex
      const rootDocDirname = ide.fileTreeManager.getRootDocDirname()
      if (rootDocDirname != null && rootDocDirname !== '') {
        path = path.replace(RegExp(`^${rootDocDirname}`), `${rootDocDirname}/.`)
      }

      const { row, column } = cursorPosition

      this.syncToPdfInFlight = true

      $http({
        url: `/project/${ide.project_id}/sync/code`,
        method: 'GET',
        params: {
          file: path,
          line: row + 1,
          column,
          buildId: ide.buildId,
          clsiserverid: ide.clsiServerId,
        },
      })
        .then(response => {
          this.syncToPdfInFlight = false
          const { data } = response
          return deferred.resolve(data.pdf || [])
        })
        .catch(response => {
          this.syncToPdfInFlight = false
          const error = response.data
          return deferred.reject(error)
        })

      return deferred.promise
    },

    syncToCode(position, options) {
      if (options == null) {
        options = {}
      }
      const deferred = $q.defer()
      if (position == null) {
        deferred.reject()
        return deferred.promise
      }

      // FIXME: this actually works better if it's halfway across the
      // page (or the visible part of the page). Synctex doesn't
      // always find the right place in the file when the point is at
      // the edge of the page, it sometimes returns the start of the
      // next paragraph instead.
      const h = position.offset.left

      // Compute the vertical position to pass to synctex, which
      // works with coordinates increasing from the top of the page
      // down.  This matches the browser's DOM coordinate of the
      // click point, but the pdf position is measured from the
      // bottom of the page so we need to invert it.
      let v
      if (
        options.fromPdfPosition &&
        (position.pageSize != null ? position.pageSize.height : undefined) !=
          null
      ) {
        v = position.pageSize.height - position.offset.top || 0 // measure from pdf point (inverted)
      } else {
        v = position.offset.top || 0 // measure from html click position
      }

      // It's not clear exactly where we should sync to if it wasn't directly
      // clicked on, but a little bit down from the very top seems best.
      if (options.includeVisualOffset) {
        v += 72 // use the same value as in pdfViewer highlighting visual offset
      }

      this.syncToCodeInFlight = true

      $http({
        url: `/project/${ide.project_id}/sync/pdf`,
        method: 'GET',
        params: {
          page: position.page + 1,
          h: h.toFixed(2),
          v: v.toFixed(2),
          buildId: ide.buildId,
          clsiserverid: ide.clsiServerId,
        },
      })
        .then(response => {
          this.syncToCodeInFlight = false
          const { data } = response
          if (
            data.code != null &&
            data.code.length > 0 &&
            data.code[0].file !== ''
          ) {
            const doc = ide.fileTreeManager.findEntityByPath(data.code[0].file)
            if (doc == null) {
              deferred.reject()
            }
            return deferred.resolve({ doc, line: data.code[0].line })
          } else if (data.code[0].file === '') {
            ide.$scope.sync_tex_error = true
            setTimeout(() => (ide.$scope.sync_tex_error = false), 4000)
          }
        })
        .catch(response => {
          this.syncToCodeInFlight = false
          const error = response.data
          return deferred.reject(error)
        })

      return deferred.promise
    },
  }

  return synctex
})

App.controller('PdfSynctexController', function ($scope, synctex, ide) {
  this.cursorPosition = null

  $scope.$watch(
    () => synctex.syncToPdfInFlight,
    value => ($scope.syncToPdfInFlight = value)
  )
  $scope.$watch(
    () => synctex.syncToCodeInFlight,
    value => ($scope.syncToCodeInFlight = value)
  )

  ide.$scope.$on('cursor:editor:update', (event, cursorPosition) => {
    this.cursorPosition = cursorPosition
  })

  $scope.syncToPdf = () => {
    if (this.cursorPosition == null) {
      return
    }
    synctex.syncToPdf(this.cursorPosition).then(highlights => {
      $scope.pdf.highlights = highlights
    })
  }

  ide.$scope.$on('cursor:editor:syncToPdf', $scope.syncToPdf)

  $scope.syncToCode = function () {
    synctex
      .syncToCode($scope.pdf.position, {
        includeVisualOffset: true,
        fromPdfPosition: true,
      })
      .then(function (data) {
        const { doc, line } = data
        ide.editorManager.openDoc(doc, { gotoLine: line })
      })
  }
})

App.controller('ClearCacheModalController', function ($scope, $modalInstance) {
  $scope.state = { error: false, inflight: false }

  $scope.clear = function () {
    $scope.state.inflight = true
    $scope
      .clearCache()
      .then(function () {
        $scope.state.inflight = false
        $modalInstance.close()
      })
      .catch(function () {
        $scope.state.error = true
        $scope.state.inflight = false
      })
  }

  $scope.cancel = () => $modalInstance.dismiss('cancel')
})
// Wrap React component as Angular component. Only needed for "top-level" component
App.component(
  'previewPane',
  react2angular(
    rootContext.use(PreviewPane),
    Object.keys(PreviewPane.propTypes)
  )
)
