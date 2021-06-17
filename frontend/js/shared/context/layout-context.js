import React, { createContext, useContext, useCallback } from 'react'
import PropTypes from 'prop-types'
import useScopeValue from './util/scope-value-hook'
import { useIdeContext } from './ide-context'

export const LayoutContext = createContext()

LayoutContext.Provider.propTypes = {
  value: PropTypes.shape({
    view: PropTypes.string,
    setView: PropTypes.func.isRequired,
    chatIsOpen: PropTypes.bool,
    setChatIsOpen: PropTypes.func.isRequired,
    reviewPanelOpen: PropTypes.bool,
    setReviewPanelOpen: PropTypes.func.isRequired,
    leftMenuShown: PropTypes.bool,
    setLeftMenuShown: PropTypes.func.isRequired,
    pdfLayout: PropTypes.oneOf(['sideBySide', 'flat', 'split']).isRequired,
  }).isRequired,
}

export function LayoutProvider({ children }) {
  const { $scope } = useIdeContext()

  const [view, _setView] = useScopeValue('ui.view')

  const setView = useCallback(
    value => {
      _setView(value)
      if (value === 'history') {
        $scope.toggleHistory()
      }
    },
    [$scope, _setView]
  )

  const [chatIsOpen, setChatIsOpen] = useScopeValue('ui.chatOpen')
  const [reviewPanelOpen, setReviewPanelOpen] = useScopeValue(
    'ui.reviewPanelOpen'
  )
  const [leftMenuShown, setLeftMenuShown] = useScopeValue('ui.leftMenuShown')
  const [pdfLayout] = useScopeValue('ui.pdfLayout')

  const value = {
    view,
    setView,
    chatIsOpen,
    setChatIsOpen,
    reviewPanelOpen,
    setReviewPanelOpen,
    leftMenuShown,
    setLeftMenuShown,
    pdfLayout,
  }

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  )
}

LayoutProvider.propTypes = {
  children: PropTypes.any,
}

export function useLayoutContext(propTypes) {
  const data = useContext(LayoutContext)
  PropTypes.checkPropTypes(propTypes, data, 'data', 'LayoutContext.Provider')
  return data
}
