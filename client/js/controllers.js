angular.module('proximate.controllers', [])

.controller('AppCtrl', function($q, $rootScope, $http,
  $scope, $state, $window, auth, Populate, PubNub, store) {

  // Initialize scope variables
  $scope.currentEvent = {};
  $scope.currentEventParticipants = {};
  $scope.auth = auth;

  // Listen for checkin confirmations
  PubNub.subscribe('checkins', function(message) {
    if (message.eventType === 'checkinConfirm') {
      // Find the correct participant in participantData and update their status
      $scope.$apply($scope.currentEventParticipants.some(function(participant) {
        if (participant.id === message.participantId) {
          participant._pivot_status = message.checkinStatus;
          $scope.$broadcast('checkinConfirm', participant);
          return true;
        }
      }));
    }
  });

  /**** SETUP FOR RIGHT (ADMIN) MENU HANDLERS AND LISTENERS ****/

  // Detects clicks on the page outside the menu, and determines if the right menu is open
  // If it is, we close it.
  $('body').click(function(e) {
    if (!$(e.target).hasClass('admin-name') &&
        !$(e.target).hasClass('item') &&
        !$(e.target).hasClass('participantName')) {
      closeMenus();
    }
  });

  // Utility function for opening right menu
  function openRightMenu() {
    $('.rightMenu .subMenu').addClass('show');
  }

  // Fires on right menu clicks to handle opening and closing of right menu
  $scope.rightMenuClick = function(e) {
    if (!$('.rightMenu .subMenu').hasClass('show')) {
      openRightMenu();
    } else {
      closeMenus();
    }
  };

  $scope.logout = function() {
    auth.signout();
    store.remove('profile');
    store.remove('token');
    store.remove('adminId');
    $state.go('login');
  };

  /**** SETUP FOR PARTICIPANT STATUS MENU HANDLERS AND LISTENERS ****/

  // Utility function for opening status menu
  var openStatusMenu = function(event, id) {
    closeMenus(event, id);
    $('#' + id + ' > div').addClass('show');
    $(event.target).addClass('selected');
  };

  var closeMenus = function() {
    $('.participantName').removeClass('selected');
    $('.subMenu').removeClass('show');
  };

  // Fires on names menu click to handle opening and closing of sub menu
  $scope.statusMenuClick = function(event, id) {
    if (!$('#' + id + ' > div').hasClass('show')) {
      openStatusMenu(event, id);
    } else {
      closeMenus();
    }
  };

  $scope.updateParticipantStatus = function(participantId, eventId, status) {
    Populate.updateParticipantStatus(participantId,
      eventId, status)
      .then(function() {
        closeMenus();
        $scope.setScopeVars(eventId);
      });

  };

  // Fetch the participant and event data from the server
  $scope.getCurrentEventData = function() {
    Populate.getCurrentEvent($scope.adminId).then(function(eventData) {
      if (eventData !== 'No current event found') {
        $scope.setCurrentEvent(eventData);
        return Populate.getEventWithParticipants($scope.currentEvent.id);
      }
    }).then(function(eventData) {
      if (eventData) {
        $scope.setCurrentEventParticipants(eventData.participants);
        $scope.$broadcast('current-event-updated');
      }
    }).catch(function(err) {
      console.log('Error getting current event', err);
    });
  };

  // Setter for currentEvent
  $scope.setCurrentEvent = function(currentEvent) {
    $scope.currentEvent = currentEvent;
  };

  // Setter for currentEventParticipants
  $scope.setCurrentEventParticipants = function(currentEventParticipants) {
    $scope.currentEventParticipants = currentEventParticipants;
  };

  // Set the username and fetch current event data
  $scope.getAdminAndEventInfo = function() {
    $scope.username = auth.profile.name;
    $scope.email = auth.profile.email;
    $scope.adminId = store.get('adminId');
    $scope.getCurrentEventData();
  };

  // Gets participant and event data for a given eventId
  $scope.getParticipants = function(eventId) {
    if (eventId === 'current') {
      var deferred = $q.defer();

      deferred.resolve({
        event: $scope.currentEvent,
        participants: $scope.currentEventParticipants
      });

      return deferred.promise;
    }

    return Populate.getEventWithParticipants(eventId)
      .then(function(eventData) {
        return {
          event: eventData,
          participants: eventData.participants
        };
      });
  };

  // Sets event and participant scope variables for a given eventId
  $scope.setScopeVars = function(eventId) {
    $scope.getParticipants(eventId)
      .then(function(result) {
        $scope.event = result.event;
        $scope.participants = result.participants;
      })
      .catch(function(error) {
        console.log('Error retrieving event data');
      });
  };

  $scope.syncCalendar = function() {
    var accessToken = auth.profile.identities[0].access_token;
    Populate.syncCalendar(accessToken, auth.profile.email, store.get('adminId'));
  };

  // Get admin and event info on user login
  $rootScope.$on('auth-login-success', function() {
    $scope.syncCalendar();
    $scope.getAdminAndEventInfo();
    if ($rootScope.next) {
      $state.go($rootScope.next.name, $rootScope.next.params);
    } else {
      $state.go('admin.events');
    }
  });

  // Get admin and event info on user login
  $rootScope.$on('calendar-sync', function() {
    $scope.getAdminAndEventInfo();
  });

})

