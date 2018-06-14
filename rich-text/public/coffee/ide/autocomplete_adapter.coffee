define [
  "ide/editor/directives/aceEditor/auto-complete/top_hundred_snippets"
], (TopHundredSnippets) ->
  class AutocompleteAdapter
    constructor: (@metadata) ->

    getCompletions: (handleCompletionPicked) ->
      completions = [].concat(
        TopHundredSnippets,
        @getCompletionsFromMetadata()
      )

      completions.map (snippet) =>
        {
          text: snippet.snippet
          displayText: snippet.caption
          hint: handleCompletionPicked
        }

    getCompletionsFromMetadata: () ->
      _.flatten(@metadata.getAllPackages())
