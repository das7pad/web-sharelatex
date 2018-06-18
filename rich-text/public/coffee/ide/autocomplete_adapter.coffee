define [
  "ide/editor/directives/aceEditor/auto-complete/top_hundred_snippets"
], (TopHundredSnippets) ->
  class AutocompleteAdapter
    constructor: (@$scope, @metadata) ->
      @debouncer = {}

    getCompletions: (handleCompletionPicked) ->
      [].concat(TopHundredSnippets, @getCompletionsFromMetadata())
        .map (snippet) ->
          {
            text: snippet.caption
            displayText: snippet.caption
            hint: handleCompletionPicked
          }

    getCompletionsFromMetadata: () ->
      _.flatten(@metadata.getAllPackages())

    onChange: (cm) =>
      { line } = cm.getCursor()
      lineText = cm.getLine(line)
      if lineText.length > 10000
        return
      # Check if edited line contains metadata commands
      if /\\(usepackage|RequirePackage|label)(\[.*])?({.*})?/.test(lineText)
        @metadata.scheduleLoadDocMetaFromServer(@$scope.docId)
