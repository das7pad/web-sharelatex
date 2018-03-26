define [], () ->
  class RichTextAdapter
    constructor: (@fileTreeManager) ->

    fileExistsForPath: (path) ->
      entity = @fileTreeManager.findEntityByPath(path)
      return !!entity

    getPreviewUrlForPath: (path) ->
      # Handle paths that are missing
      for extension in ['', '.png', '.pdf', '.jpg', '.jpeg']
        entity = @fileTreeManager.findEntityByPath("#{path}#{extension}")
        break if entity
      return null if !entity
      queryString = if isPreviewable(entity) then '?format=png' else ''
      "/project/#{window.project_id}/file/#{entity.id}#{queryString}"

  isPreviewable = (entity) ->
    ['eps', 'pdf'].includes(getExtension(entity))

  getExtension = (entity) ->
    entity?.name?.split(".").pop()?.toLowerCase()

  return RichTextAdapter
