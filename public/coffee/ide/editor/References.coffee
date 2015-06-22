define [
	"base"
	"ace/ace"
	"ide/references/editor/ReferencesManager"
], (App, Ace, ReferencesManager) ->

	App.directive "aceEditor", () ->
		return {
			link: (scope, element, attrs) ->
				editor = ace.edit(element.find(".ace-editor-body")[0])
				referencesManager = new ReferencesManager(scope, editor, element)
		}