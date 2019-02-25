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

removeBrandVariationIdMatchingId(bvId, commit)
process.exit()

function removeBrandVariationIdMatchingId(bvId, commit = false) {
  console.log(
    (commit ? 'Remove' : 'Dry run for remove') +
      ' brandVariationId from projects that have { brandVariationId: ' +
      bvId +
      ' }'
  )
  db.projects.aggregate(
    [{ $match: { brandVariationId: { bvId } } }],
    { allowDiskUse: true },
    function(err, results) {
      if (err) throw err
      console.log('Found ' + results.length + ' projects')
      async.each(results, brandVariationIdRemover(commit), function(err) {
        if (err) throw err
        console.log(
          'BrandVariationId ' +
            (commit ? 'removed' : 'would be removed') +
            ' from ' +
            results.length +
            ' projects'
        )
      })
    }
  )
}

// return an async function to remove BrandVariationId from a project
// The value of commit is in the closure for the function, which
// only commits the database change if commit is true.
// Either way it puts a message on the console that shows the project.
function brandVariationIdRemover(commit = false) {
  const commitRemoval = commit
  function removeBrandVariationId(project, callback) {
    console.log(
      (commitRemoval ? 'Removing' : 'Would remove') +
        ' brandVariationId on project ' +
        project._id +
        ', name, "' +
        project.name +
        '"'
    )
    if (commitRemoval) {
      db.projects.update(
        { _id: project._id },
        { $unset: { 'overleaf.id': '' } },
        callback
      )
    } else {
      callback()
    }
  }
}
