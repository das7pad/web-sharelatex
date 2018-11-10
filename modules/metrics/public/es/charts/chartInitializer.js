/* global $ */

import chartApp from './chart_app'
import { filter, sumBy } from 'underscore'

var svgNS = 'http://www.w3.org/2000/svg';

var chartInitializer = {
  getDataAndInitChart: function($chartElt) {
    if($chartElt.length !== 1) {
      return
    }

    $.ajax({
      url: $chartElt.data('url'),
      type: 'GET',
      success: function(data){
        if(data) {
          data = JSON.parse(data)
          initChart(data)
        } else {
          handleMissingDataError()
        }
      },
      error: function() {
        handleHttpError()
      }
    })

    /**
     * handle errors while loading chart data
     */
    function handleMissingDataError() {
      $chartElt.replaceWith(
        '<div class="overbox overbox-small alert-danger"><em>' +
        'Unfortunately no data has been collected yet. ' +
        'Please try again later' +
        '</em></div>'
      )
    }

    /**
     * handle errors while loading chart data
     */
    function handleHttpError() {
      $chartElt.replaceWith(
        '<div class="overbox overbox-small alert-danger"><em>' +
        'Sorry, there was an error fetching your data.' +
        'Please try again later' +
        '</em> </div>'
      )
    }

    /**
     * init the chart
     */
    function initChart(data) {
      // get the $chartElt classes starting with `chart-` and convert them as
      // options
      var chartOptions = null
      if ($chartElt.attr('class')){
        var classArray = $chartElt.attr('class').split(' ')
        var classOptions = filter(classArray, function(klass) {
          return klass.startsWith('chart-')
        }).map(function(klass) {
          return klass.substring(6)
        })
        chartOptions = chartApp.getChartOptions('donutChart', classOptions)
      } else {
        chartOptions = chartApp.getChartOptions('donutChart')
      }
      $chartElt.parents('.hidden-chart-section').show()
      $chartElt.height('300px')
      chartApp.addChart($chartElt, data, chartOptions)
      addChartTotalCount(data)
      autoFixChart($chartElt)
    }

    /**
     * add the total number of users as a svg text element
     */
    function addChartTotalCount(data) {
      $(document.createElementNS(svgNS, 'text'))
        .text(sumBy(data, function(d) { return d.val }))
        .attr('class', 'chart-center-text')
        .appendTo($chartElt)
    }

    /**
     * NVD3 is good, but offer no customization for the layout of the chart and
     * legend. So here's a highly hacky way of positioning all elements as we
     * want.
     */
    function autoFixChart($chartElt) {
      /**
       * init the chart observer. This will monitor the chart element for
       * changes and call the position-fixing method after each changes. Here we
       * monitor updates of the class attribute, as it happens to be updated
       * (but not changed) every time NVD3 redraw the graph. Redraws can be
       * trigered by many different events (click, resize, etc.) so this makes
       * sure we catch them all.
       */
      function initObserver() {
        var observer = new window.MutationObserver(function(mutations) {
          if(mutations.length !== 1) { // ignore event with multiple mutations
            return
          }
          var mutation = mutations[0]
          var $target = $(mutation.target)

          var isNotClassMutation = mutation.attributeName !== 'class'
          var isNotTarget = $target.attr('id') !== $chartElt.attr('id')
          var isNotReady = !$target.attr('class').match(/nvd3-svg/)
          if(isNotClassMutation || isNotTarget || isNotReady) {
            // ignore unstuitable events
            return
          }

          // replace the 'nvd3-svg' class so a new mutation is triggered on the
          // next NVD3 redraw
          $chartElt.attr('class', 'nvd3-iddle')

          // fix all the positioning!
          fixPosition()
          fixLegend()
        })

        observer.observe($chartElt[0], { attributes: true })
      }
      initObserver()

      /**
       * fix the legend to have bigger labels with a better spacing
       */
      function fixLegend() {
        var posX = 0

        $chartElt.find('.nv-series').each(function(_idx, elt){
          // fix labels position
          $(elt).attr('transform', 'translate(0,' + posX + ')')
          posX += 25

          // use full university name in labels
          var fullTitle = $(elt).find('title').first().text()
          if(fullTitle) {
            $(this).find('text').text(fullTitle)
          }
        })
      }

      /**
       * fix the positioning of the legend box, chart and total count
       */
      function fixPosition() {
        var posX, posY, transformDirective

        // reset all positions
        $chartElt.find('svg, g, text').attr('transform', 'translate(0,0)')

        var svgWidth = $chartElt.width()
        var paddingTop = 35 // so the chart and legend are correctly centered
        var chartLength = 222 // the pie fit in a square box of 222x222

        var $pieWrap = $chartElt.find('.nv-pieWrap')
        posX = svgWidth - chartLength / 2
        posY = chartLength / 2 + paddingTop
        transformDirective = 'translate(' + posX + ',' + posY + ')'
        $pieWrap.attr('transform', transformDirective)

        var $centerText = $chartElt.find('.chart-center-text')
        posY += 15
        transformDirective = 'translate(' + posX + ',' + posY + ')'
        $centerText.attr('transform', transformDirective)

        var $legendWrap = $chartElt.find('.nv-legendWrap')
        posX = 30
        posY = 10 + paddingTop
        transformDirective = 'translate(' + posX + ',' + posY + ')'
        $legendWrap.attr('transform', transformDirective)
      }
    }
  }
}

export default chartInitializer
