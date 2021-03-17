import React, { useMemo, useState, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { matchSorter } from 'match-sorter'
import { useCombobox } from 'downshift'
import classnames from 'classnames'

import Icon from '../../../shared/components/icon'
import { Trans } from '../../../components/trans'

export default function SelectCollaborators({
  loading,
  options,
  placeholder,
  multipleSelectionProps
}) {
  const {
    getSelectedItemProps,
    getDropdownProps,
    addSelectedItem,
    removeSelectedItem,
    selectedItems
  } = multipleSelectionProps

  const [inputValue, setInputValue] = useState('')

  const selectedEmails = useMemo(() => selectedItems.map(item => item.email), [
    selectedItems
  ])

  const unselectedOptions = useMemo(
    () => options.filter(option => !selectedEmails.includes(option.email)),
    [options, selectedEmails]
  )

  const filteredOptions = useMemo(
    () =>
      matchSorter(unselectedOptions, inputValue, {
        keys: ['name', 'email'],
        threshold: matchSorter.rankings.CONTAINS
      }),
    [unselectedOptions, inputValue]
  )

  const inputRef = useRef(null)

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      window.setTimeout(() => {
        inputRef.current.focus()
      }, 10)
    }
  }, [inputRef])

  const isValidInput = useMemo(() => {
    if (inputValue.includes('@')) {
      for (const selectedItem of selectedItems) {
        if (selectedItem.email === inputValue) {
          return false
        }
      }
    }

    return true
  }, [inputValue, selectedItems])

  const addNewItem = useCallback(
    (email, focus = true) => {
      if (
        isValidInput &&
        email.includes('@') &&
        !selectedEmails.includes(email)
      ) {
        addSelectedItem({
          email,
          display: email,
          type: 'user'
        })
        setInputValue('')
        if (focus) {
          focusInput()
        }
        return true
      }
    },
    [addSelectedItem, selectedEmails, isValidInput, focusInput]
  )

  const {
    isOpen,
    getLabelProps,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    highlightedIndex,
    getItemProps
  } = useCombobox({
    inputValue,
    defaultHighlightedIndex: 0,
    items: filteredOptions,
    itemToString: item => item && item.name,
    onStateChange: ({ inputValue, type, selectedItem }) => {
      switch (type) {
        // set inputValue when the input changes
        case useCombobox.stateChangeTypes.InputChange:
          setInputValue(inputValue)
          break

        // add a selected item on Enter (keypress), click or blur
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.InputBlur:
          if (selectedItem) {
            setInputValue('')
            addSelectedItem(selectedItem)
          }
          break
      }
    }
  })

  const showDropdownItems =
    isOpen && inputValue.length > 0 && filteredOptions.length > 0

  return (
    <div className="tags-input">
      {/* eslint-disable-next-line jsx-a11y/label-has-for */}
      <label className="small" {...getLabelProps()}>
        <Trans i18nKey="share_with_your_collabs" />
        &nbsp;
        {loading && <Icon type="refresh" spin />}
      </label>

      <div className="host">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
        <div {...getComboboxProps()} className="tags" onClick={focusInput}>
          {selectedItems.map((selectedItem, index) => (
            <SelectedItem
              key={`selected-item-${index}`}
              removeSelectedItem={removeSelectedItem}
              selectedItem={selectedItem}
              focusInput={focusInput}
              index={index}
              getSelectedItemProps={getSelectedItemProps}
            />
          ))}

          <input
            {...getInputProps(
              getDropdownProps({
                className: classnames({
                  input: true,
                  'invalid-tag': !isValidInput
                }),
                type: 'email',
                placeholder,
                size: inputValue.length
                  ? inputValue.length + 5
                  : placeholder.length,
                ref: inputRef,
                // preventKeyAction: showDropdown,
                onBlur: () => {
                  // blur: if the dropdown isn't visible, try to create a new item using inputValue
                  if (!showDropdownItems) {
                    addNewItem(inputValue, false)
                  }
                },
                onKeyDown: event => {
                  switch (event.key) {
                    case 'Enter':
                      // Enter: always prevent form submission
                      event.preventDefault()
                      event.stopPropagation()
                      break

                    case 'Tab':
                      // Tab: if the dropdown isn't visible, try to create a new item using inputValue and prevent blur if successful
                      if (!showDropdownItems && addNewItem(inputValue)) {
                        event.preventDefault()
                        event.stopPropagation()
                      }
                      break

                    case ',':
                      // comma: try to create a new item using inputValue
                      event.preventDefault()
                      addNewItem(inputValue)
                      break
                  }
                },
                onPaste: event => {
                  const data =
                    // modern browsers
                    event.clipboardData?.getData('text/plain') ??
                    // IE11
                    window.clipboardData?.getData('text')

                  if (data) {
                    const emails = data
                      .split(/\s*,\s*/)
                      .filter(item => item.includes('@'))

                    if (emails.length) {
                      // pasted comma-separated email addresses
                      event.preventDefault()

                      for (const email of emails) {
                        addNewItem(email)
                      }
                    }
                  }
                }
              })
            )}
          />
        </div>

        <div className={classnames({ autocomplete: showDropdownItems })}>
          <ul {...getMenuProps()} className="suggestion-list">
            {showDropdownItems &&
              filteredOptions.map((item, index) => (
                <Option
                  key={item.email}
                  index={index}
                  item={item}
                  selected={index === highlightedIndex}
                  getItemProps={getItemProps}
                />
              ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
SelectCollaborators.propTypes = {
  loading: PropTypes.bool.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.string,
  multipleSelectionProps: PropTypes.shape({
    getSelectedItemProps: PropTypes.func.isRequired,
    getDropdownProps: PropTypes.func.isRequired,
    addSelectedItem: PropTypes.func.isRequired,
    removeSelectedItem: PropTypes.func.isRequired,
    selectedItems: PropTypes.array.isRequired
  }).isRequired
}

function Option({ selected, item, getItemProps, index }) {
  return (
    <li
      className={classnames('suggestion-item', { selected })}
      {...getItemProps({ item, index })}
    >
      <Icon type="user" modifier="fw" />
      &nbsp;
      {item.display}
    </li>
  )
}
Option.propTypes = {
  selected: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    display: PropTypes.string.isRequired
  }),
  index: PropTypes.number.isRequired,
  getItemProps: PropTypes.func.isRequired
}

function SelectedItem({
  removeSelectedItem,
  selectedItem,
  focusInput,
  getSelectedItemProps,
  index
}) {
  const handleClick = useCallback(
    event => {
      event.preventDefault()
      event.stopPropagation()
      removeSelectedItem(selectedItem)
      focusInput()
    },
    [focusInput, removeSelectedItem, selectedItem]
  )

  return (
    <span
      className="tag-item"
      {...getSelectedItemProps({ selectedItem, index })}
    >
      <Icon type="user" modifier="fw" />
      <span>{selectedItem.display}</span>
      <button
        type="button"
        className="remove-button btn-inline-link"
        aria-label="Remove"
        onClick={handleClick}
      >
        <Icon type="close" modifier="fw" />
      </button>
    </span>
  )
}
SelectedItem.propTypes = {
  focusInput: PropTypes.func.isRequired,
  removeSelectedItem: PropTypes.func.isRequired,
  selectedItem: PropTypes.shape({
    display: PropTypes.string.isRequired
  }),
  getSelectedItemProps: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired
}
