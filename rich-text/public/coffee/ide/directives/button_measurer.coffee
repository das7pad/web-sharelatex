define ['base'], (App) ->
  App.directive "buttonMeasurer", () ->
    return {
      scope: {
        buttons: "="
      }

      template: """
        <div class="button-measurer-wrapper">
          <button
            ng-repeat="button in buttons"
            ng-click="button.handleClick()"
            title="{{button.title}}"
            class="btn btn-default formatting-btn"
          >
            <i class="{{button.iconClass}}">{{button.iconText}}</i>
          </button>
        </div>
      """
    }
