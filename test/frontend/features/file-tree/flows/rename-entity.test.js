import { expect } from 'chai'
import React from 'react'
import sinon from 'sinon'
import { screen, render, fireEvent } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import MockedSocket from 'socket.io-mock'

import FileTreeRoot from '../../../../../frontend/js/features/file-tree/components/file-tree-root'

describe('FileTree Rename Entity Flow', function() {
  const onSelect = sinon.stub()
  const onInit = sinon.stub()

  beforeEach(function() {
    window._ide = {
      socket: new MockedSocket()
    }
    global.requestAnimationFrame = sinon.stub()
  })

  afterEach(function() {
    delete global.requestAnimationFrame
    fetchMock.restore()
    onSelect.reset()
    onInit.reset()
    delete window._ide
  })

  beforeEach(function() {
    const rootFolder = [
      {
        _id: 'root-folder-id',
        docs: [{ _id: '456def', name: 'a.tex' }],
        folders: [
          {
            _id: '987jkl',
            name: 'folder',
            docs: [],
            fileRefs: [
              { _id: '789ghi', name: 'c.tex' },
              { _id: '981gkp', name: 'e.tex' }
            ],
            folders: []
          }
        ],
        fileRefs: []
      }
    ]
    render(
      <FileTreeRoot
        rootFolder={rootFolder}
        projectId="123abc"
        hasWritePermissions
        onSelect={onSelect}
        onInit={onInit}
        isConnected
      />
    )
  })

  it('renames doc', function() {
    const fetchMatcher = /\/project\/\w+\/doc\/\w+\/rename/
    fetchMock.post(fetchMatcher, 204)

    const input = initItemRename('a.tex')
    fireEvent.change(input, { target: { value: 'b.tex' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    screen.getByRole('treeitem', { name: 'b.tex' })

    const lastFetchBody = getLastFetchBody(fetchMatcher)
    expect(lastFetchBody.name).to.equal('b.tex')
  })

  it('renames folder', function() {
    const fetchMatcher = /\/project\/\w+\/folder\/\w+\/rename/
    fetchMock.post(fetchMatcher, 204)

    const input = initItemRename('folder')
    fireEvent.change(input, { target: { value: 'new folder name' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    screen.getByRole('treeitem', { name: 'new folder name' })

    const lastFetchBody = getLastFetchBody(fetchMatcher)
    expect(lastFetchBody.name).to.equal('new folder name')
  })

  it('renames file in subfolder', function() {
    const fetchMatcher = /\/project\/\w+\/file\/\w+\/rename/
    fetchMock.post(fetchMatcher, 204)

    const expandButton = screen.queryByRole('button', { name: 'Expand' })
    if (expandButton) fireEvent.click(expandButton)

    const input = initItemRename('c.tex')
    fireEvent.change(input, { target: { value: 'd.tex' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    screen.getByRole('treeitem', { name: 'folder' })
    screen.getByRole('treeitem', { name: 'd.tex' })

    const lastFetchBody = getLastFetchBody(fetchMatcher)
    expect(lastFetchBody.name).to.equal('d.tex')
  })

  it('reverts rename on error', async function() {
    const fetchMatcher = /\/project\/\w+\/doc\/\w+\/rename/
    fetchMock.post(fetchMatcher, 500)

    const input = initItemRename('a.tex')
    fireEvent.change(input, { target: { value: 'b.tex' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    screen.getByRole('treeitem', { name: 'b.tex' })
  })

  it('shows error modal on invalid filename', async function() {
    const input = initItemRename('a.tex')
    fireEvent.change(input, { target: { value: '///' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await screen.findByRole('alert', {
      name: 'File name is empty or contains invalid characters',
      hidden: true
    })
  })

  it('shows error modal on duplicate filename', async function() {
    const input = initItemRename('a.tex')
    fireEvent.change(input, { target: { value: 'folder' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await screen.findByRole('alert', {
      name: 'A file or folder with this name already exists',
      hidden: true
    })
  })

  it('shows error modal on duplicate filename in subfolder', async function() {
    const expandButton = screen.queryByRole('button', { name: 'Expand' })
    if (expandButton) fireEvent.click(expandButton)

    const input = initItemRename('c.tex')
    fireEvent.change(input, { target: { value: 'e.tex' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await screen.findByRole('alert', {
      name: 'A file or folder with this name already exists',
      hidden: true
    })
  })

  it('shows error modal on blocked filename', async function() {
    const input = initItemRename('a.tex')
    fireEvent.change(input, { target: { value: 'prototype' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await screen.findByRole('alert', {
      name: 'This file name is blocked.',
      hidden: true
    })
  })

  describe('via socket event', function() {
    it('renames doc', function() {
      screen.getByRole('treeitem', { name: 'a.tex' })

      window._ide.socket.socketClient.emit(
        'reciveEntityRename',
        '456def',
        'socket.tex'
      )

      screen.getByRole('treeitem', { name: 'socket.tex' })
    })
  })

  function initItemRename(treeitemName) {
    const treeitem = screen.getByRole('treeitem', { name: treeitemName })
    fireEvent.click(treeitem)

    const renameButton = screen.getByRole('menuitem', { name: 'Rename' })
    fireEvent.click(renameButton)

    return screen.getByRole('textbox')
  }
  function getLastFetchBody(matcher) {
    const [, { body }] = fetchMock.lastCall(matcher)
    return JSON.parse(body)
  }
})
