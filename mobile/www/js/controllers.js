angular.module('proximate.controllers', [])

.controller('AppCtrl', function($ionicPlatform, $localStorage,
  $scope, $state, $q, $rootScope, Settings, auth, Events, PubNub, Beacons) {

  // Initialize current event
  $scope.event = {
    id: null
  };

  // Attach auth to the scope so we can access store authentication profile
  $scope.auth = auth;

  // Default class value for background
  $scope.class = 'nothing-scheduled';

  // Gets the most current event for the user, and updates the
  // relevant checkin status, protecting for empty responses.
  $scope.initWithEvent = function() {
    Events.getMostCurrentEvent()
      .then(function(res) {
        // Exit without an error if we have no event
        if (res.data === "No current event found") {
          // No current event, exit
          console.log('No current event available');
          $scope.event.id = null;
          $scope.class = $scope.class = 'nothing-scheduled';
        } else {
          // Current event found
          console.log('Got current event: ', res.data.id, ', ', res.data.name );
          console.log('event location', $scope.event.location);
          $scope.event = res.data;
          $scope.setPrettyStartTime();
          return Events.getEventCheckinStatus($scope.event.id)
        }
      })
      .then(function(res) {
        // There's no current event, exit
        if (res === undefined) {
          return;
        }
        // Update the current event status
        if ($scope.class === null) {
          return $scope.class = 'no-data';
        }
        $scope.event.status = res.data.status;
        $scope.class = res.data.status;
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
        deviceId: Settings.data.deviceId,
        userId: Settings.data.userId,
        username: Settings.data.username,
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

      if (message.deviceId === Settings.data.deviceId &&
          message.eventType === 'checkinConfirm' &&
          message.eventId == $scope.event.id) {
        console.log('Setting status: ' + message.checkinStatus);
        //apply scope in callback so as to not lose reference
        $scope.$apply(function() {
          $scope.event.status = message.checkinStatus;
        });
      }
    });
  };

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
  }

  $ionicPlatform.ready(function() {
    console.log('initialized', $localStorage.get('initialized'));
    if ($localStorage.get('initialized') !== 'true') {
      Settings.updateDeviceId();
      $state.go('login');
    } else {
      loadCycle();
    }
  });

  $ionicPlatform.on('resume', loadCycle);

  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
    if (fromState.name === 'splash') {
      loadCycle();
    }
  });

  // Need to trigger the login sequence after the user authenticates
  // In addition to on refresh
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

  // Sets the initial state of the Events Filter
  $scope.eventsFilterSetting = 'upcoming';

  $scope.getUpcomingEvents = function() {
    Events.getUpcomingEvents()
      .then(function(events) {
        $scope.data.events = events;
      }).finally(function() {
        // Re-scrolls the mobile screen on
        // pull-to-refresh
        $scope.$broadcast('scroll.refreshComplete');
      });
  };

  // Pull-to-refresh functionality
  $scope.doRefresh = function() {
    $scope.getUpcomingEvents();
  };

  $scope.$on('$stateChangeSuccess', function() {
    $scope.getUpcomingEvents();
  });
})

// // Controls the splash screen for user signin/signup on mobile
// .controller('SplashCtrl', function($scope, $state, Settings) {

//   // Initialize data objects
//   $scope.data = {
//     username: '',
//     password: '',
//     passwordConfirm: '', // For signup
//     deviceId: ''
//   };

//   $scope.error = '';

//   Settings.updateDeviceId();

//   // Calls the factory signin function, and takes the user to the Status view upon success,
//   // or displays an error otherwise

//   $scope.register = function() {
//     Settings.signin($scope.data)
//       .then(function(res) {
//         $scope.error = '';
//         $state.go('tab.status');
//       })
//       .catch(function(err) {
//         $scope.logSplashError(err);
//       });
//   };

//   $scope.signup = function() {
//     Settings.signup($scope.data)
//       .then(function(res) {
//         $scope.error = '';
//         $state.go('tab.status');
//       })
//       .catch(function(err) {
//         $scope.logSplashError(err);
//       });
//   };

//   /***********************************************************
//   ** Scope error functions                                  **
//   ***********************************************************/

//   // Sets an error on invalid email; clears if ok
//   $scope.invalidEmail = function() {
//     var emailEl = angular.element(document.querySelector('#email'));

//     if (emailEl.hasClass('ng-invalid-email')) {
//       $scope.error = 'Invalid email';
//     } else {
//       $scope.error = '';
//     }

//   };

//   // Sets an error on invalid password; clears if ok. Currently only
//   // detects passwords that are too short, as defined in their minlength param.
//   // See view html for details
//   $scope.invalidPassword = function() {
//     var passwordEl = angular.element(document.querySelector('#password'));

//     if (passwordEl.hasClass('ng-invalid-minlength')) {
//       $scope.error = 'Password too short';
//     } else {
//       $scope.error = '';
//     }

//   };

//   // Sets an error on non-matching passwords; clears if matching
//   $scope.passwordMatch = function() {
//     if ($scope.data.password !== $scope.data.passwordConfirm) {
//       $scope.error = 'Passwords don\'t match';
//     } else {
//       $scope.error = '';
//     }
//   };

//   $scope.logSplashError = function(err) {
//     if (err.status === 404) {
//       $scope.error = 'We couldn\'t find you in the system. Please contact your administrator.';
//     } else if (err.status === 0) {
//       $scope.error = 'Could not contact Proximate server. Please try again later.';
//     } else {
//       $scope.error = 'Unknown error: ' + JSON.stringify(err);
//     }
//   };

// })

.controller('LoginCtrl', function LoginCtrl (store, ProximateAuth, $state, $scope, $location, auth) {
  $scope.login = function() {
    ProximateAuth.login();
  }

  $scope.login();

})

.controller('SettingsCtrl', function($scope, Settings, ProximateAuth, Beacons) {

  angular.element(document).ready(function() {

    $scope.data = {};
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

  $scope.logout = function() {
    ProximateAuth.logout();
  };
});
