angular.module('proximate.services')

.factory('PubNub', function(pubNubKeys) {
  var pubNub = PUBNUB.init({
    publish_key: pubNubKeys.pub,
    subscribe_key: pubNubKeys.sub,
    ssl: pubNubKeys.ssl
  });

  var publish = function(channel, message) {
    var info = {
      channel: channel,
      message: message,
      callback: function(res) {
        console.log('Publish successful ', message);
      }
    };

    pubNub.publish(info);
  };

  var subscribe = function(channel, callback) {
    pubNub.subscribe({
      channel: channel,
      callback: callback
    });
  };

  return {
    publish: publish,
    subscribe: subscribe
  };
});
