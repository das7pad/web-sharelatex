/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(["base"], App =>
  // Hack to workaround AddSearch not allowing submit events on forms
  // containing the .addsearch input.
  App.directive("addsearch", () =>
    ({
      link(scope, element, attrs) {
        const input = element.find('input');
        const button = element.find('button');

        return button.on('click', e => window.location.search = `addsearch=${input.val()}`);
      }
    })
)
);
