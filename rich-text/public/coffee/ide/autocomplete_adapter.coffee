define [
  "ide/editor/directives/aceEditor/auto-complete/top_hundred_snippets"
], (TopHundredSnippets) ->
  class AutocompleteAdapter
    getCompletions: (handleCompletionPicked) ->
      TopHundredSnippets.map (snippet) =>
        {
          text: snippet.snippet
          displayText: snippet.caption
          hint: handleCompletionPicked
        }
