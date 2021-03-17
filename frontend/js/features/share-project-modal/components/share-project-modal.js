import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import PropTypes from 'prop-types'
import ShareProjectModalContent from './share-project-modal-content'

const ShareProjectContext = createContext()

ShareProjectContext.Provider.propTypes = {
  value: PropTypes.shape({
    isAdmin: PropTypes.bool.isRequired,
    updateProject: PropTypes.func.isRequired,
    monitorRequest: PropTypes.func.isRequired,
    eventTracking: PropTypes.shape({
      sendMB: PropTypes.func.isRequired
    }),
    inFlight: PropTypes.bool,
    setInFlight: PropTypes.func,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    setError: PropTypes.func
  })
}

export function useShareProjectContext() {
  const context = useContext(ShareProjectContext)

  if (!context) {
    throw new Error(
      'useShareProjectContext is only available inside ShareProjectProvider'
    )
  }

  return context
}

const projectShape = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired
    })
  ),
  invites: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired
    })
  ),
  name: PropTypes.string,
  features: PropTypes.shape({
    collaborators: PropTypes.number
  }),
  publicAccesLevel: PropTypes.string,
  tokens: PropTypes.shape({
    readOnly: PropTypes.string,
    readAndWrite: PropTypes.string
  }),
  owner: PropTypes.shape({
    email: PropTypes.string
  })
})

const ProjectContext = createContext()

ProjectContext.Provider.propTypes = {
  value: projectShape
}

export function useProjectContext() {
  const context = useContext(ProjectContext)

  if (!context) {
    throw new Error(
      'useProjectContext is only available inside ShareProjectProvider'
    )
  }

  return context
}

export default function ShareProjectModal({
  handleHide,
  show,
  animation = true,
  isAdmin,
  eventTracking,
  project,
  updateProject
}) {
  const [inFlight, setInFlight] = useState(false)
  const [error, setError] = useState()

  // reset error when the modal is opened
  useEffect(() => {
    if (show) {
      setError(undefined)
    }
  }, [show])

  // close the modal if not in flight
  const cancel = useCallback(() => {
    if (!inFlight) {
      handleHide()
    }
  }, [handleHide, inFlight])

  // update `error` and `inFlight` while sending a request
  const monitorRequest = useCallback(request => {
    setError(undefined)
    setInFlight(true)

    const promise = request()

    promise.catch(error => {
      setError(
        error.data?.errorReason ||
          error.data?.error ||
          'generic_something_went_wrong'
      )
    })

    promise.finally(() => {
      setInFlight(false)
    })

    return promise
  }, [])

  if (!project) {
    return null
  }

  return (
    <ShareProjectContext.Provider
      value={{
        isAdmin,
        updateProject,
        eventTracking,
        monitorRequest,
        inFlight,
        setInFlight,
        error,
        setError
      }}
    >
      <ProjectContext.Provider value={project}>
        <ShareProjectModalContent
          animation={animation}
          cancel={cancel}
          error={error}
          inFlight={inFlight}
          show={show}
        />
      </ProjectContext.Provider>
    </ShareProjectContext.Provider>
  )
}
ShareProjectModal.propTypes = {
  animation: PropTypes.bool,
  handleHide: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  project: projectShape,
  show: PropTypes.bool.isRequired,
  eventTracking: PropTypes.shape({
    sendMB: PropTypes.func.isRequired
  }),
  updateProject: PropTypes.func.isRequired
}
