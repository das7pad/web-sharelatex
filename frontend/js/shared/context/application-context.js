import React, { createContext, useContext } from 'react'
import PropTypes from 'prop-types'

export const ApplicationContext = createContext()

export function ApplicationProvider({ children }) {
  const applicationContextValue = {
    user: window.user
  }
  return (
    <ApplicationContext.Provider value={applicationContextValue}>
      {children}
    </ApplicationContext.Provider>
  )
}

ApplicationProvider.propTypes = {
  children: PropTypes.any
}

export function useApplicationContext() {
  const applicationContext = useContext(ApplicationContext)
  return applicationContext
}
