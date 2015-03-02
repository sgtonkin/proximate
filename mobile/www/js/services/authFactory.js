angular.module('proximate.services')

.factory('Auth', function($localStorage, $state, $http, webServer, Beacons) {

  // Stem function - for now just destroys the 'registered' state
  var logout = function() {
    // This should also set the 'initialized' value to false,
    //      returning to the 'logged out' user state
    $localStorage.clearStorage();
    Beacons.clearBeacons();
    $state.go('splash');
  };

  return {
    logout: logout
  };
});
