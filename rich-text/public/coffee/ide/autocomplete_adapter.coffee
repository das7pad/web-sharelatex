define [
  "ide/editor/directives/aceEditor/auto-complete/top_hundred_snippets"
], (TopHundredSnippets) ->
  class AutocompleteAdapter
    getSuggestions: () ->
      TopHundredSnippets.map (snippet) -> snippet.snippet
