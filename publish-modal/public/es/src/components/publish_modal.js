import React, { PropTypes, Component } from 'react'
import _ from 'lodash'

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
    const { entries } = this.props
    return (
      <div>
        {_.map(entries, (category, key) =>
          <div key={'category-' + key}>
            <span
              className='affix-target affix-content-title'
              data-affix-target={key}>
              {category.title }
            </span>
            <div className='affix-subcontent'>
            </div>
          </div>
       )}
      </div>
    )
  }
}

PublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  docKey: PropTypes.string.isRequired,
  initialShown: PropTypes.string.isRequired,
  brandVariationId: PropTypes.number
}
