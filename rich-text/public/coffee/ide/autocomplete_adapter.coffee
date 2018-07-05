define [
  "ide/editor/directives/aceEditor/auto-complete/snippets/TopHundredSnippets",
  "ide/editor/directives/aceEditor/auto-complete/snippets/Environments"
], (TopHundredCommands, Environments) ->
  class AutocompleteAdapter
    constructor: (@$scope, @metadata, @bibtexReferences) ->
      @debouncer = {}

    getCommandCompletions: (handleCompletionPicked) ->
      [].concat(TopHundredCommands, @getCommandCompletionsFromMetadata())
        .map (snippet) ->
          {
            text: snippet.caption
            displayText: snippet.caption
            hint: handleCompletionPicked
          }

    getCommandCompletionsFromMetadata: () ->
      _.flatten(@metadata.getAllPackages())

    getBeginCommandArguments: () ->
      Environments.all

    getBibtexArguments: () ->
      @bibtexReferences

    getReferenceArguments: () ->
      @metadata.getAllLabels()

    onChange: (cm) =>
      { line } = cm.getCursor()
      lineText = cm.getLine(line)
      if lineText.length > 10000
        return
      # Check if edited line contains metadata commands
      if /\\(usepackage|RequirePackage|label)(\[.*])?({.*})?/.test(lineText)
        @metadata.scheduleLoadDocMetaFromServer(@$scope.docId)
