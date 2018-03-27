define [
	"base"
	"ace/ace"
], (App) ->
	Range = ace.require("ace/range").Range

	getLastCommandFragment = (lineUpToCursor) ->
		if m = lineUpToCursor.match(/(\\[^\\]+)$/)
			return m[1]
		else
			return null

	App.controller "ReferencesSearchController", ($scope, $modal, ide, $timeout, sixpack, event_tracking, $rootScope) ->
		$scope.searchFeatureEnabled = () ->
			return true
			# return (
			# 	window._BIB_SEARCH_ENABLED || window?.location?.search in ['?ft=ersreraprf', '?ft=references']
			# )

		if !($scope.searchFeatureEnabled())
			return

		$scope.searchEnabled = false

		_abTestStartDate = new Date(Date.UTC(2016, 6, 22))
		_userSignUpDate = new Date(window.user.signUpDate)

		$scope.shouldABTestBibSearch = _userSignUpDate > _abTestStartDate

		$scope.isCursorAtCitation = (editor) ->
			# FIXME: duped code from AutocompletManager
			pos = editor.getCursorPosition()
			range = new Range(pos.row, 0, pos.row, pos.column)
			lineUpToCursor = editor.getSession().getTextRange(range)
			commandFragment = getLastCommandFragment(lineUpToCursor)
			if commandFragment
				citeMatch = commandFragment.match(/^~?\\([a-z]*cite[a-z]*(?:\[.*])?){([^}]*, *)?(\w*)/)
				if citeMatch
					return true
			return false

		$scope._hintNode = null
		$scope._buildHintNode = () ->
			event_tracking.sendMBOnce "bib-search-hint-shown-once"
			# pluck the hidden node out of the dom,
			# make it visible then hand it over to the caller
			hintNode = $('.sl_references_search_hint')[0]
			if !hintNode
				console.log("Error: could not find .sl_references_search_hint node in dom")
				return
			hintNode.style.display = 'block'
			hintNode.style.visibility = 'visible'
			return hintNode

		# set up the search hint text on the popup,
		# and make it visible if the cursor is currently
		# in a `cite` block.
		$scope.updateHintNode = (editor) ->
			if editor?.completer?.popup?.isOpen == true
				if !$scope._hintNode
					if $scope.isCursorAtCitation(editor)
						# we need to create the hint dom-node and
						# attach it to the popup
						newNode = $scope._buildHintNode()
						container = editor?.completer?.popup?.renderer?.container
						if !container
							console.log("Error attaching search hint: could not find popup container")
							return
						container.style.overflow = 'visible'
						$(container).append(newNode)
						$scope._hintNode = newNode
						# hook into the `hide` method on the popup,
						# and hide the hint when the poupup is hidden
						popup = editor.completer.popup
						if !popup.hide._sl_patched
							oldHide = popup.hide.bind(popup)
							popup.hide = () ->
								# delay the decision to hide the hint, prevents flickering
								$timeout(
									() ->
										if !$scope.isCursorAtCitation(editor)
											$scope._hideHint()
									, 0
								)
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
		$scope._sixpackParticipating = false
		$scope.setup = () ->
			if $scope.settings.autoComplete == false
				return
			if $scope._inited
				return
			# try to get the 'main' editor and it's `startAutocomplete` (Ctrl-Space)
			# key-command object
			if !editor?
				console.log('no editor found')
				return
			startAutocomplete = editor?.commands?.commands?.startAutocomplete
			if !startAutocomplete
				console.log('could not find startAutocomplete command')
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
				handleControlSpace = (ed) ->
					$timeout((-> $scope.updateHintNode(ed)), 0)
					isAtCitation = $scope.isCursorAtCitation(ed)
					if ed?.completer?.popup?.isOpen == true && isAtCitation == true
							
						event_tracking.sendMB "bib-search-modal-opened"

						sixpack.convert 'bib-search-highlight' if $scope.shouldABTestBibSearch

						$scope.searchEnabled = ide?.$scope?.project?.features?.referencesSearch == true
						$scope.openReferencesSearchModal()
					else
						startAutocomplete.exec(ed)

				# Expose the handleControlSpace method to the scope, in order to bind it
				# via ng-click.
				$scope.handleOpenSearch = () -> handleControlSpace(editor)

				# BUG: Safari/Ace/Ctrl-Space don't seem to get along.
				# If we detect we're in Safari, just add a key listener to the
				# #editor node, otherwise register a command with ace
				if ide.browserIsSafari
					document.querySelector('#editor').onkeyup = (e) ->
						if e.ctrlKey && e.keyCode == 32
							handleControlSpace(editor)
				else
					editor.commands.addCommand({
						name: "triggerReferencesSearchPopup",
						exec: handleControlSpace
						bindKey: startAutocomplete.bindKey
					})

				$scope._inited = true

		# do setup when project loads
		editor = null
		$rootScope.$on 'editor:inited', (event, _editor) ->
			editor = _editor
			setTimeout $scope.setup

		$scope.insertKeyAtCursor = (key) ->
			if !editor?
				console.log('no editor found')
				return
			pos = editor.getCursorPosition()
			session = editor.getSession()
			# check if the user has partially typed a key already,
			# example: `\cite{one:1,tw|}`
			# in this case we need to delete back to the ',' and then insert the new key
			lineUpToCursor = editor.getSession().getTextRange(new Range(pos.row, 0, pos.row, pos.column))
			lineBeyondCursor = editor.getSession().getTextRange(new Range(pos.row, pos.column, pos.row, 99999))
			needsClosingBrace = !lineBeyondCursor.match(/^[^{]*}/)
			lastSeparatorPosition = Math.max(
				lineUpToCursor.lastIndexOf('{'),
				lineUpToCursor.lastIndexOf(','),
				lineUpToCursor.lastIndexOf(' ')
			)
			if lastSeparatorPosition < (pos.column - 1)
				# delete back to the last separator, then insert new key
				session.remove(new Range(pos.row, lastSeparatorPosition + 1, pos.row, pos.column))
				pos = editor.getCursorPosition()
				session.insert(pos, key)
			else
				# just insert the new key
				session.insert(pos, key)
			if needsClosingBrace
				session.insert(editor.getCursorPosition(), '}')

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
