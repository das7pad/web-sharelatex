define [
	"base"
], (App) ->

	App.controller "ReferencesSearchController", ($scope, $modal, ide) ->

		$scope.searchEnabled = () ->
			ide?.$scope?.project?.features?.references == true

		$scope.setup = () ->
			console.log ">> init ReferencesSearchController"
			editor = window.editors[0]
			if !editor
				console.error('no editor found at window.editors[0]')
				return
			startAutocomplete = editor?.commands?.commands?.startAutocomplete
			if !startAutocomplete
				console.error('could not find startAutocomplete command')
				return
			if !startAutocomplete._patched
				oldExec = startAutocomplete.exec
				startAutocomplete.exec = (ed) ->
					if ed?.completer?.popup?.isOpen == true
						$scope.openReferencesSearchModal()
					else
						oldExec(ed)
				startAutocomplete._patched = true

		window._xx = () ->
			$scope.openReferencesSearchModal()

		$scope.openReferencesSearchModal = () ->
			if $scope.searchEnabled()
				console.log ">> opening modal"
				$modal.open {
					templateUrl: "referencesSearchModalTemplate"
					controller: "ReferencesSearchModalController"
					scope: $scope
					size: 'lg'
					animation: false
				}

		ide.referencesSearchManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesSearchModal(providerStr)
		}

		$scope.$on 'project:joined', () ->
			$scope.setup()
