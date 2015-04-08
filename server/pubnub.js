var helpers = require('./db/helpers.js');
var pubnub = {
  publish_key: process.env.PUBNUB_PUBLISH_KEY,
  subscribe_key: process.env.PUBNUB_SUBSCRIBE_KEY,
  channel: process.env.PUBNUB_CHANNEL,
  ssl: process.env.PUBNUB_SSL
};
var PubNub = require('pubnub').init(pubnub);

var pubnub = module.exports = {
  subscribe: function(channel, callback) {
    PubNub.subscribe({
      channel: channel,
      callback: callback
    });
  },

  publish: function(channel, message) {
    PubNub.publish({
      channel: channel,
      message: message,
      callback: function(res) {
        console.log('Published message to %s channel:', channel);
        console.dir(message);
      }
    });
  }
};

// Listen for and confirm received checkins
pubnub.subscribe('checkins', function(message) {
  console.log('received message', message);
  if (message.eventType === 'didEnterRegion' ||
    message.eventType === 'manualCheckin') {
    helpers.checkinUser(message.userId, message.eventType)
      .then(function(checkinProps) {
        if (checkinProps) {
          pubnub.publish('checkins', {
            eventType: 'checkinConfirm',
            deviceId: checkinProps.deviceId,
            eventId: checkinProps.eventId,
            checkinTime: checkinProps.checkinTime,
            checkinType: checkinProps.checkinType,
            participantId: checkinProps.participantId,
            checkinStatus: checkinProps.status
          });
        }
      })
      .catch(function(error) {
        console.log(error);
      });
  }
});
