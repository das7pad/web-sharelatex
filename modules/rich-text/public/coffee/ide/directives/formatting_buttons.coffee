define ['base'], (App) ->
  BUTTON_WIDTH = 33
  OVERFLOWED_BUTTON_WIDTH = 70

  App.directive "formattingButtons", () ->
    return {
      scope: {
        buttons: "="
        opening: "="
        isFullscreenEditor: "="
      }

      link: (scope, element, attrs) ->
        scope.showMore = false
        scope.shownButtons = []
        scope.overflowedButtons = []

        # Wait until the editor is not "opening" anymore (i.e. it's fully
        # loaded). This means we can acurately measure the element width
        unbindOpeningWatcher = scope.$watch 'opening', (isOpening) ->
          if !isOpening
            measure()
            setUpWindowResizeListeners()
            unbindOpeningWatcher()

        measure = () ->
          availableSpace = element.width()
          noOfShowableButtons = Math.floor(availableSpace / BUTTON_WIDTH)

          if noOfShowableButtons < scope.buttons.length
            scope.showMore = true

            availableSpace = availableSpace - OVERFLOWED_BUTTON_WIDTH
            noOfShowableButtons = Math.floor(availableSpace / BUTTON_WIDTH)

            split(noOfShowableButtons)
          else
            scope.showMore = false
            split(noOfShowableButtons)

        split = (splitIndex) ->
          scope.$applyAsync () ->
            scope.shownButtons = scope.buttons.slice(0, splitIndex)
            scope.overflowedButtons = scope.buttons.slice(splitIndex)

        debouncedMeasure = _.debounce(measure, 300)

        setUpWindowResizeListeners = () ->
          $(window).on 'resize', debouncedMeasure
          if attrs.resizeOn?
            for event in attrs.resizeOn.split(',')
              scope.$on event, debouncedMeasure

        tearDownResizeListeners = () ->
          $(window).off 'resize', debouncedMeasure

        scope.$watch '$destroy', () ->
          tearDownResizeListeners()

        scope.$watch 'isFullscreenEditor', (oldVal, newVal) ->
          return if oldVal == newVal
          debouncedMeasure()

      templateUrl: 'formattingButtonsTpl'
    }
