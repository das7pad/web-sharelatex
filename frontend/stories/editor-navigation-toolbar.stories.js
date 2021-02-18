import React from 'react'
import ToolbarHeader from '../js/features/editor-navigation-toolbar/components/toolbar-header'

// required by ColorManager
window.user = { id: 42 }

export const UpToThreeConnectedUsers = args => {
  return <ToolbarHeader {...args} />
}
UpToThreeConnectedUsers.args = {
  onlineUsers: ['a', 'c', 'd'].map(c => ({
    user_id: c,
    name: `${c}_user name`
  }))
}

export const ManyConnectedUsers = args => {
  return <ToolbarHeader {...args} />
}
ManyConnectedUsers.args = {
  onlineUsers: ['a', 'c', 'd', 'e', 'f'].map(c => ({
    user_id: c,
    name: `${c}_user name`
  }))
}

export default {
  title: 'EditorNavigationToolbar',
  component: ToolbarHeader,
  argTypes: {
    goToUser: { action: 'goToUser' }
  },
  args: {
    onlineUsers: [{ user_id: 'abc', name: 'overleaf' }],
    goToUser: () => {},
    onShowLeftMenuClick: () => {}
  }
}
