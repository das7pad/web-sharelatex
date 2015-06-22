define [], () ->
	class ReferencesManager
		constructor: (@$scope, @editor, @element) ->

		apiRequest: (endpoint, data, callback = (error, result) ->)->
			data.token = window.user.id
			data._csrf = window.csrfToken
			options =
				url: "/references" + endpoint
				type: "POST"
				dataType: "json"
				headers:
					"Content-Type": "application/json"
				data: JSON.stringify data
				success: (data, status, xhr) ->
					callback null, data
				error: (xhr, status, error) ->
					callback error
			$.ajax options