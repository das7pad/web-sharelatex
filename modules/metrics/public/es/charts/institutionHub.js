/* global $ */

import chartInitializer from './chartInitializer'

const institutionHub = {
  getDataAndInitCharts: () => {
    chartInitializer.getDataAndInitChart($('#v2-external-collaboration-chart'));
    chartInitializer.getDataAndInitChart($('#institutional-departments-chart'));
    chartInitializer.getDataAndInitChart($('#institutional-roles-chart'));
  }
}

export default institutionHub
