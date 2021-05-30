import { Tabs } from '@reach/tabs'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { matchSorter } from 'match-sorter'
import t from '../../../misc/t'

import symbols from '../data/symbols.json'
import { buildCategorisedSymbols, createCategories } from '../utils/categories'
import SymbolPaletteSearch from './symbol-palette-search'
import SymbolPaletteBody from './symbol-palette-body'
import SymbolPaletteTabs from './symbol-palette-tabs'
// import SymbolPaletteInfoLink from './symbol-palette-info-link'
import BetaBadge from '../../../shared/components/beta-badge'

import '@reach/tabs/styles.css'

export default function SymbolPaletteContent({ handleSelect }) {
  const [input, setInput] = useState('')

  // build the list of categories with translated labels
  const categories = useMemo(() => createCategories(t), [])

  // group the symbols by category
  const categorisedSymbols = useMemo(
    () => buildCategorisedSymbols(categories),
    [categories]
  )

  // select symbols which match the input
  const filteredSymbols = useMemo(() => {
    if (input === '') {
      return null
    }

    const words = input.trim().split(/\W+/)

    return words.reduceRight(
      (symbols, word) =>
        matchSorter(symbols, word, {
          keys: ['command', 'description'],
          threshold: matchSorter.rankings.CONTAINS,
        }),
      symbols
    )
  }, [input])

  const inputRef = useRef(null)

  // allow the input to be focused
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // focus the input when the symbol palette is opened
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <Tabs className="symbol-palette-container">
      <div className="symbol-palette">
        <div className="symbol-palette-header">
          <SymbolPaletteTabs
            categories={categories}
            disabled={input.length > 0}
          />
          <div className="symbol-palette-header-group">
            <BetaBadge
              tooltip={{
                id: 'tooltip-symbol-palette-beta',
                text: t('beta_badge_tooltip', {
                  feature: 'entering symbols',
                }),
                placement: 'top',
              }}
            />
            {/* NOTE: replace the beta badge with this info link when rolling out to all users */}
            {/* <SymbolPaletteInfoLink /> */}
            <SymbolPaletteSearch setInput={setInput} inputRef={inputRef} />
          </div>
        </div>
        <div className="symbol-palette-body">
          <SymbolPaletteBody
            categories={categories}
            categorisedSymbols={categorisedSymbols}
            filteredSymbols={filteredSymbols}
            handleSelect={handleSelect}
            focusInput={focusInput}
          />
        </div>
      </div>
    </Tabs>
  )
}
SymbolPaletteContent.propTypes = {
  handleSelect: PropTypes.func.isRequired,
}
