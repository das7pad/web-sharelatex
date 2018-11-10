/* global $ */

import chartInitializer from './chartInitializer'

const institutionHub = {
  getDataAndInitCharts: () => {
    console.log("initting the charts!")
    chartInitializer.getDataAndInitChart($('#v2-external-collaboration-chart'));
  }
}

export default institutionHub
