/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import RichTextAdapter from '../../../../frontend/js/ide/rich_text_adapter'

describe('RichTextAdapter', function() {
  beforeEach(function() {
    this.fileTreeManager = {
      findEntityByPath: (this.findEntityByPath = sinon.stub())
    }
    return (this.RichTextAdapter = new RichTextAdapter(this.fileTreeManager))
  })

  describe('fileExistsForPath', function() {
    it('returns true if entity found', function() {
      this.findEntityByPath.returns({ id: 'entity_id' })
      return expect(this.RichTextAdapter.fileExistsForPath('path/to/entity')).to
        .be.true
    })

    return it('returns false if entity not found', function() {
      this.findEntityByPath.returns(null)
      const result = this.RichTextAdapter.fileExistsForPath(
        '/path/to/non-existent-entity'
      )
      return expect(result).to.be.false
    })
  })

  describe('getEntityForPath', function() {
    it('returns url for valid path', function() {
      this.findEntityByPath.returns({
        id: 'entity_id',
        name: 'entity.png'
      })
      const entity = this.RichTextAdapter.getEntityForPath('path/to/entity.png')

      expect(this.findEntityByPath.calledWith('path/to/entity.png')).to.be.true
      return expect(entity.id).to.equal('entity_id')
    })

    it('returns undefined if entity not found', function() {
      const entity = this.RichTextAdapter.getEntityForPath(
        'path/to/non-existent-entity'
      )
      return expect(entity).to.be.undefined
    })

    it('returns any matching entry', function() {
      this.findEntityByPath.returns({
        id: 'entity_id',
        name: 'entity.eps'
      })
      const entity = this.RichTextAdapter.getEntityForPath('path/to/entity.eps')
      return expect(entity.id).to.equal('entity_id')
    })

    return describe('with no extension', function() {
      beforeEach(function() {
        // No exact match
        return this.findEntityByPath.withArgs('path/to/entity').returns(null)
      })

      it('returns entry for exact match before extension', function() {
        this.findEntityByPath.withArgs('path/to/entity').returns({
          id: 'no_extension_file_id',
          name: 'entity'
        })
        this.findEntityByPath.withArgs('path/to/entity.png').returns({
          id: 'png_file_id',
          name: 'entity.png'
        })
        const entity = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entity.id).to.equal('no_extension_file_id')
      })

      it('returns entry for pdf', function() {
        this.findEntityByPath.withArgs('path/to/entity.pdf').returns({
          id: 'pdf_file_id',
          name: 'entity.pdf'
        })
        const entity = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entity.id).to.equal('pdf_file_id')
      })

      it('returns entry for png', function() {
        this.findEntityByPath.withArgs('path/to/entity.png').returns({
          id: 'png_file_id',
          name: 'entity.png'
        })
        const entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entry.id).to.equal('png_file_id')
      })

      it('returns entry for jpg', function() {
        this.findEntityByPath.withArgs('path/to/entity.jpg').returns({
          id: 'jpg_file_id',
          name: 'entity.jpg'
        })
        const entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entry.id).to.equal('jpg_file_id')
      })

      it('returns entry for jpeg', function() {
        this.findEntityByPath.withArgs('path/to/entity.jpeg').returns({
          id: 'jpeg_file_id',
          name: 'entity.jpeg'
        })
        const entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entry.id).to.equal('jpeg_file_id')
      })

      it('handles paths with dots', function() {
        this.findEntityByPath.withArgs('path/to/entity.foo.png').returns({
          id: 'png_file_id',
          name: 'entity.png'
        })
        const entry = this.RichTextAdapter.getEntityForPath(
          'path/to/entity.foo'
        )
        return expect(entry.id).to.equal('png_file_id')
      })

      it('returns entry for extension in order', function() {
        // Extensions are picked in order: [exact match], png, pdf, jpg, jpeg
        this.findEntityByPath.withArgs('path/to/entity.jpg').returns({
          id: 'jpg_file_id',
          name: 'entity.jpg'
        })
        this.findEntityByPath.withArgs('path/to/entity.jpeg').returns({
          id: 'jpeg_file_id',
          name: 'entity.jpeg'
        })
        let entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        expect(entry.id).to.equal('jpg_file_id')

        this.findEntityByPath.withArgs('path/to/entity.pdf').returns({
          id: 'pdf_file_id',
          name: 'entity.pdf'
        })
        entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        expect(entry.id).to.equal('pdf_file_id')

        this.findEntityByPath.withArgs('path/to/entity.png').returns({
          id: 'png_file_id',
          name: 'entity.png'
        })
        entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entry.id).to.equal('png_file_id')
      })

      return it('returns correct entry for similarly named files', function() {
        this.findEntityByPath.withArgs('path/to/entity.png').returns({
          id: 'base_file_id',
          name: 'entity.png'
        })
        this.findEntityByPath.withArgs('path/to/entity-1x1.png').returns({
          id: 'similar_file_id',
          name: 'entity-1x1.png'
        })
        const entry = this.RichTextAdapter.getEntityForPath('path/to/entity')
        return expect(entry.id).to.equal('base_file_id')
      })
    })
  })

  describe('isPreviewableEntity', function() {
    it('rejects PDF files for inline previews', function() {
      const previewable = this.RichTextAdapter.isPreviewableEntity({
        id: 'entity_id',
        name: 'entity.pdf'
      })
      return expect(previewable).to.be.false
    })
    it('allows PNG files for inline previews', function() {
      const previewable = this.RichTextAdapter.isPreviewableEntity({
        id: 'entity_id',
        name: 'entity.png'
      })
      return expect(previewable).to.be.true
    })
    it('ignores capitalization', function() {
      const previewable = this.RichTextAdapter.isPreviewableEntity({
        id: 'entity_id',
        name: 'entity.PNG'
      })
      return expect(previewable).to.be.true
    })
  })

  describe('getPreviewUrlForEntity', function() {
    beforeEach(function() {
      window.project_id = 'project_id'
    })
    afterEach(function() {
      window.project_id = null
    })

    it('reads the global context', function() {
      const url = this.RichTextAdapter.getPreviewUrlForEntity({
        id: 'entity_id',
        name: 'entity.png'
      })
      return expect(url).to.equal('/project/project_id/file/entity_id')
    })
  })
})
