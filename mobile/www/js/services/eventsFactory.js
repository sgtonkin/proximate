angular.module('proximate.services')

.factory('Events', function($http, webServer, Settings) {
  var getMostCurrentEvent = function() {
    return $http({
      method: 'GET',
      url: webServer.url + '/api/participants/' +
        Settings.data.userId + '/events/current'
    }).then(function(res) {
      return res;
    });
  };

  var getEventCheckinStatus = function(eventId) {
    return $http({
      method: 'GET',
      url: webServer.url + '/api/devices/' + Settings.data.deviceId +
        '/events/' + eventId + '/status'
    }).then(function(res) {
      return res;
    });
  };

  // 02/26/2015: Switched this function to use the /history route; was previously
  //             using /event
  var getUpcomingEvents = function() {
    return $http({
      method: 'GET',
      url: webServer.url + '/api/participants/' +
        Settings.data.userId + '/history'
    }).then(function(res) {
      console.log(res.data);
      return res.data;
    });
  };

  return {
    getMostCurrentEvent: getMostCurrentEvent,
    getEventCheckinStatus: getEventCheckinStatus,
    getUpcomingEvents: getUpcomingEvents
  };
});
