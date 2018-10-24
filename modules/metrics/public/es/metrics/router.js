/* global $ */

import Backbone from 'backbone';
import moment from 'moment';
import dateRangePicker from './lib/date_range_picker';
import metricsApp from './metrics_app';
import lag from './helpers/lag';

var Router = Backbone.Router.extend({
  urlDateFormat: 'YYYY-MM-DD',
  defaultStartDate: moment.utc().subtract(30, 'days').startOf('day'),
  defaultEndDate: moment.utc().subtract(1, 'day').startOf('day'),

  routes: {
    'v2/*basePath(/:startDate/:endDate)(/)': 'v2updateRoute',
    '*basePath(/:startDate/:endDate)(/)': 'updateRoute',
  },

  v2updateRoute: function(basePath, startDate, endDate) {
    this.version2 = true;
    return this.updateRoute(basePath, startDate, endDate);
  },

  /**
   * action on state change
   *
   * @param basePath: String
   * @param startdate: String
   * @param endDate: String
   */
  updateRoute: function(basePath, startDate, endDate) {
    this.basePath = basePath; // `admin` or `team/:id`

    startDate = moment.utc(startDate, this.urlDateFormat);
    if(!startDate.isValid()) {
      startDate = this.defaultStartDate;
    }

    endDate = moment.utc(endDate, this.urlDateFormat);
    if(!endDate.isValid()) {
      endDate = this.defaultEndDate;
    }

    this.updateRange(startDate, endDate);

    Backbone.trigger('metrics:refresh');
  },

  /**
   * change the range
   *
   * @param startDate: Moment
   * @param endDate: Moment
   */
  updateRange: function(startDate, endDate) {
    this.startDate = startDate;
    this.endDate = endDate;

    if(this.dateRangePicker) {
      this.dateRangePicker.setStartDate(this.startDate);
      this.dateRangePicker.setEndDate(this.endDate);
    } else {
      this.initDateRangePicker();
    }

    this.setLagForRange();
  },

  /**
   * automatically set the best lag for the current range
   */
  setLagForRange: function() {
    var daysDiff = this.endDate.diff(this.startDate, 'days');
    var wantedLag = 'weekly';
    if(daysDiff < 50) {
      wantedLag = 'daily';
    } else if(daysDiff > 100) {
      wantedLag = 'monthly';
    }

    if(wantedLag !== lag.selected) {
      lag.selected = wantedLag;
      Backbone.trigger('lag:refresh')
    }
  },

  initDateRangePicker: function() {
    var _this = this;

    this.dateRangePicker = dateRangePicker.init(
      $('#metrics-dates'),
      this.startDate,
      this.endDate,
      function(startDate, endDate) {
        _this.setDateRange(startDate.startOf('day'), endDate.startOf('day'));
      }
    );
  },

  setDateRange: function(startDate, endDate) {
    var path = this.buildPath(startDate, endDate);
    this.navigate(path, { trigger: true });
  },

  buildPath: function(startDate, endDate) {
    var isDefault = startDate.isSame(this.defaultStartDate) &&
      endDate.isSame(this.defaultEndDate);

    var path = this.basePath;

    if(this.version2) {
      path = '/v2/' + path;
    }

    if(!isDefault) {
      path += '/' + startDate.format(this.urlDateFormat);
      path += '/' + endDate.format(this.urlDateFormat);
    }

    if(window.location.pathname.slice(-1) == '/') {
      // only add a trailing slash if there's already one
      path += '/';
    }

    return path;
  }
});

export default Router;
