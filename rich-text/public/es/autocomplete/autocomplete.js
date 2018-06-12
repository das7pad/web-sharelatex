import { Pos } from 'codemirror'

export default function autocomplete (cm, { autocompleteAdapter }) {
  const cursor = cm.getCursor()
  const token = cm.getTokenAt(cursor)

  return {
    list: autocompleteAdapter.getSuggestions(),
    from: Pos(cursor.line, token.start),
    to: Pos(cursor.line, token.end)
  }
}
