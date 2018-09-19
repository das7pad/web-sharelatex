define [
	'base'
], (App) ->
	App.controller "CmsController", () ->
		if window.location.hash
			setTimeout -> 
				tabID = window.location.hash.replace('#', '')
				tab = document.getElementById(tabID)
				if document.querySelector(window.location.hash)
					document.querySelector(window.location.hash).scrollIntoView({ 
						behavior: 'smooth'
					});
			, 500