.controller('LoginCtrl', function($scope, $rootScope, $state, $http, auth, store) {

  $scope.login = function() {
    auth.signin({authParams: {
        access_type: 'offline'
    }}, function(profile, token) {
      // Sucess handler post Auth0 authentication
      store.set('profile', profile);
      store.set('token', token);
      $state.go('loading');
      $http({
        method: 'POST',
        url: 'api/token',
        data: {
          // We only support G+ so there is only one identity
          accessToken: auth.profile.identities[0].access_token,
          email: auth.profile.email,
          name: auth.profile.name,
          refreshToken: null
        },
      }).then(function(res) {
        // Access token successfully stored
        if (res.status === 200) {
          store.set('adminId', res.data.adminId);
          $rootScope.$broadcast('auth-login-success');
          // There was some problem storing the code
        } else {
          console.log('An authentication error occured');
        }
      })
      .catch(function(error) {
        console.log('An authentication error occured', error);
      });
    }, function(error) {
      // Error logging in with Auth0
      console.log('Error logging in', error);
    });
  };

  $scope.login();

})

.controller('AdminCtrl', function($scope) {

  // Sets CSS classes for editable participant statuses
  $scope.setClassForStatus = function(status) {
    if (status === null || status === 'null' || status === 'none') {
      return 'none';
    }
    return status;
  };
})

.controller('EventsCtrl', function($scope, $rootScope, $state, Populate, auth, $http) {

  $scope.displayFilterTime = 'all';
  $scope.displayFilterStatus = 'confirmed';
  $scope.eventsExist = null;

  // Calculate and set # of checked-in users for current event
  var setCheckinCount = function() {
    var eventParticipants = $scope.currentEventParticipants;
    var checkedInUserCount = 0;

    for (var i = 0; i < eventParticipants.length; i++) {
      var status = eventParticipants[i]._pivot_status;
      if (status !== null && status !== 'none') {
        checkedInUserCount++;
      }
    }

    $scope.checkedInUserCount = checkedInUserCount;
    $scope.totalUserCount = eventParticipants.length;

  };

  $scope.setDisplayFilterTime = function(time) {
    $scope.displayFilterTime = time;
    $scope.displayFilterStatus = 'confirmed';
  };

  $scope.setDisplayFilterStatus = function(status) {
    $scope.displayFilterTime = 'all';
    $scope.displayFilterStatus = status;
  };

  // Click handler for getting roster for a single event
  $scope.getEventRoster = function(event, eventId) {
    event.preventDefault();
    $state.go('admin.roster', {eventId: eventId});
  };

  // Fetch events data for given adminId
  Populate.getEventsByAdminId($scope.adminId).then(function(eventsData) {
    // Make sure we have some events to display
    if (eventsData.length !== 0) {
      $scope.events = eventsData;
      // Make sure at least one is not cancelled
      var activeEvents = eventsData.filter(function(event) {
        return event.status !== 'cancelled';
      });
      if (activeEvents.length !== 0) {
        // We have at least one event
        $scope.eventsExist = true;
        return;
      }
    }
    // No events, hide data table
    $scope.eventsExist = false;
  });

  // Define checkin count on the scope so we can display
  setCheckinCount($scope.currentEventParticipants);
  $scope.$on('current-event-updated', setCheckinCount);

  // Apply selected logic to time selectors
  $('.tableControls .timeSelect li').on('click', function() {
    $(this).addClass('selected');
    $(this).siblings().removeClass('selected');
  });

})

