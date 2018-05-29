define ['base'], (App) ->
  BUTTON_WIDTH = 33
  OVERFLOWED_BUTTON_WIDTH = 55

  App.directive "buttonMeasurer", ($timeout) ->
    return {
      scope: {
        buttons: "="
        opening: "="
      }

      link: (scope, element, attrs) ->
        scope.overflowed = false
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
            scope.overflowed = true

            availableSpace = availableSpace - OVERFLOWED_BUTTON_WIDTH
            noOfShowableButtons = Math.floor(availableSpace / BUTTON_WIDTH)

            split(noOfShowableButtons)
          else
            scope.overflowed = false
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

      template: """
        &nbsp;
        <button
          ng-repeat="button in shownButtons"
          ng-click="button.handleClick()"
          title="{{button.title}}"
          class="btn btn-default formatting-btn formatting-btn-with-icon"
        >
          <i class="{{button.iconClass}}">{{button.iconText}}</i>
        </button>
        <button class="btn btn-default formatting-btn formatting-btn-overflowed" ng-if="overflowed">More</button>
      """
    }
