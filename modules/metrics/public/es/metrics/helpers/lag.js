import { map, keys } from 'underscore'

const lag = {}

lag.names = {
  daily: 'Day',
  weekly: 'Week',
  monthly: 'Month'
}
lag.keys = keys(lag.names)
lag.selected = lag.keys[0]

// format the lags for the handlebar template
lag.mapForTemplate = function () {
  return map(lag.keys, function (lagKey, idx) {
    return {
      key: lagKey,
      name: lag.names[lagKey],
      isSelected: lagKey === lag.selected
    }
  })
}

export default lag
