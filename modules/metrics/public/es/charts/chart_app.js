/* global $ */

import * as d3 from 'd3';
import { each, isArray, isObject, debounce, clone, reduce } from 'underscore';
import merge from 'lodash/merge';
import { createChart } from './chart';

var allOptions, additionalOptions;

/**
 * recursive function do get the chart's options obect from a given set of
 * options keys. The given keys can be any keys from chartOptions or
 * classOptions objects.
 */
function buildChartOptions(filteredOptions) {
  if(isArray(filteredOptions) && filteredOptions.length > 0) {
    var returnOptions = {};
    each(filteredOptions, function(optionName) {
      additionalOptions = buildChartOptions(allOptions[optionName]);
      each(additionalOptions, function(val, key){
        returnOptions[key] = val;
      });
    });
    return returnOptions;
  } else {
    return filteredOptions;
  }
}

var chartOptions = {
  chartDefault: {
    margin: {top: 0, right: 40, bottom: 30, left: 70},
    useInteractiveGuideline: true,
    transitionDuration: 350,
    showLegend: true,
    tooltips: true,
    showControls: false,
    customDiscreteDateValuesFix: true,
  },
  xAxisDefault: {
    showXAxis: true,
    xAxisTickPadding: 10,
    forceY: [0]
  },
  yAxisDefault: {
    showYAxis: true,
    yAxisTickPadding: 10,
    yAxisFormat: d3.format(',d'),
  },
  xAxisAsDate: {
    x: function(d) {
      return new Date(d.x);
    },
  },
  formatXAsDay: {
    xAxisFormat: function(d) {
      return d3.time.format.utc('%d %b %Y')(new Date(d));
    }
  },
  formatXAsMonth: {
    xAxisFormat: function(d) {
      return d3.time.format.utc('%B %Y')(new Date(d));
    }
  },
  multiBarChart: {
    chartType: 'multiBarChart',
    emptyBeforeUpdate: true,
    customDiscreteDateValuesFix: false,
  },
  stackedChart: {
    stacked: true,
  },
  lineChart: {
    chartType: 'lineChart',
  },
  yAxisFloat: {
    yAxisFormat: d3.format(',.2f'),
  },
  expand: {
    style: 'expand',
    customTooltipValue: function(serie) { return serie.point.y; },
  },
  shadedColour: {
    shadedColour: true,
  },
  hideLegend: {
    showLegend: false,
  },
  donutChart: {
    chartType: 'donutChart',
    valueFormat: d3.format('d'),
    x: function(d) { return d.key },
    y: function(d) { return d.val },
    legendPosition: 'right',
    showLabels: false,
    padAngle: .05,
    avoidHumanizeKeys: true,
  },
  percentValue: {
    valueFormat: d3.format('.0%'),
  }
};

var classOptions = {
  basics: [
    'chartDefault',
    'basicsAxis',
    'xAxisAsDate',
  ],
  basicsAxis: [
    'xAxisDefault',
    'yAxisDefault',
  ],
  'lag-daily': [
    'formatXAsDay',
  ],
  'lag-weekly': [
    'formatXAsDay',
  ],
  'lag-monthly': [
    'formatXAsMonth',
  ],
  expandedChart: [
    'hideLegend',
    'expand',
    'shadedColour',
  ],
  'percent': [
    'percentValue',
  ]
};

