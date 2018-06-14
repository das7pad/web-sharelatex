define [
  "ide/editor/directives/aceEditor/auto-complete/top_hundred_snippets"
], (TopHundredSnippets) ->
  class AutocompleteAdapter
    constructor: (@metadata) ->

    getCompletions: (handleCompletionPicked) ->
      [].concat(TopHundredSnippets, @getCompletionsFromMetadata())
        .map (snippet) ->
          {
            text: snippet.snippet
            displayText: snippet.caption
            hint: handleCompletionPicked
          }

    getCompletionsFromMetadata: () ->
      _.flatten(@metadata.getAllPackages())