.controller('ParticipantCtrl', function($scope, $stateParams, Participant, Populate) {

  // Init values for scope, setting params for status values
  $scope.participantInfo = {};
  $scope.eventHistory = {};
  $scope.stats = [
    {name: 'ontime', label:'On Time', id: 'history-stats-ontime', value: 0},
    {name: 'late', label:'Late', id: 'history-stats-late', value: 0},
    {name: 'excused', label:'Excused', id: 'history-stats-excused', value: 0},
    {name: 'absent', label:'Absent', id: 'history-stats-absent', value: 0},
  ];
  $scope.maxValue = 0;

  $scope.updateParticipantStatus = function(participant) {
    Populate.updateParticipantStatus(participant.participant_id,
      participant.event_id, participant.status)
      .then(function() {
        clearChart();
        computeStats();
        drawChart();
      });
  };

  // Populates $scope.stats for use in table and chart
  var computeStats = function() {
    $scope.eventHistory.forEach(function(event) {
      $scope.stats.forEach(function(item) {
        if (item.name === event.status) {
          item.value++;
          if (item.value > $scope.maxValue) {
            $scope.maxValue = item.value;
          }
        }
      });
    });
  };

  var clearChart = function() {
    $scope.maxValue = 0;
    $('.statsRow').css('display', 'none');
    $('.history-stats').empty();
    $('.history-stats').css('opacity', 0, 'width', 0);
    $scope.stats.forEach(function(stat) {
      stat.value = 0;
    });
  };

  var drawChart = function() {

    var animationTime = 1000;
    var maxValue = $scope.maxValue;

    $scope.stats.forEach(function(stat) {
      var nameForClass = stat.name;
      var tableWidth = $('.chartWrapper').width();
      var widthScale = ((tableWidth - 100) / maxValue);

      if (stat.value !== 0) {
        $('.history-stats-' + nameForClass).css('display', 'table-row');
        $('.history-stats-' + nameForClass + ' td:nth-child(2) div')
          .css('opacity', 0.7)
          .animate({width: stat.value * widthScale + 'px'}, animationTime, 'swing',
            // Animate stats values on completion
            function() {
              $(this).append(stat.value);
            });
      }
    });

  };

  Participant.getParticipantInfoFromId($stateParams.participantId).then(function(res) {
    $scope.participantInfo = res.data;
  }).then(function() {
    return Participant.getHistoryByParticipantId($stateParams.participantId);
  }).then(function(res) {
    $scope.eventHistory = res.data.filter(function(item) {
      return (item.event.hasOwnProperty('name') &&
        moment(item.event.start_time).diff(moment()) < 0) &&
        (item.event.admin_id === $scope.adminId);
    });
    //Then call functions with fetched info
    clearChart();
    computeStats();
    drawChart();
  });

})

