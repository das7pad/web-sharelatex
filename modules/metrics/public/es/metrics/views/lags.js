/* global $ */

import lag from '../helpers/lag'
import template from '../templates/metrics.lags.handlebars'
import includes from 'underscore'

export const LagsView = Backbone.View.extend({
  el: '#lags-container',

  lagsTemplate: template,

  events: {
    'click [data-toggle="dropdown"]': 'toggleDropdown',
    'click a.lag-option': 'lagClick',
  },

  initialize:function() {
    this.listenTo(Backbone, 'lag:refresh', this.refresh);
    this.render();
  },

  render: function() {
    this.$el.html(this.lagsTemplate({
      selectedLagName: lag.names[lag.selected],
      lagsMap: lag.mapForTemplate(),
    }));
  },

  toggleDropdown: function(){
    this.$el.find('.dropdown-menu').toggle()
  },

  /**
   * change the selected lag, render the view and trigger a notification
   */
  lagClick: function(ev) {
    var selectedLag = $(ev.currentTarget).data('lag');
    if(includes(lag.keys, selectedLag)) {
      this.switchLag(selectedLag);
    }
    return false;
  },

  switchLag: function(selectedLag) {
    if(selectedLag !== lag.selected) {
      lag.selected = selectedLag;
      Backbone.trigger('metrics:refresh');
    }
    this.render();
  },

  refresh: function() {
    this.render();
  },
});
