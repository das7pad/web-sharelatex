const WEB_PATH = '../../..'
const {db} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const UserMapper = require('../app/js/OverleafUsers/UserMapper')
const async = require('async')
const minimist = require('minimist')

addManager = function (manager, callback) {
  console.log('Adding manager', manager.university_id, manager.user_email)
	getManagerV2Id(manager, (error, v2UserId) => {
		if (error) { return callback(error) }
		addManagerToInstitution(manager.university_id, v2UserId, callback)
	})
}

getManagerV2Id = function (manager, callback) {
	let user = { id: manager.user_id, email: manager.user_email }
	UserMapper.getSlIdFromOlUser(user, callback)
}

addManagerToInstitution = function (universityId, v2UserId, callback) {
	query = { v1Id: universityId }
	update = { $addToSet: { managerIds: v2UserId } }
	db.institutions.update(query, update, (error, response) => {
		if (error) { return callback(error) }
		console.log('Modified', response.nModified)
		callback()
	})
}

const argv = minimist(process.argv.slice(2))
const managers = require(argv.json)
console.log('MANAGERS COUNT', managers.length)
async.eachSeries(managers, addManager, function (error) {
	if (error) throw error
	console.log('FINISHED!')
	process.exit()
})
