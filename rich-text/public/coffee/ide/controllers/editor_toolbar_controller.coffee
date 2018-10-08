define [
  "base"
], (App) ->
  App.controller "EditorToolbarController", ($scope, ide, localStorage) ->
    $scope.buttons = [{
      iconText: '§'
      iconClass: 'formatting-icon'
      title: 'Insert Section Heading'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('section')
    }, {
      iconText: '§'
      iconClass: 'formatting-icon formatting-icon--small'
      title: 'Insert Subsection Heading'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('subsection')
    }, {
      iconClass: 'formatting-icon fa fa-bold'
      title: 'Format Bold'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('bold')
    }, {
      iconClass: 'formatting-icon fa fa-italic'
      title: 'Format Italic'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('italic')
    }, {
      iconText: 'π'
      iconClass: 'formatting-icon formatting-icon--serif'
      title: 'Insert Inline Math'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('inlineMath')
    }, {
      iconText: 'Σ'
      iconClass: 'formatting-icon formatting-icon--serif'
      title: 'Insert Math on its own line'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('displayMath')
    }, {
      iconClass: 'formatting-icon fa fa-list-ol'
      title: 'Insert Numbered List'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('numberedList')
    }, {
      iconClass: 'formatting-icon fa fa-list-ul'
      title: 'Insert Bullet Point List'
      handleClick: () ->
        $scope.richText.formattingEvents.trigger('bulletList')
    }]
