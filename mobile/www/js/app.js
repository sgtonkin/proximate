angular.module('proximate', ['ionic',
  'proximate.controllers',
  'proximate.services',
  'auth0',
  'angular-storage',
  'angular-jwt'])

.run(function($ionicPlatform) {

  // This hooks all auth events to check everything as soon as the app starts
  auth.hookEvents();

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

.config(function($stateProvider, $urlRouterProvider, authProvider,
  jwtInterceptorProvider) {

  $stateProvider

    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
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

  authProvider.init({
    domain: 'proximateio.auth0.com',
    clientID: 'n1J0tFSCtaZSp6lZYOnrrh4e6zlEdHsq',
    loginState: 'login'
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/status');

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
    if (input.length > LENGTH_LIMIT) {
      return input.substr(0, (LENGTH_LIMIT / 2)) +
                          '...' + input.substr(-LENGTH_LIMIT / 2);
    } else {
      return input;
    }
  };
});
