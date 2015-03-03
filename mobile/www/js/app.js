angular.module('proximate', ['ionic',
  'proximate.controllers',
  'proximate.services',
  'auth0',
  'angular-storage',
  'angular-jwt'])

.run(function($ionicPlatform, ProximateAuth, $state, $rootScope, store, jwtHelper, auth) {

  // This hooks all auth events to check everything as soon as the app starts
  auth.hookEvents();

  // Event handler to check for login credentials, otherwise redirect to login
  $rootScope.$on('$locationChangeStart', function() {
    if (!auth.isAuthenticated) {
      var token = store.get('token');
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          auth.authenticate(store.get('profile'), token);
          $state.go('tab.status');
        } else {
          // Either show Login page or use the refresh token to get a new idToken
          $state.go('login');
          ProximateAuth.login();
        }
      } else {
        $state.go('login');
        ProximateAuth.login();
      }
    }
  });

  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });

})

.config(function($stateProvider, $urlRouterProvider, $httpProvider, authProvider,
  jwtInterceptorProvider) {

  $stateProvider

    .state('login', {
      url: '/login',
      templateUrl: 'views/login.html',
      controller: 'LoginCtrl'
    })

    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'views/tabs.html',
      data: {
        requiresLogin: true
      }
    })

    .state('tab.status', {
      url: '/status',
      views: {
        'status': {
          templateUrl: 'views/status.html',
          controller: 'StatusCtrl'
        }
      },
      data: {
        requiresLogin: true
      }
    })

    .state('tab.manual', {
      url:'/manual',
      views: {
        'status': {
          templateUrl: 'views/manual.html',
          controller: 'StatusCtrl'
        }
      },
      data: {
        requiresLogin: true
      }
    })

    .state('tab.upcoming', {
      url: '/upcoming',
      views: {
        'upcoming': {
          templateUrl: 'views/upcoming.html',
          controller: 'UpcomingCtrl'
        }
      },
      data: {
        requiresLogin: true
      }
    })

    .state('tab.settings', {
      url: '/settings',
      views: {
        'settings': {
          templateUrl: 'views/settings.html',
          controller: 'SettingsCtrl'
        }
      },
      data: {
        requiresLogin: true
      }
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/status');

  // Initialize Auth0
  authProvider.init({
    domain: 'proximateio.auth0.com',
    clientID: 'n1J0tFSCtaZSp6lZYOnrrh4e6zlEdHsq',
    loginState: 'login'
  });

  // Add Auth0 token to all outgoing API requests in order to secure them
  jwtInterceptorProvider.tokenGetter = function(store, jwtHelper, auth) {
    var idToken = store.get('token');
    var refreshToken = store.get('refreshToken');
    // If no token return null
    if (!idToken || !refreshToken) {
      return null;
    }
    // If token is expired, get a new one
    if (jwtHelper.isTokenExpired(idToken)) {
      return auth.refreshIdToken(refreshToken).then(function(idToken) {
        store.set('token', idToken);
        return idToken;
      });
    } else {
      return idToken;
    }
  };
  $httpProvider.interceptors.push('jwtInterceptor');

})

// Filters events for upcoming, or otherwise just returns all events
.filter('eventsFilter', function() {

  var now = new moment();

  return function(input, eventsFilterSetting) {
    if (eventsFilterSetting === 'upcoming') {
      return input.filter(function(event) {
        return moment(event.start_time).isAfter(now);
      });
    } else {
      return input;
    }
  };
})

// Limits length of entries in event status section
// Edit LENGTH_LIMIT constant to tweak
.filter('limitLength', function() {

  var LENGTH_LIMIT = 22;

  return function(input) {
    if (input) {
      if (input.length > LENGTH_LIMIT) {
        return input.substr(0, LENGTH_LIMIT) + '...';
      } else {
        return input;
      }
    }
  };
})

// Similar to the above, but for the EVENT LOG view only.
// Truncates the end of event strings, not the middle
.filter('limitLogTitle', function() {

  var LENGTH_LIMIT = 25;

  return function(input) {
    if (input.length > LENGTH_LIMIT) {
      return input.substr(0, (LENGTH_LIMIT)) + '...';
    } else {
      return input;
    }
  };
})

// Takes in an array of events and strips the cancelled items
.filter('filterCancelledEvents', function() {

  return function(input) {

    var filtered = [];

    input.forEach(function(item) {
      if (item.status !== 'cancelled') {
        filtered.push(item);
      }
    });

    return filtered;
  };
});
