angular.module('proximate.services')

.factory('Beacons', function($localStorage, Settings) {

  // Global constant to set beacon ranging.
  // Currently set to false to save battery.
  var USE_RANGING = false;

  // Sets up beacon environment and calls functions to begin monitoring / ranging
  //the beacon list
  var setupBeacons = function(onEnterCallback) {
    setupDelegate(onEnterCallback);

    // request auth from the user
    cordova.plugins.locationManager.requestAlwaysAuthorization();

    startMonitoringRegions(Settings.data.currentBeaconList);
    if (USE_RANGING) {
      startRangingRegions(Settings.data.currentBeaconList);
    }
  };

  // Stops monitoring / ranging for all current beacons
  var clearBeacons = function() {
    try {
      cordova.plugins.locationManager.getMonitoredRegions()
      .then(function(data) {
        console.log('Clearing monitored regions:', data);

        data.forEach(function(region) {
          cordova.plugins.locationManager.stopMonitoringForRegion(region)
            .fail(console.error)
            .done();
        });

        return data;
      })
      .then(function(data) {
        data.forEach(function(region) {
          cordova.plugins.locationManager.stopRangingBeaconsInRegion(region)
            .fail(console.error)
            .done();
        });
      });
    } catch (e) {
      console.log(e);
    }

  };

  var restartBeacons = function() {
    if (Settings.data.currentBeaconList.length > 0) {
      startMonitoringRegions(Settings.data.currentBeaconList);
      if (USE_RANGING) {
        startRangingRegions(Settings.data.currentBeaconList);
      }
    }
  };

  // Begins monitoring for all regions, as specified in the beacon list
  var startMonitoringRegions = function(beaconList) {
    var currentRegions = regionsFromBeacons(beaconList);

    currentRegions.forEach(function(region) {
      cordova.plugins.locationManager.startMonitoringForRegion(region)
        .fail(console.error)
        .done();
    });
  };

  // Begins monitoring for all regions, as specified in the beacon list
  var startRangingRegions = function(beaconList) {
    var currentRegions = regionsFromBeacons(beaconList);

    currentRegions.forEach(function(region) {
      cordova.plugins.locationManager.startRangingBeaconsInRegion(region)
        .fail(console.error)
        .done();
    });
  };

  // Sets event callbacks and attaches them to a 'delegate' object to be called
  //when that event is triggered.
  var setupDelegate = function(onEnterCallback) {
    // Our delegate object, which is a container for event callbacks
    var delegate = new cordova.plugins.locationManager.Delegate();

    // Subsumes the didEnterRegion handler, which
    // will be called when we enter the specified region,
    // including when the app is backgrounded.
    delegate.didDetermineStateForRegion = function(pluginResult) {

      if (pluginResult.state === 'CLRegionStateInside') {
        console.log('Entered the region!');

        var regionInfo = {
          userId: $localStorage.get('userId'),
          deviceId: $localStorage.get('deviceId'),
          username: $localStorage.get('userName'),
          region: pluginResult.region,
          eventType: 'didEnterRegion'
        };

        onEnterCallback('checkins', regionInfo);

      } else if (pluginResult.state === 'CLRegionStateOutside') {
        console.log('Exited the region!');
      }
    };

    delegate.didStartMonitoringForRegion = function(pluginResult) {
      Settings.logToDom('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
    };

    delegate.didRangeBeaconsInRegion = function(pluginResult) {

      var rangingInfo = {
        deviceId: Settings.data.deviceId,
        username: Settings.data.username,
        beacons: pluginResult.beacons,
        eventType: 'didRangeBeaconsInRegion'
      };

      onEnterCallback('ranging', rangingInfo);
    };

    cordova.plugins.locationManager.setDelegate(delegate);
  };

  // Utility function that parses a JSON beacon list, and turns it into
  //region objects that the locationManager plugin can monitor/range

  var regionsFromBeacons = function(beaconListAsJSON) {
    var list = JSON.parse(beaconListAsJSON);
    var regionList = [];

    list.forEach(function(beacon) {
      var region = new cordova.plugins.locationManager.BeaconRegion(
        beacon.identifier,
        beacon.uuid,
        beacon.major,
        beacon.minor);
      regionList.push(region);
    });

    return regionList;
  };

  // Scans for beacons
  // Needs cordova plugin
  // ionic plugin add https://github.com/evothings/phonegap-estimotebeacons
  var scanBeacons = function(callWhenDone, callWhenErr) {
    estimote.beacons.startRangingBeaconsInRegion({}, callWhenDone, callWhenErr);
  };

  var stopScanning = function() {
    estimote.beacons.stopRangingBeaconsInRegion({});
  };

  return {
    setupBeacons: setupBeacons,
    clearBeacons: clearBeacons,
    restartBeacons: restartBeacons,
    scanBeacons: scanBeacons,
    stopScanning: stopScanning
  };
});
