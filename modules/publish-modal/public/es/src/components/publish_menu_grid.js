import React, { PropTypes, Component } from 'react'
import PublishMenuRow from './publish_menu_row'

export default class PublishMenuGrid extends Component {
  constructor (props) {
    super(props)
    if (this.props.entries.length > 2) {
      this.state = {shownCount: 4}
    } else {
      this.state = {shownCount: 2}
    }
  }

  showMore () {
    this.setState({shownCount: this.state.shownCount + 4})
  }

  render () {
    // build rows on render
    var rows = []
    for (var i = 0; i < this.state.shownCount; i += 2) {
      if (this.props.entries.length < i + 1) break

      rows.push(
        <PublishMenuRow
          left={this.props.entries[i]}
          right={this.props.entries[i + 1]}
          onSwitch={this.props.onSwitch}
          displayCategory={this.props.displayCategory} />
      )
    }
    return (
      <div className='overbox overbox-small'>
        {
          rows.map((row, i) => {
            return <div key={'outer-div' + i}>
              {(i > 0) && <hr />}
              <div className='row'>
                {row}
              </div>
            </div>
          })
        }
        { this.state.shownCount < this.props.entries.length &&
          <span><br />
            <button className='button-as-link' onClick={() => this.showMore()}>Show more</button>
          </span>
        }
      </div>
    )
  }
}
PublishMenuGrid.propTypes = {
  entries: PropTypes.array,
  onSwitch: PropTypes.func.isRequired,
  displayCategory: PropTypes.bool
}
