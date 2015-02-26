angular.module('proximate', ['ionic',
  'proximate.controllers',
  'proximate.services',
  'auth0',
  'angular-storage',
  'angular-jwt'])

.run(function($ionicPlatform, $rootScope, store, jwtHelper, auth) {

  // This hooks all auth events to check everything as soon as the app starts
  auth.hookEvents();

  // Event handler to check for login credentials, otherwise redirect to login
  $rootScope.$on('$locationChangeStart', function() {
    if (!auth.isAuthenticated) {
      var token = store.get('token');
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          auth.authenticate(store.get('profile'), token);
        } else {
          // Either show Login page or use the refresh token to get a new idToken
          $location.path('/');
        }
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
      controller: 'LoginCtrl',
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

    // .state('splash', {
    //   url: '/splash',
    //   templateUrl: 'views/splash.html',
    //   controller: 'SplashCtrl'
    // })

    // .state('signup', {
    //   url: '/signup',
    //   templateUrl: 'views/signup.html',
    //   controller: 'SplashCtrl'
    // });

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
  }
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

  var LENGTH_LIMIT = 18;

  return function(input) {
    if(input) {
      if (input.length > LENGTH_LIMIT) {
        return input.substr(0, (LENGTH_LIMIT / 2)) +
                            '...' + input.substr(-LENGTH_LIMIT / 2);
      } else {
        return input;
      }
    }
  };
});
