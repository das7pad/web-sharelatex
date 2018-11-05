import * as moment from 'moment'
import $ from 'jquery'
import { bind } from 'underscore'
import 'daterangepicker'

var WLDateRangePicker = function() {
  var dateFormat = 'MMMM D, YYYY'
  var yesterday = moment().subtract(1, 'day')

  // build some custom ranges for easier date picking
  var customRanges = {}
  customRanges['Last 7 days'] = [moment().subtract(7, 'days'), yesterday]
  customRanges['Previous Week'] = [
    moment()
      .subtract(1, 'week')
      .startOf('isoweek'),
    moment()
      .subtract(1, 'week')
      .endOf('isoweek')
  ]
  customRanges['Last 30 days'] = [moment().subtract(30, 'days'), yesterday]
  customRanges[
    moment()
      .subtract(1, 'month')
      .format('MMMM YYYY')
  ] = [
    moment()
      .subtract(1, 'month')
      .startOf('month'),
    moment()
      .subtract(1, 'month')
      .endOf('month')
  ]
  customRanges['Year ' + moment().format('YYYY')] = [
    moment().startOf('year'),
    yesterday
  ]
  customRanges[
    'Year ' +
      moment()
        .subtract(1, 'year')
        .format('YYYY')
  ] = [
    moment()
      .subtract(1, 'year')
      .startOf('year'),
    moment()
      .subtract(1, 'year')
      .endOf('year')
  ]

  // callback called on date change
  this.customCallback = function(startDate, endDate, externalCallback) {
    var displayRange = startDate.format(dateFormat)
    displayRange += ' to '
    displayRange += endDate.format(dateFormat)
    this.$label.text(displayRange)

    if (externalCallback) externalCallback(startDate, endDate)
  }

  this.init = function(elt, startDate, endDate, callback) {
    this.$elt = $(elt)
    this.$label = this.$elt.find('span')

    this.$elt.daterangepicker(
      {
        opens: 'left',
        showDropdowns: true,
        linkedCalendars: false,
        ranges: customRanges,
        parentEl: this.$elt.parent(),
        minDate: moment.unix(parseInt(this.$elt.data('min-date')) || 0),
        maxDate: this.$elt.data('max-date')
          ? moment.unix(this.$elt.data('max-date'))
          : yesterday,
        startDate: startDate,
        endDate: endDate
      },
      bind(function(startDate, endDate) {
        // daterangepicker callback
        this.customCallback(startDate, endDate, callback)
      }, this)
    )
    this.object = this.$elt.data('daterangepicker')

    // call callback on init
    this.customCallback(this.object.startDate, this.object.endDate, callback)

    // HACK: hide the apply buttons when the calendar isn't show, and dont't
    // use the bootstrap classes
    $('.daterangepicker').addClass('dropdown-menu-bare')
    var $applyButtons = $('.daterangepicker .range_inputs')
    $applyButtons.hide()
    $applyButtons.find('button').removeClass('btn-sm btn-success')
    $applyButtons.find('.cancelBtn').addClass('btn')
    $applyButtons.find('.applyBtn').addClass('btn btn-primary')
    this.$elt.on('showCalendar.daterangepicker', function() {
      $applyButtons.show()
    })
    this.$elt.on('hideCalendar.daterangepicker', function() {
      $applyButtons.hide()
    })

    return this.object
  }
}

const dateRangePicker = new WLDateRangePicker()

export default dateRangePicker
