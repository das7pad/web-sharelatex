const mongoose = require('../infrastructure/Mongoose')

const { Schema } = mongoose

const DocSchema = new Schema({
  name: { type: String, default: 'new doc' },
})

DocSchema.index(
  { project_id: 1, deleted: 1, deletedAt: -1 },
  { name: 'project_id_deleted_deletedAt_1', background: 1 }
)

exports.Doc = mongoose.model('Doc', DocSchema)

exports.DocSchema = DocSchema
