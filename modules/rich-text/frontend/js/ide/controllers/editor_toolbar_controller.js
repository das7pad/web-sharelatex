/* eslint-disable
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
define(['../../../../../../frontend/js/base'], (App) =>
  App.controller(
    'EditorToolbarController',
    ($scope, ide) =>
      ($scope.buttons = [
        {
          iconText: '§',
          iconClass: 'formatting-icon',
          title: 'Insert Section Heading',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('section')
          }
        },
        {
          iconText: '§',
          iconClass: 'formatting-icon formatting-icon--small',
          title: 'Insert Subsection Heading',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('subsection')
          }
        },
        {
          iconClass: 'formatting-icon fa fa-bold',
          title: 'Format Bold',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('bold')
          }
        },
        {
          iconClass: 'formatting-icon fa fa-italic',
          title: 'Format Italic',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('italic')
          }
        },
        {
          iconText: 'π',
          iconClass: 'formatting-icon formatting-icon--serif',
          title: 'Insert Inline Math',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('inlineMath')
          }
        },
        {
          iconText: 'Σ',
          iconClass: 'formatting-icon formatting-icon--serif',
          title: 'Insert Math on its own line',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('displayMath')
          }
        },
        {
          iconClass: 'formatting-icon fa fa-list-ol',
          title: 'Insert Numbered List',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('numberedList')
          }
        },
        {
          iconClass: 'formatting-icon fa fa-list-ul',
          title: 'Insert Bullet Point List',
          handleClick() {
            return $scope.richText.formattingEvents.trigger('bulletList')
          }
        }
      ])
  ))
