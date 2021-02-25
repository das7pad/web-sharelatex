import React from 'react'
import PropTypes from 'prop-types'
import { Dropdown, MenuItem, OverlayTrigger, Tooltip } from 'react-bootstrap'
import Icon from '../../../shared/components/icon'
import ColorManager from '../../../ide/colors/ColorManager'
import t from '../../../misc/t'

function OnlineUsersWidget({ onlineUsers, goToUser }) {
  const shouldDisplayDropdown = onlineUsers.length >= 4

  if (shouldDisplayDropdown) {
    return (
      <Dropdown id="online-users" className="online-users" pullRight>
        <DropDownToggleButton
          bsRole="toggle"
          onlineUserCount={onlineUsers.length}
        />
        <Dropdown.Menu>
          <MenuItem header>{t('connected_users')}</MenuItem>
          {onlineUsers.map(user => (
            <MenuItem
              as="button"
              key={user.user_id}
              eventKey={user}
              onSelect={goToUser}
            >
              <UserIcon user={user} onClick={goToUser} showName />
            </MenuItem>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    )
  } else {
    return (
      <div className="online-users">
        {onlineUsers.map(user => (
          <OverlayTrigger
            key={user.user_id}
            placement="bottom"
            trigger={['hover', 'focus']}
            overlay={<Tooltip id="tooltip-online-user">{user.name}</Tooltip>}
          >
            <span>
              {/* OverlayTrigger won't fire unless UserIcon is wrapped in a span */}
              <UserIcon user={user} onClick={goToUser} />
            </span>
          </OverlayTrigger>
        ))}
      </div>
    )
  }
}

OnlineUsersWidget.propTypes = {
  onlineUsers: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired,
  goToUser: PropTypes.func.isRequired
}

function UserIcon({ user, showName, onClick }) {
  const backgroundColor = `hsl(${ColorManager.getHueForUserId(
    user.user_id
  )}, 70%, 50%)`

  function handleOnClick() {
    onClick(user)
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <span onClick={handleOnClick}>
      <span className="online-user" style={{ backgroundColor }}>
        {user.name.slice(0, 1)}
      </span>
      {showName && user.name}
    </span>
  )
}

UserIcon.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }),
  showName: PropTypes.bool,
  onClick: PropTypes.func.isRequired
}

const DropDownToggleButton = React.forwardRef((props, ref) => {
  return (
    <OverlayTrigger
      placement="left"
      overlay={
        <Tooltip id="tooltip-connected-users">{t('connected_users')}</Tooltip>
      }
    >
      <button
        className="btn online-user online-user-multi"
        onClick={props.onClick} // required by Bootstrap Dropdown to trigger an opening
      >
        <strong>{props.onlineUserCount}</strong>
        <Icon type="users" modifier="fw" />
      </button>
    </OverlayTrigger>
  )
})

DropDownToggleButton.propTypes = {
  onlineUserCount: PropTypes.number.isRequired,
  onClick: PropTypes.func
}

export default OnlineUsersWidget