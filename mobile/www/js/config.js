// Usage: Copy this file to config.js and replace each value below.

angular.module('proximate')

.constant('pubNubKeys', {
  sub: 'sub-c-55cc2d3c-8617-11e4-a77a-02ee2ddab7fe',
  pub: 'pub-c-e3770297-47d1-4fe9-9c34-cfee91f9fa9c',
  ssl: true
})

.constant('webServer', {
	// url: 'http://www.proximate.io'
  url: 'http://localhost:8080'
});
