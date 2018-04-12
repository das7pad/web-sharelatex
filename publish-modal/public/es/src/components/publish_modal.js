import React, { PropTypes, Component } from 'react'

export default class PublishModal extends Component {
  constructor (props) {
    super(props)
    this.state = { shown: props.initialShown, baseReturn: props.initialShown }
    this.handleSwitch = this.handleSwitch.bind(this)
  }

  handleSwitch (switchTo, guideId) {
    if (switchTo) {
      this.setState({ shown: switchTo, guideId: guideId })
    } else {
      this.setState({ shown: this.state.baseReturn, guideId: null })
    }
  }

  render () {
    return (
      <span> [publish modal content] </span>
    )
  }
}

PublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  docKey: PropTypes.string.isRequired,
  initialShown: PropTypes.string.isRequired,
  brandVariationId: PropTypes.number
}