.controller('BeaconsCtrl', function($scope, Beacon) {

  $scope.beaconsData = [];
  $scope.beaconsExist = null;
  $scope.newBeacon = {};

  // get beacons for given adminID
  $scope.getBeacons = function() {
    Beacon.getBeaconsByAdminId($scope.adminId).then(function(beaconData) {
      if (beaconData) {
        if (beaconData.length > 0) {
          $scope.beaconsExist = true;
          $scope.beaconsData = beaconData;
        } else {
          $scope.beaconsExist = false;
        }
      }
    });
  };

  $scope.getBeacons();

  $scope.submitBeacon = function(beacon, valid) {
    $scope.submitted = true;
    if (valid) {
      $scope.saveBeacon(beacon);
      $scope.newBeacon = {};
      $scope.submitted = false;
    }
  };

  // validation functions for inline edits
  $scope.checkIdentifier = function(data) {
    if (!data) {
      return 'Identifier';
    }
  };

  // check uuid
  $scope.checkUuid = function(data) {
    console.log('uuid', data);
    if (!data) {
      return 'Invalid uuid';
    }
    var regex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'i');
    if (!regex.test(data)) {
      return 'Format: 11111111-2222-3333-4444-555555555555';
    }
    if (data.length !== 36) {
      return 'Format: 11111111-2222-3333-4444-555555555555';
    }
  };

  $scope.saveBeacon = function(beacon, id) {
    console.log('beacons data', $scope.beaconsData);
    angular.extend(beacon, {id: id, adminId: $scope.adminId});
    Beacon.postNewBeacon(beacon)
      .then(function(beacon) {
        $scope.hideAddBeacon();
        $scope.beaconsExist = true;
        $scope.getBeacons();
      });
  };

  $scope.deleteBeacon = function(id) {
    if (confirm('Are you sure you want to delete this beacon?')) {
      console.log('id', id);
      Beacon.deleteBeacon(id)
        .then(function() {
          $scope.getBeacons();
        });
    }
  };

  $scope.showAddBeacon = function() {
    $('.addBeacon').show();
    $('.addBeacon-toggle').hide();
  };

  $scope.hideAddBeacon = function() {
    $('.addBeacon').hide();
    $('.addBeacon-toggle').show();
  };

})

.controller('RosterCtrl', function($scope, $stateParams, Populate) {

  var eventId = $stateParams.eventId;

  $scope.setScopeVars(eventId);

  if (eventId === 'current') {
    $scope.$on('current-event-updated', function() {
      $scope.setScopeVars(eventId);
    });
  }

  $scope.updateParticipantStatus = function(participant) {
    Populate.updateParticipantStatus(participant.id,
      participant._pivot_event_id, participant._pivot_status);
  };

})

.controller('ProjectorCtrl', function($scope, $stateParams, $interval) {

  var eventId = $stateParams.eventId;

  $scope.setScopeVars(eventId);

  if (eventId === 'current') {
    $scope.$on('current-event-updated', function() {
      $scope.setScopeVars(eventId);
    });
  }

  $scope.$on('checkinConfirm', function(event, participant) {
    $scope.lastCheckin = participant;
    $scope.showToast();
  });

  /**** SETUP FOR TOASTS ****/

  $scope.showToast = function() {
    $('.toast').animate({
      opacity: [1, 'linear'],
      top: [0, 'swing']
    }, 450);

    setTimeout($scope.hideToast, 2000);
  };

  $scope.hideToast = function() {
    $('.toast').animate({
      opacity: [0, 'linear'],
      top: ['-100px', 'swing']
    }, 450);
  };

  var setCountdown = function(startTime) {
    var a = moment(startTime);
    var b = moment();
    $scope.countdown = moment.duration(a - b).format('mm:ss');
  };

  $scope.timeDiffFromEvent = null;
  $interval(function() {
    setCountdown($scope.event.start_time);
    var timeDiff = moment($scope.event.start_time).diff(moment(), 'seconds');
    if (timeDiff > 0 && timeDiff >= 3600) {
      // More than an hour in the future
      $scope.timeDiffFromEvent = null;
    } else if (timeDiff > 0 && timeDiff < 3600) {
      // Less than an hour in the future
      $scope.timeDiffFromEvent = true;

    } else {
      // In the past
      $scope.timeDiffFromEvent = false;
    }
  }, 1000);

});
