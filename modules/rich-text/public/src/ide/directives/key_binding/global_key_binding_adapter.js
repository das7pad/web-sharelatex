define([], function() {
  class GlobalKeybindingAdapter {
    constructor(editor) {
      this.editor = editor
    }

    handleF(e) {
      e.preventDefault()
      this.editor.getCodeMirror().execCommand('findPersistent')
      return false
    }
  }

  return GlobalKeybindingAdapter
})
