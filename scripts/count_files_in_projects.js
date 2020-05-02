const readline = require('readline')
const ProjectEntityHandler = require('../app/src/Features/Project/ProjectEntityHandler')
const ProjectGetter = require('../app/src/Features/Project/ProjectGetter')
const Errors = require('../app/src/Features/Errors/Errors')

async function countFiles() {
  const rl = readline.createInterface({
    input: process.stdin
  })

  for await (const projectId of rl) {
    try {
      const project = await ProjectGetter.promises.getProject(projectId)
      const {
        files,
        docs
      } = await ProjectEntityHandler.promises.getAllEntitiesFromProject(project)
      console.error(
        projectId,
        files.length,
        project.deletedFiles.length,
        docs.length,
        project.deletedDocs.length
      )
    } catch (err) {
      if (err instanceof Errors.NotFoundError) {
        console.error(projectId, 'NOTFOUND')
      } else {
        throw err
      }
    }
  }
}

countFiles().then(() => process.exit(0))
