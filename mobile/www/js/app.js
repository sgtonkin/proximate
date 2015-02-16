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

// Taken from http://regexlib.com/Search.aspx?k=password&c=0&m=0&ps=20&p=2

.directive('validPassword', function() {
  var PASSWORD_REGEX = /(?=^.{6,}$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s)[0-9a-zA-Z!@#$%^&*()]*$/;
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.validPassword = function(modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          return true;
        }

        if (viewValue.length > 6 && PASSWORD_REGEX.test(viewValue)) {
          return true;
        }

        return false;

      };
    }
  };
});

// var INTEGER_REGEXP = /^\-?\d+$/;
// app.directive('integer', function() {
//   return {
//     require: 'ngModel',
//     link: function(scope, elm, attrs, ctrl) {
//       ctrl.$validators.integer = function(modelValue, viewValue) {
//         if (ctrl.$isEmpty(modelValue)) {
//           // consider empty models to be valid
//           return true;
//         }

//         if (INTEGER_REGEXP.test(viewValue)) {
//           // it is valid
//           return true;
//         }

//         // it is invalid
//         return false;
//       };
//     }
//   };
// });
