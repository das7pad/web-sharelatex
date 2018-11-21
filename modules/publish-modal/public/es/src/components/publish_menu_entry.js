import React, { PropTypes, Component } from 'react'

export default class PublishMenuEntry extends Component {
  render() {
    const { name, id, category, displayCategory, switchTo } = this.props

    return (
      <div className="col-sm-6 table-content">
        {displayCategory && (
          <div className="table-content-category">
            {category.replace('_', ' ')}
          </div>
        )}
        <div className="table-content-name">{name}</div>
        <div className="table-content-icon">
          <button
            data-event="publish_entry_select"
            data-category="Publish"
            data-action="choose"
            data-label={this.props.id}
            style={{ border: 0, padding: 0, backgroundColor: 'transparent' }}
            onClick={() => this.props.onSwitch(switchTo, id)}
          >
            <img src={this.props.publish_menu_icon} alt={name} />
          </button>
        </div>
        <div className="table-content-text">
          <div
            className="table-content-slogan"
            dangerouslySetInnerHTML={{ __html: this.props.publish_menu_html }}
          />
        </div>
        <div className="table-content-link">
          <button
            className={`${this.props.linkClass} btn btn-primary btn-wrapping`}
            data-event="publish_entry_select"
            data-category="Publish"
            data-action="choose"
            data-label={this.props.id}
            onClick={() => this.props.onSwitch(switchTo, id)}
            dangerouslySetInnerHTML={{
              __html: this.props.publish_menu_link_html
            }}
          />
        </div>
      </div>
    )
  }
}
PublishMenuEntry.propTypes = {
  id: PropTypes.number,
  name: PropTypes.string,
  category: PropTypes.string,
  publish_menu_icon: PropTypes.string,
  publish_menu_html: PropTypes.string,
  publish_menu_link_html: PropTypes.string,
  linkClass: PropTypes.string,
  switchTo: PropTypes.string,
  onSwitch: PropTypes.func.isRequired,
  displayCategory: PropTypes.bool
}
