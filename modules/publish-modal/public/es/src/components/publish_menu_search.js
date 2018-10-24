/* global _ */
import React, { PropTypes, Component } from 'react'
import Fuse from 'fuse.js'
import PublishMenuGrid from './publish_menu_grid'

export default class PublishMenuSearch extends Component {
  constructor (props) {
    super(props)
    const searchable = _.flatten(
      _.map(props.entries, (category, key) => {
        if (key === 'featured' || key === 'search') {
          return []
        } else {
          return category.entries
        }
      })
    )

    const categoryNames = _.map(props.entries, (category, key) => {
      if (key !== 'featured' && key !== 'search') {
        return category.title
      }
    }).filter((t) => t)

    this.categoryListing =
      _.initial(categoryNames).join(', ') + ' or ' + _.last(categoryNames)

    this.state = {results: []}

    this.fuse = new Fuse(
      searchable,
      { keys: [
        'name',
        'brand_name',
        'publish_menu_html',
        'publish_guide_html'
      ],
      threshold: 0.4
      }
    )
    this.handleInput = this.handleInput.bind(this)
  }

  handleInput (event) {
    var searchResults
    // remove leading and trailing whitespace
    var searchTerm = event.target.value.trim()
    if (searchTerm === '') {
      searchResults = []
    } else {
      searchResults = this.fuse.search(searchTerm)
    }
    this.setState({
      results: searchResults})
  }

  handleSubmit (event) {
    event.preventDefault()
  }

  render () {
    return (
      <div>
        <div>
          <form
            className='search'
            id='search'
            onSubmit={this.handleSubmit} >
            <div id='search-input-container'>
              <label
                className='sr-only'
                htmlFor='search'
              >
                Search
              </label>
              <input
                type='text'
                id='search'
                name='search-input'
                ref='searchInput'
                className='form-control search-input'
                placeholder={this.categoryListing}
                onChange={this.handleInput}
              />
            </div>
          </form>
        </div>
        <div id='search-results'>
          <div>
            { this.state.results.length === 0
              ? ''
              : <PublishMenuGrid
                entries={this.state.results}
                onSwitch={this.props.onSwitch}
                displayCategory />
            }
          </div>
        </div>
      </div>
    )
  }
}
PublishMenuSearch.propTypes = {
  entries: PropTypes.object.isRequired,
  onSwitch: PropTypes.func.isRequired
}
