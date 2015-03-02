angular.module('proximate.services')

.factory('Settings', function($localStorage, $http, webServer) {

  // Container object for settings values, needed for syncing across controllers
  // Exposes the following: data.deviceId, data.username, data.currentBeaconList

  var data = {};

  //initialize with stored values
  data.deviceId = $localStorage.get('deviceId');
  data.currentBeaconList = $localStorage.get('beaconList');
  data.username = $localStorage.get('username');
  data.userId = $localStorage.get('userId');
  data.email = $localStorage.get('email');

  var device;
  // update the deviceID based on current device
  var updateDeviceId = function() {
    if (ionic.Platform.isIOS()) {
      window.IDFVPlugin.getIdentifier(
        // on success, set deviceId in memory and localstorage
        function(result) {
          console.log('Setting deviceId: ' + result);
          data.deviceId = result;
          $localStorage.set('deviceId', data.deviceId);
        // on failure, simlpy output the error to the console
        // this will cause us to use the default test value / whatever is stored in localStorage
        }, function(error) {
          console.log(error);
        });
    } else if (device && ionic.Platform.isAndroid()) {
      // Device previously not defined???
      data.deviceId = device.uuid;
      $localStorage.set('deviceId', data.deviceId);
    } else {
      data.deviceId = 'UNSUPPORTED_PLATFORM';
      $localStorage.set('deviceId', data.deviceId);
    }
  };

  // Gets the most recent beacons from the server, populating local storage
  //on success

  var updateBeaconList = function() {
    return $http({
      method: 'GET',
      url: webServer.url + '/api/devices/' + data.deviceId + '/beacons',
    }).then(function(result) {

      if (result.status === 404) {
        console.log('Error getting beacons');
      } else {
        // Stringified storage
        $localStorage.setObject('beaconList', result.data);
        data.currentBeaconList = $localStorage.get('beaconList');
      }
      console.log('Fetched beacons from server: ', result.data);
      return result;
    }).catch(function(error) {
      logToDom('Error in settings factory: ' + JSON.stringify(error));
      throw new Error();
    });
  };

  //sets username both in localStorage and on the server
  var updateUsername = function(name) {
    $localStorage.set('username', name);

    return $http({
      method: 'POST',
      url: webServer.url + '/api/devices/register',
      data: {
        username: name,
        deviceId: data.deviceId,
      }
    }).then(function(data) {
      console.log(data);
    }).catch(function(err) {
      console.log(err);
    });
  };

  // Gets participant id, name, and deviceId from server
  var updateParticipantInfo = function() {
    return $http({
      method: 'GET',
      url: webServer.url + '/api/participants/devices/' + data.deviceId
    }).then(function(res) {
      var parsed = JSON.parse(res);
      if (parsed.id) {
        data.participantId = parsed.id;
      }
    });
  };

  var signin = function(info) {

    // Signs in, and returns a promise, setting the user's username and ID on success
    return $http({
      method: 'POST',
      url: webServer.url + '/api/signin',
      data: {
        email: info.email,
        password: info.password,
        deviceId: data.deviceId
      }
    }).then(function(res) {

      // Set local variables to user input on success
      setUserInfoAndInitialize(info);

      // Set the username and userId from the server
      setUserNameAndId(res.data);

      // Return data from promise for further processing
      return res.data;
    });
  };

  var signup = function(info) {

    // Signs up, and returns a promise
    return $http({
      method: 'POST',
      url: webServer.url + '/api/signup',
      data: {
        email: info.email,
        password: info.password,
        deviceId: data.deviceId
      }
    }).then(function(res) {
      // Set local variables to user input on success
      setUserInfoAndInitialize(info);

      // Set the username and userId from the server
      setUserNameAndId(res.data);

      // Return data from promise for further processing
      return res.data;
    });
  };

  // Utility function for setting common localStorage attributes on signin/signup
  function setUserInfoAndInitialize(info) {
    $localStorage.set('email', info.email);
    data.email = info.email;
    $localStorage.set('password', info.password);
    data.password = info.password;
    $localStorage.set('initialized', 'true');
  }

  // Similar utility to the above to set username and userId. Stemmed
  // into separate function as a) this can have null values, and b)
  // these are fetched from the server, as opposed to user input
  function setUserNameAndId(responseObj) {
    if (responseObj.name && responseObj.name.length) {
      $localStorage.set('username', responseObj.name);
      data.username = responseObj.name;
    } else {
      $localStorage.set('username', null);
      data.username = null;
    }

    if (responseObj.id) {
      $localStorage.set('userId', responseObj.id);
      data.userId = responseObj.id;
    } else {
      $localStorage.set('userId', null);
      data.userId = null;
    }
  }

  // Utility logging function. Currently set to log to settings screen on app for DEV purposes

  var logToDom = function(message) {
    var e = document.createElement('label');
    e.innerText = message;

    var devMsgElement = document.getElementById('dev-messages');

    var br = document.createElement('br');
    var br2 = document.createElement('br');
    devMsgElement.appendChild(e);
    devMsgElement.appendChild(br);
    devMsgElement.appendChild(br2);
  };

  return {
    data: data,
    updateDeviceId: updateDeviceId,
    updateBeaconList: updateBeaconList,
    updateUsername: updateUsername,
    updateParticipantInfo: updateParticipantInfo,
    signin: signin,
    signup: signup,
    logToDom: logToDom
  };

});
