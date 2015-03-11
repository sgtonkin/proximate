angular.module('proximate.services')

.factory('ProximateAuth', function($localStorage, store, Settings,
  auth, $state, $http, $ionicLoading, $rootScope, webServer, Beacons) {

  // Trigger the Auth0 login prompt
  var login = function() {

    auth.signin({
      closable: false,
      icon: 'img/proximate-login-icon.png',
      gravatar: false,
      dict: {
        signin: {
          title: 'PROXIMATE<span id="beta">BETA</span>'
        }
      },
      authParams: {
        scope: 'openid offline_access',
        device: 'Mobile device',
      }
    }, function(profile, token, accessToken, state, refreshToken) {
      // Success callback
      var userInfo = {
        email: profile.email,
        deviceId: Settings.updateDeviceId()
      };
      store.set('profile', profile);
      store.set('token', token);
      store.set('refreshToken', refreshToken);
      // Fetch/set relevant data for this participant email
      initializeUser(userInfo);
    }, function(error) {
      // Error callback
      console.log('Authentication error for' + profile.email, error);
    });

  };

  function initializeUser(info) {
    $ionicLoading.show({
      templateUrl: 'views/loading.html'
    });
    // Signs in, and returns a promise, setting the user's username and ID on success
    return $http({
      method: 'POST',
      url: webServer.url + '/api/signin',
      data: {
        email: info.email,
        deviceId: info.deviceId
      }
    }).then(function(res) {
      // Set local variables to user input on success
      Settings.setUserInfoAndInitialize(info);

      // Set the username and userId from the server
      Settings.setUserNameAndId(res.data);

      // Return data from promise for further processing
      return res.data;

    }).then(function(res) {
      // Redirect to status page
      $rootScope.$broadcast('login-success');
      $state.go('tab.status');
    }).catch(function(error) {
      $ionicLoading.hide();
      $state.go('login');
      console.log('Error');
    });
  }

  // Stem function - for now just destroys the 'registered' state
  var logout = function() {
    auth.signout();
    store.remove('profile');
    store.remove('token');
    $localStorage.clearStorage();
    Beacons.clearBeacons();
    // Refresh the page to trigger auth interceptor from app.js
    $state.go($state.current.name, $state.params, {reload: true});
  };

  return {
    logout: logout,
    login: login
  };
});
