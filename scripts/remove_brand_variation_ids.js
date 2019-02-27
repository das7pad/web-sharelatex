//
// Remove the brandVariationId attribute from project documents that have
// that attribute, which value matches the one given.
//
// node scripts/remove_brand_variation_ids.js 3
//   gives a report of project documents that have brandVariationId attribute
//   with value, "3"
//
// node scripts/remove_brand_variation_ids.js 3 --commit true
//   actually removes the brandVariationId attribute from  project documents
//   that have brandVariationId attribute with value, "3"
//
const { db } = require('../app/js/infrastructure/mongojs')
const async = require('async')
const minimist = require('minimist')

const argv = minimist(process.argv.slice(2))
const bvId = argv._[0]
const commit = argv.commit !== undefined

console.log(
  (commit ? 'Remove' : 'Dry run for remove') +
    ' brandVariationId from projects that have { brandVariationId: ' +
    bvId +
    ' }'
)

results = db.projects.find({ brandVariationId: bvId }, { _id: 1, name: 1 })
var count = 0
var problems = 0

results.forEach(removeBrandVariationId, announceProblem)

console.log(
  'BrandVariationId ' +
    (commit ? 'removed' : 'would be removed') +
    ' from ' +
    count +
    ' projects'
)
if (0 < problems) console.log('There were ' + problems + ' problems')

process.exit()

function removeBrandVariationId(project) {
  count += 1
  console.log(
    (commit ? 'Removing' : 'Would remove') +
      ' brandVariationId on project ' +
      project._id +
      ', name, "' +
      project.name +
      '"'
  )
  if (commit) {
    db.projects.update(
      { _id: project._id },
      { $unset: { brandVariationId: '' } }
    )
  }
}

function announceProblem(err) {
  problems += 1
  console.log('Encountered problem, ', err)
}
