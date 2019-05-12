const WEB_PATH = '../../..'
const {db} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const async = require('async')
const minimist = require('minimist')

createInstitution = function (institution, callback) {
  console.log('Creating institution', institution.id)
	db.institutions.insert({v1Id: institution.id}, (error, response) => {
		if (error) { return callback(error) }
		console.log('Created', response)
		callback()
	})
}
const argv = minimist(process.argv.slice(2))
const institutions = require(argv.json)
console.log('INSTITUTIONS COUNT', institutions.length)
async.eachSeries(institutions, createInstitution, function (error) {
	if (error) throw error
	console.log('FINISHED!')
	process.exit()
})
