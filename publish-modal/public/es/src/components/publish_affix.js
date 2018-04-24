import React, { PropTypes, Component } from 'react'
import _ from 'lodash'

export default class PublishAffix extends Component {
  render () {
    const categories = this.props.categories

    return (
      <div className=' col-md-3' id='affix-container'>
        <ul
          className='nav nav-tabs nav-stacked overbox overbox-small'
          id='affix-nav' >
          { _.map(categories, (category, key) => {
            return <li key={key}>
              <a
                data-affix-target={key}
                className='affix-link'>
                {category.title}
              </a>
            </li>
          })
          }
        </ul>
        <ul className='nav nav-stacked' id='affix-second-nav' >
          {this.props.initialEntry &&
            <ReturnButton
              initialEntry={this.props.initialEntry}
              onReturn={this.props.onReturn} />
          }
        </ul>
      </div>
    )
  }
}

function ReturnButton ({initialEntry, onReturn}) {
  var returnTo = initialEntry.partner ? 'export' : 'guide'
  return (<li>
    <button
      className='default-guide button-as-link'
      onClick={() => onReturn(returnTo, initialEntry.id)}>
      <i
        style={{
          'paddingRight': '5px',
          'color': 'inherit',
          'fontSize': 'inherit'
        }}
        className='wl-icon wl-icon-accent wl-icon-publish' />
        Return to {initialEntry.name}
    </button>
  </li>)
}

PublishAffix.propTypes = {
  categories: PropTypes.object,
  initialEntry: PropTypes.object,
  onReturn: PropTypes.func
}

ReturnButton.propTypes = {
  initialEntry: PropTypes.object,
  onReturn: PropTypes.func
}
