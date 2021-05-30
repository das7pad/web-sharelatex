import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import useDebounce from '../hooks/use-debounce'
import t from '../../../misc/t'

export default function SymbolPaletteSearch({ setInput, inputRef }) {
  const [localInput, setLocalInput] = useState('')

  // debounce the search input until a typing delay
  const debouncedLocalInput = useDebounce(localInput, 250)

  useEffect(() => {
    setInput(debouncedLocalInput)
  }, [debouncedLocalInput, setInput])

  return (
    <input
      className="symbol-palette-search"
      type="search"
      ref={inputRef}
      id="symbol-palette-input"
      aria-label="Search"
      value={localInput}
      placeholder={t('search') + '…'}
      onChange={event => {
        setLocalInput(event.target.value)
      }}
    />
  )
}
SymbolPaletteSearch.propTypes = {
  setInput: PropTypes.func.isRequired,
  inputRef: PropTypes.object.isRequired,
}
