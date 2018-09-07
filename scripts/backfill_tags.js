const WEB_PATH = '../../..'

const TagsHandler = require(`${WEB_PATH}/app/js/Features/Tags/TagsHandler`)
const {db} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const {request} = require('../app/js/V1SharelatexApi')
const async = require('async')
const minimist = require('minimist')
const settings = require('settings-sharelatex')

const argv = minimist(process.argv.slice(2))
const commit = argv.commit !== undefined
const startId = argv.start || 0

if (!commit) {
	console.log('DOING DRY RUN. TO SAVE CHANGES PASS --commit')
}

db.projects.find({
	'overleaf.id': { $exists: true },
	'overleaf.id': { $gt: startId },
}, {
	'overleaf.id': 1,
	'owner_ref': 1,
	'collaberator_refs': 1,
	'tokenAccessReadAndWrite_refs': 1,
}).sort({ 'overleaf.id': 1 }, function (error, projects) {
	if (error) throw error
	console.log('PROJECT COUNT', projects.length)
	async.mapSeries(projects, backfillTags, function (error) {
		if (error) throw error
		console.log('FINISHED!')
		process.exit()
	})
})

function backfillTags (project, callback) {
	let user_ids = [ project.owner_ref ]
	if (project.collaberator_refs) {
		user_ids = user_ids.concat(project.collaberator_refs)
	}
	if (project.tokenAccessReadAndWrite_refs) {
		user_ids = user_ids.concat(project.tokenAccessReadAndWrite_refs)
	}
	console.log(`BACKFILLING TAGS FOR PROJECT ${project.overleaf.id} ${project._id}`)
	async.mapSeries(user_ids, function (user_id, cb) {
		hasTags(project._id, user_id, function (hasTags) {
			if (hasTags) {
				console.log(`SKIPPING PROJECT ${project.overleaf.id} FOR USER ${user_id} - ALREADY HAS TAGS`)
				return cb()
			}
			backfillTagsForUser(project, user_id, cb)
		})
	}, callback)
}

function backfillTagsForUser (project, user_id, callback) {
	db.users.findOne({
		_id: user_id,
		'overleaf.id': { $exists: true },
	}, {
		'overleaf.id': true,
	}, function (error, user) {
		if (error) throw error
		if (user === null) {
			console.log(`USER ${user_id} NOT FOUND FOR PROJECT ${project.overleaf.id}`)
			return callback()
		}
		console.log(`GETTING TAGS FOR PROJECT ${project.overleaf.id} USER ${user.overleaf.id}`)
		request({
			url: `${settings.overleaf.host}/api/v1/sharelatex/users/${user.overleaf.id}/docs/${project.overleaf.id}/export/tags`,
		}, function (error, res, body) {
			if (error) throw error
			if (!body.tags.length) {
				console.log(`NO TAGS FOR PROJECT ${project.overleaf.id} USER ${user.overleaf.id}`)
				return callback()
			}
			console.log(`ADDING TAGS ${body.tags.join(', ')} FOR PROJECT ${project.overleaf.id} ${project._id} USER ${user.overleaf.id} ${user_id}`)
			if (!commit) return callback()
			async.mapSeries(body.tags, function (tag, cb) {
				TagsHandler.addProjectToTagName(user_id, tag, project._id, cb)
			}, callback)
		})
	})
}

function hasTags (project_id, user_id, callback) {
	db.tags.findOne({
		user_id: user_id.toString(),
		project_ids: project_id.toString(),
	}, function (error, tag) {
		if (error) throw error
		callback(tag !== null)
	})
}
