import { expect } from 'chai'
import React from 'react'
import sinon from 'sinon'
import { screen, render, fireEvent } from '@testing-library/react'

import MessageInput from '../../../../../frontend/js/features/chat/components/message-input'

describe('<MessageInput />', function () {
  let resetUnreadMessages, sendMessage

  beforeEach(function () {
    resetUnreadMessages = sinon.stub()
    sendMessage = sinon.stub()
  })

  it('renders successfully', function () {
    render(
      <MessageInput
        sendMessage={sendMessage}
        resetUnreadMessages={resetUnreadMessages}
      />
    )

    screen.getByLabelText('Your Message')
  })

  it('sends a message after typing and hitting enter', function () {
    render(
      <MessageInput
        sendMessage={sendMessage}
        resetUnreadMessages={resetUnreadMessages}
      />
    )

    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'hello world' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(sendMessage).to.be.calledOnce
    expect(sendMessage).to.be.calledWith('hello world')
  })

  it('resets the number of unread messages after clicking on the input', function () {
    render(
      <MessageInput
        sendMessage={sendMessage}
        resetUnreadMessages={resetUnreadMessages}
      />
    )

    const input = screen.getByPlaceholderText('Your Message…')

    fireEvent.click(input)
    expect(resetUnreadMessages).to.be.calledOnce
  })
})