const chartApp = {
  init: () => {
    allOptions = merge(classOptions, chartOptions);

  /**
   * resize all charts on window resize
   */
  $(window).resize(debounce(function() {
    each(this.charts, function(chart){
      chart.update();
    });
  }, 200));
  },

  charts: [],

  /**
   * add a chart to the given svg element
   */
  addChart: function($svgElt, chartData, options) {
    var chart = createChart($svgElt, options);

    chartData = formatData(chartData, options);

    nv.addGraph(function() {
      d3.select($svgElt[0])
        .datum(chartData)
        .call(chart);
    });

    // add css classes on the svg element
    var svgClasses = $svgElt.attr('class') || "";
    if(options.showLegend === false) {
      svgClasses += " hidden-legend-margin-fix";
    }
    if(options.shadedColour === true) {
      svgClasses += " no-fill-opacity";
    }

    $svgElt.attr('class', svgClasses.trim());

    return chart;
  },

  /**
   * Update a chart
   */
  updateChart: function($svgElt, chartData, options, chart) {
    chart = createChart($svgElt, options);

    if(options.emptyBeforeUpdate || chartData.length === 0) {
      $svgElt.empty();
    }

    var d3Elt = d3.select($svgElt[0]);

    if(chartData) {
      chartData = formatData(chartData, options);
      d3Elt.datum(chartData);
    }

    d3Elt.call(chart);

    return chart;
  },

  /**
   * getChartOptions returns an object of options ready to be used to create
   * NVD3 chart. It builds that object via buildChartOptions from a set of given
   * keys, keys can be low-level chart-related keys (from chartOptions) or
   * higher-level 'class' keys (form classOptions). You can think
   * of this logic like CSS classes inheritance. If the given keys introduce
   * duplicate chart options, the values will be overriden by the lates option
   * added
   */
  getChartOptions: function() {
    var filteredOptions = ['basics'];
    each(arguments, function(optionKey) {
      var opts = allOptions[optionKey];
      if(isArray(opts)) {
        filteredOptions = filteredOptions.concat(opts);
      } else if(isObject(opts)) {
        filteredOptions.push(optionKey);
      }
    });
    return buildChartOptions(filteredOptions);
  },
};

/**
 * Do some formatting on the data before passing it to nvd3
 */
var formatData = function(data, options) {
  if(!options.avoidHumanizeKeys) {
    data = humanizeKeys(data);
  }
  if(!!options.shadedColour) {
    data = formatShadedColor(data);
  } else {
    data = formatColor(data);
  }
  return data;
};

/**
 * transform snake_case keys into humanized names (capitalized words with
 * spaces). Not full-proof; but works OK.
 */
var humanizeKeys = function(data) {
  each(data, function(lineData, i) {
    data[i].key = data[i].key.replace(/(\b|_)./g, function(letters) {
      return letters.replace('_', ' ').toUpperCase();
    }).replace('Doc', 'Project')
      .replace('Avg', 'Average')
      .replace(/Projects (10+)$/, 'Projects $1+ edits');
  });
  return data;
};

/**
 * Add custom colours to each dataset in a graph. This methods does some
 * clever stuff (although it might be an overkill) to choose a colour for each
 * dataset. The goals are to 1) always (if possible) set a different colour to
 * each dataset within a same graph, 2) have a colour unrelated to the dataset
 * index within the graph (otherwise all graph having only one dataset would
 * have the same colour), 3) use a deterministic way of assigning colours so
 * the colour is always the same for a given dataset (less confusing for the
 * end-user) and 4) not depend on the charts order
 */
var formatColor = function(data) {
  // define our custom colours
  var chartColours = ['#FF6666', '#6699FF', '#669966', '#FF9966', '#CCCC99',
    '#9966CC', '#CC6666', '#99CCFF'];
  var availableChartColours = clone(chartColours);
  var colourIndex;

  // loop over all datasets
  each(data, function(lineData, i) {
    // hash the key of the dataset and get the modulo to choose a colour
    colourIndex = reduce(lineData.key, function(sum, char) {
      return sum + char.charCodeAt(0);
    }, 0) % availableChartColours.length;

    // set the colour
    lineData.color = availableChartColours[colourIndex];

    // remove the colour just set from availableChartColours so it's not
    // reused withing the same graph. If it was the last colour available,
    // reset availableChartColours (in that case, colour will occure multiple
    // time in the same graph).
    if(availableChartColours.length > 1) {
      availableChartColours.splice(colourIndex, 1);
    } else {
      availableChartColours = clone(chartColours);
    }
  });
  return data;
};

/**
 * Add custom colours to each dataset in a graph. Colours are shades of blue
 * for the first 5 datasets, then shades of grey. Useful when all dataset for
 * a graph are related.
 */
var formatShadedColor = function(data) {
  var choosenColour, colourR, colourG, colourB;

  // loop over all datasets
  each(data, function(lineData, i) {
    if(i < 5 ) {
      // first 5 colours are shades of blue (from dark to light)
      colourR = 71 + (255 - 71) / 5 * i;
      colourG = 107 + (255 - 107) / 5 * i;
      colourB = 190 + (255 - 190) / 5 * i;
    } else {
      // remaining colours are shades of grey (from light to dark)
      colourR = colourG = colourB = 255 - 255 / data.length * i;
    }
    lineData.color = "#" +
      parseInt(colourR).toString(16) +
      parseInt(colourG).toString(16) +
      parseInt(colourB).toString(16);
  });
  return data;
};

export default chartApp;
