/* eslint-disable
    max-len,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  "ide/editor/directives/aceEditor/auto-complete/snippets/TopHundredSnippets",
  "ide/editor/directives/aceEditor/auto-complete/snippets/Environments"
], function(TopHundredCommands, Environments) {
  let AutocompleteAdapter;
  return (AutocompleteAdapter = class AutocompleteAdapter {
    constructor($scope, metadata, bibtexReferences) {
      this.onChange = this.onChange.bind(this);
      this.$scope = $scope;
      this.metadata = metadata;
      this.bibtexReferences = bibtexReferences;
      this.debouncer = {};
    }

    getCommandCompletions(handleCompletionPicked) {
      return [].concat(TopHundredCommands, this.getCommandCompletionsFromMetadata())
        .map(snippet =>
          ({
            text: snippet.caption,
            displayText: snippet.caption,
            hint: handleCompletionPicked
          }));
    }

    getCommandCompletionsFromMetadata() {
      return _.flatten(this.metadata.getAllPackages());
    }

    getBeginCommandArguments() {
      return Environments.all;
    }

    getBibtexArguments() {
      return this.bibtexReferences;
    }

    getReferenceArguments() {
      return this.metadata.getAllLabels();
    }

    onChange(cm) {
      const { line } = cm.getCursor();
      const lineText = cm.getLine(line);
      if (lineText.length > 10000) {
        return;
      }
      // Check if edited line contains metadata commands
      if (/\\(usepackage|RequirePackage|label)(\[.*])?({.*})?/.test(lineText)) {
        return this.metadata.scheduleLoadDocMetaFromServer(this.$scope.docId);
      }
    }
  });
});
