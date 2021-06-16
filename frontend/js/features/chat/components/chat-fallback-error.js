import React from 'react'
import PropTypes from 'prop-types'
import { Button, Alert } from 'react-bootstrap'
import t from '../../../misc/t'

function ChatFallbackError({ reconnect }) {
  return (
    <aside className="chat">
      <div className="chat-error">
        <Alert bsStyle="danger">{t('chat_error')}</Alert>
        {reconnect && (
          <p className="text-center">
            <Button bsStyle="info" type="button" onClick={reconnect}>
              {t('reconnect')}
            </Button>
          </p>
        )}
      </div>
    </aside>
  )
}

ChatFallbackError.propTypes = {
  reconnect: PropTypes.any,
}

export default ChatFallbackError
