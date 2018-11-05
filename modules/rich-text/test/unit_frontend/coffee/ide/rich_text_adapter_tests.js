/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['ide/rich-text/rich_text_adapter'], RichTextAdapter =>
  describe('RichTextAdapter', function() {
    beforeEach(function() {
      this.fileTreeManager = {
        findEntityByPath: (this.findEntityByPath = sinon.stub())
      };
      return this.RichTextAdapter = new RichTextAdapter(this.fileTreeManager);
    });

    describe('fileExistsForPath', function() {
      it('returns true if entity found', function() {
        this.findEntityByPath.returns({ id: 'entity_id' });
        return expect(this.RichTextAdapter.fileExistsForPath('path/to/entity')).to.be.true;
      });

      return it('returns false if entity not found', function() {
        this.findEntityByPath.returns(null);
        const result = this.RichTextAdapter.fileExistsForPath(
          '/path/to/non-existent-entity'
        );
        return expect(result).to.be.false;
      });
    });

    return describe('getPreviewUrlForPath', function() {
      beforeEach(() => window.project_id = 'project_id');
      afterEach(() => window.project_id = null);

      it('returns url for valid path', function() {
        this.findEntityByPath.returns({
          id: 'entity_id',
          name: 'entity.png'
        });
        const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity.png');

        expect(this.findEntityByPath.calledWith('path/to/entity.png')).to.be.true;
        return expect(url).to.equal('/project/project_id/file/entity_id');
      });

      it('returns null if entity not found', function() {
        const url = this.RichTextAdapter.getPreviewUrlForPath(
          'path/to/non-existent-entity'
        );
        return expect(url).to.be.null;
      });

      it('returns previewable url for EPS files', function() {
        this.findEntityByPath.returns({
          id: 'entity_id',
          name: 'entity.eps'
        });
        const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity.eps');
        return expect(url).to.equal('/project/project_id/file/entity_id?format=png');
      });

      it('returns previewable url for PDF files', function() {
        this.findEntityByPath.returns({
          id: 'entity_id',
          name: 'entity.eps'
        });
        const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity.pdf');
        return expect(url).to.equal('/project/project_id/file/entity_id?format=png');
      });

      return describe('with no extension', function() {
        beforeEach(function() {
          // No exact match
          return this.findEntityByPath.withArgs('path/to/entity').returns(null);
        });

        it('returns url for exact match before extension', function() {
          this.findEntityByPath.withArgs('path/to/entity').returns({
            id: 'no_extension_file_id',
            name: 'entity'
          });
          this.findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'png_file_id',
            name: 'entity.png'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal('/project/project_id/file/no_extension_file_id');
        });

        it('returns url for pdf', function() {
          this.findEntityByPath.withArgs('path/to/entity.pdf').returns({
            id: 'pdf_file_id',
            name: 'entity.pdf'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal(
            '/project/project_id/file/pdf_file_id?format=png'
          );
        });

        it('returns url for png', function() {
          this.findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'png_file_id',
            name: 'entity.png'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal('/project/project_id/file/png_file_id');
        });

        it('returns url for jpg', function() {
          this.findEntityByPath.withArgs('path/to/entity.jpg').returns({
            id: 'jpg_file_id',
            name: 'entity.jpg'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal('/project/project_id/file/jpg_file_id');
        });

        it('returns url for jpeg', function() {
          this.findEntityByPath.withArgs('path/to/entity.jpeg').returns({
            id: 'jpeg_file_id',
            name: 'entity.jpeg'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal('/project/project_id/file/jpeg_file_id');
        });

        it('handles paths with dots', function() {
          this.findEntityByPath.withArgs('path/to/entity.foo.png').returns({
            id: 'png_file_id',
            name: 'entity.png'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity.foo');
          return expect(url).to.equal('/project/project_id/file/png_file_id');
        });

        it('returns url for extension in order', function() {
          // Extensions are picked in order: [exact match], png, pdf, jpg, jpeg
          this.findEntityByPath.withArgs('path/to/entity.jpg').returns({
            id: 'jpg_file_id',
            name: 'entity.jpg'
          });
          this.findEntityByPath.withArgs('path/to/entity.jpeg').returns({
            id: 'jpeg_file_id',
            name: 'entity.jpeg'
          });
          let url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          expect(url).to.equal('/project/project_id/file/jpg_file_id');

          this.findEntityByPath.withArgs('path/to/entity.pdf').returns({
            id: 'pdf_file_id',
            name: 'entity.pdf'
          });
          url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          expect(url).to.equal(
            '/project/project_id/file/pdf_file_id?format=png'
          );

          this.findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'png_file_id',
            name: 'entity.png'
          });
          url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal('/project/project_id/file/png_file_id');
        });

        return it('returns correct url for similarly named files', function() {
          this.findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'base_file_id',
            name: 'entity.png'
          });
          this.findEntityByPath.withArgs('path/to/entity-1x1.png').returns({
            id: 'similar_file_id',
            name: 'entity-1x1.png'
          });
          const url = this.RichTextAdapter.getPreviewUrlForPath('path/to/entity');
          return expect(url).to.equal('/project/project_id/file/base_file_id');
        });
      });
    });
  })
);