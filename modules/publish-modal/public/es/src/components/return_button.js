import React, { PropTypes } from 'react'

const ReturnButton = ({ returnText, onReturn }) => {
  if (onReturn) {
    return (
      <button
        className="modal-return button-as-link"
        onClick={() => onReturn(null, null)}
        style={{ paddingBottom: '15px' }}
      >
        <i
          style={{
            paddingRight: '5px',
            color: 'inherit',
            fontSize: 'inherit'
          }}
          className="fa fa-fw fa-arrow-left"
        />
        {returnText}
      </button>
    )
  } else {
    return null
  }
}

ReturnButton.propTypes = {
  returnText: PropTypes.string,
  onReturn: PropTypes.func
}

export default ReturnButton
