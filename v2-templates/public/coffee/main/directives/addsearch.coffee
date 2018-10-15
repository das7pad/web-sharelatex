define ["base"], (App) ->
  # Hack to workaround AddSearch not allowing submit events on forms
  # containing the .addsearch input.
  App.directive "addsearch", () ->
    return {
      link: (scope, element, attrs) ->
        input = element.find('input')
        button = element.find('button')

        button.on 'click', (e) ->
          window.location.search = 'addsearch=' + input.val();
    }
