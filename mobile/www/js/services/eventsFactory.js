angular.module('proximate.services')

.factory('Events', function($http, $localStorage, webServer, Settings) {
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
      url: webServer.url + '/api/participants/' + $localStorage.get('userId') +
        '/events/' + eventId + '/status'
    }).then(function(res) {
      console.log('get checkin status', res);
      return res;
    });
  };

  var getUpcomingEvents = function() {
    return $http({
      method: 'GET',
      url: webServer.url + '/api/participants/' +
        Settings.data.userId + '/events'
    }).then(function(res) {
      return res.data;
    });
  };

  return {
    getMostCurrentEvent: getMostCurrentEvent,
    getEventCheckinStatus: getEventCheckinStatus,
    getUpcomingEvents: getUpcomingEvents
  };
});
