import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport } from '../utils'

export default class GalleryExport extends Component {
  constructor(props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      submissionValid: true,
      errorDetails: null
    }
  }

  runExport(ev) {
    ev.preventDefault()
    let valid =
      this.title.value &&
      this.author.value &&
      this.description.value &&
      this.license.value
    if (valid) {
      const { entry, projectId } = this.props
      initiateExport(entry, projectId, this)
    }
    this.setState({ submissionValid: valid })
    return valid
  }

  renderUninitiated() {
    const { entry, author, title, description } = this.props
    var showSource = this.props.showSource !== false
    return (
      <form onSubmit={ev => this.runExport(ev)}>
        <p>
          The Overleaf Gallery is the easiest way to publish your work from
          Overleaf and make it searchable and shareable. Just fill out the
          details below.
        </p>
        <div className="form-control-box">
          <label htmlFor="gallery-export-title">Title</label>
          <input
            id="gallery-export-title"
            type="text"
            className="form-control"
            defaultValue={title}
            maxLength="255"
            placeholder="Title"
            ref={input => (this.title = input)}
          />
        </div>
        <div className="form-control-box">
          <label htmlFor="gallery-export-author">Author(s)</label>
          <input
            id="gallery-export-author"
            type="text"
            className="form-control"
            defaultValue={author}
            maxLength="255"
            placeholder="Author(s)"
            ref={input => (this.author = input)}
          />
        </div>
        <div className="form-control-box">
          <label htmlFor="gallery-export-description">Description</label>
          <textarea
            id="gallery-export-description"
            rows="4"
            className="form-control"
            defaultValue={description}
            maxLength="2048"
            placeholder="Description"
            ref={input => (this.description = input)}
          />
        </div>
        <div className="form-control-box">
          <label htmlFor="gallery-export-license">License</label>
          <select
            id="gallery-export-license"
            ref={input => (this.license = input)}
          >
            <option value="cc_by_4.0">Creative Commons CC BY 4.0</option>
            <option value="lppl_1.3c">LaTeX Project Public License 1.3c</option>
            <option value="other">Other (as stated in the work)</option>
          </select>
          <a
            className="help"
            href={
              // eslint-disable-next-line max-len
              '/learn/how-to/How_are_the_contents_of_the_Overleaf_gallery_licensed%3F'
            }
          >
            (?)
          </a>
        </div>
        <div className="form-control-box no-label">
          <input
            type="checkbox"
            id="gallery-export-show-source"
            defaultChecked={showSource}
            ref={input => (this.showSource = input)}
          />
          <label
            htmlFor="gallery-export-show-source"
            className="checkbox-label"
          >
            Let people use this project as a template.
          </label>
        </div>
        <div className="form-control-box no-label">
          <input
            type="submit"
            className="btn btn-primary"
            value={'Submit to ' + entry.name}
          />
          {!this.state.submissionValid && (
            <p style={{ color: 'red' }}>
              Please provide all of title, author(s) and description before
              continuing
            </p>
          )}
        </div>
      </form>
    )
  }

  renderInitiated() {
    return (
      <span>
        <div style={{ fontSize: 20, margin: '20px 0px 20px' }}>
          <i className="fa fa-refresh fa-spin fa-fw" />
          <span> &nbsp; Exporting files, please wait...</span>
        </div>
      </span>
    )
  }

  renderComplete() {
    return (
      <span>
        <p>Export Successful!</p>
        <p>
          Thanks for submitting to our gallery! We approve most submissions
          within a few hours. We've sent you an e-mail to confirm your
          submission, and we'll send you another one once it's approved.
        </p>
      </span>
    )
  }

  renderError() {
    return (
      <span>
        <p>Export Failed</p>
        <p>Error message: {this.state.errorDetails}</p>
      </span>
    )
  }

  render() {
    const { entry, onReturn, returnText } = this.props

    let body
    if (this.state.exportState === 'unintiated') {
      body = this.renderUninitiated()
    } else if (this.state.exportState === 'initiated') {
      body = this.renderInitiated()
    } else if (this.state.exportState === 'complete') {
      body = this.renderComplete()
    } else {
      body = this.renderError()
    }

    return (
      <div
        className="publish-guide modal-body-content row content-as-table"
        key={entry.id}
      >
        <div className="col-sm-12">
          <ReturnButton onReturn={onReturn} returnText={returnText} />
          <h3 style={{ marginTop: '5px' }}>
            Submit to:
            <strong> {entry.name} </strong>
          </h3>
          {body}
        </div>
      </div>
    )
  }
}

GalleryExport.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  showSource: PropTypes.bool
}
