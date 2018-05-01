define ['ide/rich-text/rich_text_adapter'], (RichTextAdapter) ->
  describe 'RichTextAdapter', () ->
    beforeEach () ->
      @fileTreeManager = {
        findEntityByPath: @findEntityByPath = sinon.stub()
      }
      @RichTextAdapter = new RichTextAdapter(@fileTreeManager)

    describe 'fileExistsForPath', () ->
      it 'returns true if entity found', () ->
        @findEntityByPath.returns({ id: 'entity_id' })
        expect(@RichTextAdapter.fileExistsForPath('path/to/entity')).to.be.true

      it 'returns false if entity not found', () ->
        @findEntityByPath.returns(null)
        result = @RichTextAdapter.fileExistsForPath(
          '/path/to/non-existent-entity'
        )
        expect(result).to.be.false

    describe 'getPreviewUrlForPath', () ->
      beforeEach () -> window.project_id = 'project_id'
      afterEach () -> window.project_id = null

      it 'returns url for valid path', () ->
        @findEntityByPath.returns({
          id: 'entity_id'
          name: 'entity.png'
        })
        url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity.png')

        expect(@findEntityByPath.calledWith('path/to/entity.png')).to.be.true
        expect(url).to.equal('/project/project_id/file/entity_id')

      it 'returns null if entity not found', () ->
        url = @RichTextAdapter.getPreviewUrlForPath(
          'path/to/non-existent-entity'
        )
        expect(url).to.be.null

      it 'returns previewable url for EPS files', () ->
        @findEntityByPath.returns({
          id: 'entity_id'
          name: 'entity.eps'
        })
        url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity.eps')
        expect(url).to.equal('/project/project_id/file/entity_id?format=png')

      it 'returns previewable url for PDF files', () ->
        @findEntityByPath.returns({
          id: 'entity_id'
          name: 'entity.eps'
        })
        url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity.pdf')
        expect(url).to.equal('/project/project_id/file/entity_id?format=png')

      describe 'with no extension', () ->
        beforeEach () ->
          # No exact match
          @findEntityByPath.withArgs('path/to/entity').returns(null)

        it 'returns url for exact match before extension', () ->
          @findEntityByPath.withArgs('path/to/entity').returns({
            id: 'no_extension_file_id'
            name: 'entity'
          })
          @findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'png_file_id'
            name: 'entity.png'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/no_extension_file_id')

        it 'returns url for pdf', () ->
          @findEntityByPath.withArgs('path/to/entity.pdf').returns({
            id: 'pdf_file_id'
            name: 'entity.pdf'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal(
            '/project/project_id/file/pdf_file_id?format=png'
          )

        it 'returns url for png', () ->
          @findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'png_file_id'
            name: 'entity.png'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/png_file_id')

        it 'returns url for jpg', () ->
          @findEntityByPath.withArgs('path/to/entity.jpg').returns({
            id: 'jpg_file_id'
            name: 'entity.jpg'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/jpg_file_id')

        it 'returns url for jpeg', () ->
          @findEntityByPath.withArgs('path/to/entity.jpeg').returns({
            id: 'jpeg_file_id'
            name: 'entity.jpeg'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/jpeg_file_id')

        it 'handles paths with dots', () ->
          @findEntityByPath.withArgs('path/to/entity.foo.png').returns({
            id: 'png_file_id'
            name: 'entity.png'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity.foo')
          expect(url).to.equal('/project/project_id/file/png_file_id')

        it 'returns url for extension in order', () ->
          # Extensions are picked in order: [exact match], png, pdf, jpg, jpeg
          @findEntityByPath.withArgs('path/to/entity.jpg').returns({
            id: 'jpg_file_id'
            name: 'entity.jpg'
          })
          @findEntityByPath.withArgs('path/to/entity.jpeg').returns({
            id: 'jpeg_file_id'
            name: 'entity.jpeg'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/jpg_file_id')

          @findEntityByPath.withArgs('path/to/entity.pdf').returns({
            id: 'pdf_file_id'
            name: 'entity.pdf'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal(
            '/project/project_id/file/pdf_file_id?format=png'
          )

          @findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'png_file_id'
            name: 'entity.png'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/png_file_id')

        it 'returns correct url for similarly named files', () ->
          @findEntityByPath.withArgs('path/to/entity.png').returns({
            id: 'base_file_id'
            name: 'entity.png'
          })
          @findEntityByPath.withArgs('path/to/entity-1x1.png').returns({
            id: 'similar_file_id'
            name: 'entity-1x1.png'
          })
          url = @RichTextAdapter.getPreviewUrlForPath('path/to/entity')
          expect(url).to.equal('/project/project_id/file/base_file_id')