angular.module('proximate',
  ['ui.router',
  'proximate.controllers',
  'proximate.services',
  'angularMoment',
  'xeditable',
  'auth0',
  'angular-storage',
  'angular-jwt',
  ])

.config(function($stateProvider, $urlRouterProvider, $httpProvider,
  authProvider, jwtInterceptorProvider) {
  authProvider.init({
      domain: 'proximateio.auth0.com',
      clientID: 'nJT0VagYnM6qeMyL01V84ociE46s9LOn',
      loginState: 'login'
  });

  $urlRouterProvider.otherwise('/login');

  $stateProvider

    .state('admin', {
      templateUrl: 'views/admin.html',
      url: '/admin',
      data: {requiresLogin: true}
    })

    .state('admin.events', {
      templateUrl: 'views/partials/events.template.html',
      controller: 'EventsCtrl',
      url: '/events',
      data: {requiresLogin: true}
    })

    .state('admin.roster', {
      templateUrl: 'views/partials/roster.template.html',
      controller: 'RosterCtrl',
      url: '/events/:eventId/roster',
      data: {requiresLogin: true}
    })

    .state('admin.beacons', {
      templateUrl: 'views/partials/beacons.template.html',
      controller: 'BeaconsCtrl',
      url: '/beacons',
      data: {requiresLogin: true}
    })

    .state('admin.participant', {
      templateUrl: 'views/partials/participant.template.html',
      controller: 'ParticipantCtrl',
      url: '/participant/:participantId',
      data: {requiresLogin: true}
    })

    .state('projector', {
      templateUrl: 'views/projector.html',
      controller: 'ProjectorCtrl',
      url: '/events/:eventId/projector',
      data: {requiresLogin: true}
    })

    .state('login', {
      templateUrl: 'views/login.html',
      controller: 'LoginCtrl',
      url: '/login'
    });

  // $httpProvider.interceptors.push(function($q, $injector) {
  //   var $http;
  //   var rootScope;

  //   return {
  //     request: function(config) {
  //       rootScope = rootScope || $injector.get('$rootScope');
  //       rootScope.$broadcast('ajax-loading');

  //       return config;
  //     },

  //     response: function(response) {
  //       $http = $http || $injector.get('$http');

  //       if ($http.pendingRequests.length === 0) {
  //         rootScope = rootScope || $injector.get('$rootScope');
  //         rootScope.$broadcast('ajax-success');
  //       }

  //       return response;
  //     },

  //     responseError: function(rejection) {
  //       $http = $http || $injector.get('$http');

  //       if ($http.pendingRequests.length === 0) {
  //         rootScope = rootScope || $injector.get('$rootScope');
  //         rootScope.$broadcast('ajax-success');
  //       }

  //       return $q.reject(rejection);
  //     }
  //   };
  // });

  // Interceptor to add JWT to all secure API requests
  jwtInterceptorProvider.tokenGetter = ['store', function(store) {
    return store.get('token');
  }];
  $httpProvider.interceptors.push('jwtInterceptor');

})

.run(function($rootScope, auth, $state, store, $location, jwtHelper) {

  auth.hookEvents();

  // Event handler to check for login credentials, otherwise redirect to login
  $rootScope.$on('$locationChangeStart', function() {
    if (!auth.isAuthenticated) {
      var token = store.get('token');
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          // Valid token, reload page
          auth.authenticate(store.get('profile'), token);
          $rootScope.$broadcast('auth-login-success');
        } else {
          // Invalid token, send to login
          $state.go('login');
        }
      }
    }
  });
});
