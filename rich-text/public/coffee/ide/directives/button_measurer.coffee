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

      template: """
        &nbsp;
        <button
          ng-repeat="button in shownButtons"
          ng-click="button.handleClick()"
          title="{{button.title}}"
          class="btn btn-default formatting-btn formatting-btn--icon"
        >
          <i class="{{button.iconClass}}">{{button.iconText}}</i>
        </button>

        <div
          ng-if="showMore"
          dropdown
          dropdown-append-to-body
          class="dropdown formatting-more"
        >
          <button
            dropdown-toggle
            class="btn btn-default formatting-btn formatting-btn--more dropdown-toggle"
          >
            More
          </button>

          <ul class="dropdown-menu formatting-menu" role="menu">
            <li
              class="formatting-menu-item"
              ng-repeat="button in overflowedButtons"
            >
              <button
                ng-click="button.handleClick()"
                title="{{button.title}}"
                class="btn btn-default formatting-btn formatting-btn--icon"
              >
                <i class="{{button.iconClass}}">{{button.iconText}}</i>
              </button>
            </li>
          </ul>
        </div>
      """
    }
