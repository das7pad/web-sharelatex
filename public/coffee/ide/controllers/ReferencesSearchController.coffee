define [
	"base"
	"ace/ace"
], (App) ->
	Range = ace.require("ace/range").Range

	getLastCommandFragment = (lineUpToCursor) ->
		if m = lineUpToCursor.match(/(\\[^\\ ]+)$/)
			return m[1]
		else
			return null

	App.controller "ReferencesSearchController", ($scope, $modal, ide) ->

		$scope.searchEnabled = () ->
			ide?.$scope?.project?.features?.references == true

		# set up key bindings for references search
		$scope._inited = false
		$scope.setup = () ->
			if $scope._inited
				return
			console.log ">> init ReferencesSearchController"
			# try to get the 'main' editor and it's `startAutocomplete` (Ctrl-Space)
			# key-command object
			editor = window.editors[0]
			if !editor
				console.error('no editor found at window.editors[0]')
				return
			startAutocomplete = editor?.commands?.commands?.startAutocomplete
			if !startAutocomplete
				console.error('could not find startAutocomplete command')
				return
			# only do this patchery once
			if !startAutocomplete._sl_patched
				# wrap the existing `exec` function of the Ctrl-Space key-action,
				# if we're already showing the popup for a `\cite{}` block
				# then show the References Search modal, otherwise do the default behaviour
				oldExec = startAutocomplete.exec
				startAutocomplete.exec = (ed) ->
					if ed?.completer?.popup?.isOpen == true
						# FIXME: duped code from AutocompletManager
						pos = ed.getCursorPosition()
						range = new Range(pos.row, 0, pos.row, pos.column)
						lineUpToCursor = ed.getSession().getTextRange(range)
						console.log lineUpToCursor
						commandFragment = getLastCommandFragment(lineUpToCursor)
						if commandFragment
							citeMatch = commandFragment.match(/^~?\\(cite[a-z]?){(.*,)?(\w*)/)
							console.log citeMatch
							if citeMatch
								$scope.openReferencesSearchModal()
					else
						oldExec(ed)
				startAutocomplete._sl_patched = true

		# do setup when project loads
		$scope.$on 'project:joined', () ->
			$scope.setup()

		$scope.openReferencesSearchModal = () ->
			if $scope.searchEnabled()
				console.log ">> opening modal"
				modal = $modal.open {
					templateUrl: "referencesSearchModalTemplate"
					controller: "ReferencesSearchModalController"
					scope: $scope
					size: 'lg'
					animation: false
					backdrop: true
					backdropClass: 'references-search-modal-backdrop'
					keyboard: true
				}
				modal.result.then (result) ->
					console.log ">> closed modal", result

		ide.referencesSearchManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesSearchModal(providerStr)
		}
