import React, { PropTypes } from 'react'

const SidebarWithReturnButton = ({returnText, onReturn}) => {
  if (onReturn) {
    return (
      <div className='col-sm-3'>
        <ul className='nav nav-stacked'>
          <li>
            <button
              className='modal-return button-as-link'
              onClick={() => onReturn(null, null)} >
              <i
                style={{
                  'paddingRight': '5px',
                  'color': 'inherit',
                  'fontSize': 'inherit'
                }}
                className='fa fa-fw fa-globe' />
              {returnText}
            </button>
          </li>
        </ul>
      </div>
    )
  } else {
    return (<div className='col-sm-2' />)
  }
}

SidebarWithReturnButton.propTypes = {
  returnText: PropTypes.string,
  onReturn: PropTypes.func
}

export default SidebarWithReturnButton
