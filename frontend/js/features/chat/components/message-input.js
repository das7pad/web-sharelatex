import React from 'react'
import PropTypes from 'prop-types'
import t from '../../../misc/t'

function MessageInput({ resetUnreadMessages, sendMessage }) {
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      sendMessage(event.target.value)
      event.target.value = '' // clears the textarea content
    }
  }

  return (
    <div className="new-message">
      <textarea
        placeholder={`${t('your_message')}…`}
        onKeyDown={handleKeyDown}
        onClick={resetUnreadMessages}
      />
    </div>
  )
}

MessageInput.propTypes = {
  resetUnreadMessages: PropTypes.func.isRequired,
  sendMessage: PropTypes.func.isRequired
}

export default MessageInput
