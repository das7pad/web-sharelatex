import _ from 'lodash'

export function findEntryInCategories (categories, id) {
  let entry
  _.forEach(categories, (category) => {
    if (!entry) {
      entry = _.find(category.entries, (entry) => {
        return entry.id === id
      })
    }
  })
  return entry
}
