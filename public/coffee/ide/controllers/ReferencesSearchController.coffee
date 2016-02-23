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

	App.controller "ReferencesSearchController", ($scope, $modal, ide, $timeout) ->

		if !window._BIB_SEARCH_ENABLED
			return

		$scope.searchEnabled = false

		$scope.isCursorAtCitation = (editor) ->
			# FIXME: duped code from AutocompletManager
			pos = editor.getCursorPosition()
			range = new Range(pos.row, 0, pos.row, pos.column)
			lineUpToCursor = editor.getSession().getTextRange(range)
			commandFragment = getLastCommandFragment(lineUpToCursor)
			if commandFragment
				citeMatch = commandFragment.match(/^~?\\([a-z]*cite[a-z]?){(.*,)?(\w*)/)
				if citeMatch
					return true
			return false

		$scope._hintNode = null
		$scope._buildHintNode = () ->
			# create a new div
			inner = document.createElement('span')
			inner.innerText = 'Press CTRL-Space to Search'
			node = document.createElement('div')
			node.classList.add("sl_references_search_hint")
			node.appendChild(inner)

			node.style.position = 'absolute'
			node.style.bottom = '-26px'
			node.style.right = '0px'
			node.style.padding = '2px'
			node.style.background = 'white'
			node.style.border = '1px solid #ddd'
			node.style.visibility = 'visible'
			node.style.boxShadow = '2px 3px 5px rgba(0,0,0,.2)'

			return node

		# set up the search hint text on the popup,
		# and make it visible if the cursor is currently
		# in a `cite` block.
		$scope.updateHintNode = (editor) ->
			# console.log ">> update hint"
			if editor?.completer?.popup?.isOpen == true
				if !$scope._hintNode
					if $scope.isCursorAtCitation(editor)
						# we need to create the hint dom-node and
						# attach it to the popup
						# console.log ">> create node"
						newNode = $scope._buildHintNode()
						container = editor?.completer?.popup?.renderer?.container
						if !container
							console.err("Error attaching search hint: could not find popup container")
							return
						container.style.overflow = 'visible'
						# console.log ">> attach new node"
						$(container).append(newNode)
						$scope._hintNode = newNode
						# hook into the `hide` method on the popup,
						# and hide the hint when the poupup is hidden
						popup = editor.completer.popup
						if !popup.hide._sl_patched
							oldHide = popup.hide.bind(popup)
							popup.hide = () ->
								$scope._hideHint()
								oldHide()
							popup.hide._sl_patched = true

			# as a fail-safe, always update visibility if the node exists
			if $scope._hintNode
				if $scope.isCursorAtCitation(editor)
					$scope._showHint()
				else
					$scope._hideHint()

		$scope._showHint = () ->
			if $scope._hintNode
				$scope._hintNode.style.visibility = 'visible'

		$scope._hideHint = () ->
			if $scope._hintNode
				$scope._hintNode.style.visibility = 'hidden'

		# set up key bindings for references search
		$scope._inited = false
		$scope.setup = () ->
			$scope.searchEnabled = ide?.$scope?.project?.features?.references == true
			if $scope._inited
				return
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
				# wrap the existing `exec` function of startAutocomplete,
				# use it to update the hint node
				oldExec = startAutocomplete.exec
				startAutocomplete.exec = (ed, a, b, c, d) ->
					$timeout((-> $scope.updateHintNode(ed)), 0)
					oldExec(ed)
				startAutocomplete._sl_patched = true

				# on Ctrl-space:
				# if we're already showing the popup for a `\cite{}` block
				# then show the References Search modal, otherwise do the default behaviour
				editor.commands.addCommand({
					name: "triggerReferencesSearchPopup",
					exec: (ed) ->
						$timeout((-> $scope.updateHintNode(ed)), 0)
						if ed?.completer?.popup?.isOpen == true && $scope.isCursorAtCitation(ed)
							$scope.openReferencesSearchModal()
						else
							startAutocomplete.exec(ed)
					bindKey: "Ctrl-Space"
				})
				$scope._inited = true

		# do setup when project loads
		$scope.$on 'project:joined', () ->
			$scope.setup()

		$scope.insertKeyAtCursor = (key) ->
			editor = window.editors[0]
			if !editor
				console.error('no editor found at window.editors[0]')
				return
			pos = editor.getCursorPosition()
			session = editor.getSession()
			# check if the user has partially typed a key already,
			# example: `\cite{one:1,tw|}`
			# in this case we need to delete back to the ',' and then insert the new key
			lineUpToCursor = editor.getSession().getTextRange(new Range(pos.row, 0, pos.row, pos.column))
			lastSeparatorPosition = Math.max(
				lineUpToCursor.lastIndexOf('{'),
				lineUpToCursor.lastIndexOf(',')
			)
			if lastSeparatorPosition < (pos.column - 1)
				# delete back to the last separator, then insert new key
				session.remove(new Range(pos.row, lastSeparatorPosition + 1, pos.row, pos.column))
				pos = editor.getCursorPosition()
				session.insert(pos, key)
			else
				# just insert the new key
				session.insert(pos, key)

		$scope.openReferencesSearchModal = () ->
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
			modal.result.then (keyString) ->
				$scope.insertKeyAtCursor(keyString)

		ide.referencesSearchManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesSearchModal(providerStr)
		}
