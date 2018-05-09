/*global Backbone */
var metricsApp = metricsApp || {};

$(function () {
  'use strict';

  metricsApp.LagsView = Backbone.View.extend({
    el: '#lags-container',

    lagsTemplate: Handlebars.templates['metrics.lags'],

    events: {
      'click a.lag-option': 'lagClick',
    },

    initialize:function() {
      this.listenTo(Backbone, 'lag:refresh', this.refresh);
      this.render();
    },

    render: function() {
      this.$el.html(this.lagsTemplate({
        selectedLagName: metricsApp.lag.names[metricsApp.lag.selected],
        lagsMap: metricsApp.lag.mapForTemplate(),
      }));
    },

    /**
     * change the selected lag, render the view and trigger a notification
     */
    lagClick: function(ev) {
      var lag = $(ev.currentTarget).data('lag');
      if(_.includes(metricsApp.lag.keys, lag)) {
        this.switchLag(lag);
      }
      return false;
    },

    switchLag: function(lag) {
      if(lag !== metricsApp.lag.selected) {
        metricsApp.lag.selected = lag;
        Backbone.trigger('metrics:refresh');
      }
      this.render();
    },

    refresh: function() {
      this.render();
    },
  });
});
