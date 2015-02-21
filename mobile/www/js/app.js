angular.module('proximate', ['ionic',
  'proximate.controllers',
  'proximate.services'])

.run(function($ionicPlatform) {

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

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider

    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'views/tabs.html'
    })

    .state('tab.status', {
      url: '/status',
      views: {
        'status': {
          templateUrl: 'views/status.html',
          controller: 'StatusCtrl'
        }
      }
    })

    .state('tab.manualCheckin', {
      url:'/manualCheckin',
      views: {
        'manualCheckin': {
          templateUrl: 'views/manual_checkin.html',
          controller: 'StatusCtrl'
        }
      }
    })

    .state('tab.upcoming', {
      url: '/upcoming',
      views: {
        'upcoming': {
          templateUrl: 'views/upcoming.html',
          controller: 'UpcomingCtrl'
        }
      }
    })

    .state('tab.settings', {
      url: '/settings',
      views: {
        'settings': {
          templateUrl: 'views/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })

    .state('splash', {
      url: '/splash',
      templateUrl: 'views/splash.html',
      controller: 'SplashCtrl'
    })

    .state('signup', {
      url: '/signup',
      templateUrl: 'views/signup.html',
      controller: 'SplashCtrl'
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/status');

})

// Filters events for upcoming, or otherwise just returns all events
.filter('eventsFilter', function(){

  var now = new moment();

  return function(input, eventsFilterSetting) {
    if (eventsFilterSetting === 'upcoming') {
      return input.filter(function(event) {
        return moment(event.start_time).isAfter(now);
      });
    } else {
      return input;
    }
  }
});
