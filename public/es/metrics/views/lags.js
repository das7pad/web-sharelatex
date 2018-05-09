import lag from '../helpers/lag'
import template from '../templates/metrics.lags.handlebars'

export const LagsView = Backbone.View.extend({
  el: '#lags-container',

  lagsTemplate: template,

  events: {
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

  /**
   * change the selected lag, render the view and trigger a notification
   */
  lagClick: function(ev) {
    var lag = $(ev.currentTarget).data('lag');
    if(_.includes(lag.keys, lag)) {
      this.switchLag(lag);
    }
    return false;
  },

  switchLag: function(lag) {
    if(lag !== lag.selected) {
      lag.selected = lag;
      Backbone.trigger('metrics:refresh');
    }
    this.render();
  },

  refresh: function() {
    this.render();
  },
});
