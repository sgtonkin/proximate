angular.module('proximate.controllers', [])

.controller('AppCtrl', function($ionicPlatform, $localStorage,
  $scope, $state, $q, $ionicLoading, $rootScope, Settings, auth, Events, PubNub, Beacons) {

  // Initialize current event
  $scope.event = {
    id: null
  };

  // Attach auth to the scope so we can access store authentication profile
  $scope.auth = auth;

  // Default class value for background
  $scope.class = 'nothing-scheduled';

  // Set the correct class to display after checkin
  $scope.setClass = function(status) {
    if (status === null || status === 'none') {
      $scope.class = 'no-data';
    } else {
      $scope.class = status;
    }
  };

  // Gets the most current event for the user, and updates the
  // relevant checkin status, protecting for empty responses.
  $scope.initWithEvent = function() {
    Events.getMostCurrentEvent()
      .then(function(res) {
        // Exit without an error if we have no event
        if (res.data === 'No current event found') {
          // No current event, exit
          console.log('No current event available');
          $scope.event.id = null;
          $scope.class = $scope.class = 'nothing-scheduled';
        } else {
          // Current event found
          console.log('Got current event:', res.data.id, res.data.name);
          $scope.event = res.data;
          $scope.setPrettyStartTime();
          return Events.getEventCheckinStatus($scope.event.id);
        }
      })
      .then(function(res) {
        // There's no current event, exit
        if (res === undefined) {
          return;
        }
        $scope.event.checkinTime = res.data.checkin_time;
        $scope.event.status = res.data.status;
        $scope.setClass(res.data.status);
      })
      .catch(function(err) {
        console.log('Error fetching current event');
      })
      .finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
  };

  // Triggers a manual checkin event, publishing a message through PubNub
  $scope.manualCheckin = function() {

    var checkinInfo = {
        deviceId: $localStorage.get('deviceId'),
        userId: $localStorage.get('userId'),
        username: $localStorage.get('username'),
        eventId: $scope.event.id,
        eventType: 'manualCheckin'
      };

    PubNub.publish('checkins', checkinInfo);

    $scope.backToStatus();
  };

  // Implements custom 'Back' button for the manual checkin view to return to Status
  $scope.backToStatus = function() {
    $state.go('tab.status', {}, {reload: true, inherit: false, location: 'replace'});
  };

  // Utility function that populates the pretty time field from start time
  $scope.setPrettyStartTime = function() {
    $scope.event.pretty_time = moment($scope.event.start_time).format('h:mm a');
  };

  // Subscribe to the checkins channel on PubNub, checking for events
  // that match a checkin confirmation for the relevant device, then
  // change status to match
  $scope.subscribeToCheckinStatus = function() {
    PubNub.subscribe('checkins', function(message) {
      console.log('Received PubNub message: ', JSON.stringify(message));
      if (message.participantId === $localStorage.get('userId') &&
          message.eventType === 'checkinConfirm' &&
          message.eventId == $scope.event.id) {
        //apply scope in callback so as to not lose reference
        $scope.$apply(function() {
          $scope.event.status = message.checkinStatus;
          $scope.event.checkinTime = message.checkinTime;
          $scope.setClass(message.checkinStatus);
          $rootScope.$broadcast('checkinOccured');
        });
      }
    });
  };

  // Called each time the app is reloaded and after login
  function loadCycle() {
    $scope.initWithEvent();
    $scope.subscribeToCheckinStatus();
    Settings.updateBeaconList()
      .then(function() {
        Beacons.setupBeacons(PubNub.publish);
      })
      .catch(function(error) {
        console.log('Error updating beacons: ' + JSON.stringify(error));
      });
    $ionicLoading.hide();
  }

  // Trigger the load cycle after refresh
  $rootScope.$on('resume', loadCycle);

  // Triggers the login sequence after user authenticatation
  $rootScope.$on('login-success', loadCycle);

})

.controller('StatusCtrl', function($scope) {

  $scope.doRefresh = $scope.initWithEvent;

})

.controller('UpcomingCtrl', function($rootScope, $scope, Events) {

  // Instantiate empty events list
  $scope.data = {
    events: []
  };

  $scope.noEvents = false;

  // Sets the initial state of the Events Filter
  $scope.eventsFilterSetting = 'past';
  $scope.eventsOrder = '-start_time';

  $scope.getUpcomingEvents = function() {
    Events.getUpcomingEvents()
      .then(function(events) {
        $scope.data.events = events.events;
      }).finally(function() {
        // Re-scrolls the mobile screen on
        // pull-to-refresh
        if ($scope.data.events.length === 0) {
          $scope.noEvents = true;
        } else {
          $scope.noEvents = false;
        }
        $scope.noUpcoming = false;
        $scope.$broadcast('scroll.refreshComplete');
      });
  };

  // Pull-to-refresh functionality
  $scope.doRefresh = function() {
    $scope.getUpcomingEvents();
  };

  $scope.getUpcomingEvents();

  // Refresh the event list after a checkin event
  $rootScope.$on('checkinOccured', function() {
    $scope.getUpcomingEvents();
  });
})

.controller('LoginCtrl', function LoginCtrl (store, $rootScope,
  ProximateAuth, $state, $scope, $location, auth) {

  $scope.login = function() {
    ProximateAuth.login();
  };

  $scope.login();

})

.controller('SettingsCtrl', function($scope, Settings, $ionicPlatform, ProximateAuth, Beacons) {

  angular.element(document).ready(function() {

    $scope.data = {};
    // Set the username to the email if they don't have one
    $scope.data.username = Settings.data.username;
    $scope.data.deviceId = Settings.data.deviceId;
    $scope.data.email = Settings.data.email;

  });

  $scope.updatePassword = function() {
    // Stem function
    console.log('updatePassword triggered!');
  };

  $scope.refreshBeacons = function() {
    Beacons.clearBeacons();
    Settings.updateBeaconList()
    .then(function() {
      Beacons.restartBeacons();
    });
  };

  // Function to scan for beacons on settings page
  $scope.scanBeacons = function() {
    // Already scanning, stop
    if ($scope.scanning) {
      $scope.scanning = false;
      Beacons.stopScanning();
    // Start scanning
    } else {
      $ionicPlatform.ready(function() {
        $scope.scanning = true;
        Beacons.scanBeacons(function(beacons) {
          console.log('success got beacons', JSON.stringify(beacons.beacons));
          $scope.beacons = beacons.beacons;
          $scope.$apply();
        }, function(err) {
          console.log('err scanning for beacons', err);
        });
      });
    }
  };

  $scope.logout = function() {
    ProximateAuth.logout();
  };
});
