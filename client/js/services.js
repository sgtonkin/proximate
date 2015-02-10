angular.module('proximate.services', [])

.factory('PubNub', function(pubNubKeys) {
  var pubNub = PUBNUB.init({
    publish_key: pubNubKeys.pub,
    subscribe_key: pubNubKeys.sub
  });

  var subscribe = function(channel, callback) {
    pubNub.subscribe({
      channel: channel,
      callback: callback
    });
  };

  var publish = function(channel, message) {
    var info = {
      channel: channel,
      message: message
    };

    pubNub.publish(info);
  };

  return {
    subscribe: subscribe,
    publish: publish
  };

})

.factory('Participant', function($http, $rootScope) {

  var getParticipantInfoFromId = function(participantId) {
    var url = '/api/participants/' + participantId;
    return $http({
      method: 'GET',
      url: url
    })
    .then(function(res) {
      return res;
    })
    .catch(function(error) {
      console.log('Error getting participant information');
    });
  };

  var getHistoryByParticipantId = function(participantId) {
    var url = '/api/participants/' + participantId + '/history';
    return $http({
      method: 'GET',
      url: url
    })
    .then(function(res) {
      return res;
    })
    .catch(function(error) {
      console.log('Error getting participant history');
    });
  };

  return {
    getParticipantInfoFromId: getParticipantInfoFromId,
    getHistoryByParticipantId: getHistoryByParticipantId
  };
})

.factory('Beacon', function($http) {

  return {
    postNewBeacon: function(beacon) {
      console.log('posting beacon', beacon);
      return $http({
        method: 'POST',
        url: '/api/beacons',
        data: JSON.stringify(beacon),
      }).then(function(res) {
        return res.data;
      }).catch(function(error) {
        console.log('Error adding new beacon');
      });
    },

    deleteBeacon: function(id) {
      return $http({
        method: 'DELETE',
        url: '/api/beacons/'+id,
        data: {id: id},
      }).then(function(res) {
        return res.data;
      }).catch(function(error) {
        console.log('Error deleting beacon');
      });
    },

    getBeaconsByAdminId: function(adminId) {
      var url = '/api/admins/' + adminId + '/beacons';
      return $http({
        method: 'GET',
        url: url
      }).then(function(res) {
        return res.data;
      }).catch(function(error) {
        console.log('Error getting beacons');
      });
    }
  }

})

.factory('Populate', function($http) {
  var adminId;

  return {
    adminId: adminId,

    getAdminId: function(email) {
      var url = '/api/admins/id';
      return $http({
        method: 'GET',
        url: url,
        params: {email: email}
      }).then(function(res) {
        adminId = res.data;
        return adminId;
      }).catch(function(err) {
        console.log('Error getting admin id');
      });
    },

    // get event participants for a given eventID
    getEventWithParticipants: function(eventID) {
      var url = '/api/events/' + eventID + '/participants';
      return $http({
        method: 'GET',
        url: url,
      }).then(function(res) {
        return res.data;
      });
    },

    // get current event ID
    getCurrentEvent: function(adminId) {
      var url = '/api/admins/' + adminId + '/events/current';
      return $http({
        method: 'GET',
        url: url,
      }).then(function(res) {
        return res.data;
      });
    },

    getEventsByAdminId: function(adminId) {
      var url = '/api/admins/' + adminId + '/events';
      return $http({
        method: 'GET',
        url: url,
      }).then(function(res) {
        return res.data;
      }).catch(function(error) {
        console.log('Error getting events');
      });
    },

    updateParticipantStatus: function(participantId, eventId, status) {
      return $http({
        method: 'POST',
        url: '/api/participant/status',
        data: {
          participantId: participantId,
          eventId: eventId,
          status: status
        },
      }).then(function(res) {
        return res.data;
      }).catch(function(error) {
        console.log('Error updating participant status');
      });
    }
  };

})

.filter('fromNow', function() {
  return function(startTime) {
    var a = moment(startTime);
    var b = moment();
    return moment.duration(a - b).format('mm:ss');
  };
})

.filter('filterByStatus', function() {
  return function(events, status) {
    var filteredResults = [];
    events.forEach(function(event) {
      if (event.status !== status) {
        return;
      }
      filteredResults.push(event);
    });
    return filteredResults;
  };
})

.filter('filterByTime', function() {
  return function(events, time) {
    var filteredResults = [];
    var now = moment();
    if (events) {
      events.forEach(function(event) {
        if (time === 'future') {
          if (moment(event.start_time).diff(now) < 0) {
            return;
          }
        } else if (time === 'past') {
          if (moment(event.start_time).diff(now) >= 0) {
            return;
          }
        }
        filteredResults.push(event);
      });
    }
    return filteredResults;
  };
})

.filter('formatLocation', function() {
  return function(location) {
    if (location.length > 27) {
      return location.slice(0, 27) + '...';
    } else {
      return location;
    }
  };
})

.filter('removeArrivedParticipants', function() {
  return function(participants) {
    var filteredResults = [];
    if (Array.isArray(participants)) {
      participants.forEach(function(participant) {
        if (participant._pivot_status) {
          return;
        }
        filteredResults.push(participant);
      });
    }
    return filteredResults;
  };
})

.directive('spinner', function() {
  return {
    restrict: 'C',

    link: function(scope, element) {
      element.hide();

      scope.$on('ajax-loading', function() {
        element.show();
      });

      scope.$on('ajax-success', function() {
        element.hide();
      });
    }
  };
});
