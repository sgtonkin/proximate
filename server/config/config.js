// Usage: Copy this file to config.js and replace each value below.

module.exports = {
  mysqlConnection: {
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'proximate'
  },
  resetDatabaseOnLoad: false,
  pubnub: {
    publish_key:    'pub-c-e3770297-47d1-4fe9-9c34-cfee91f9fa9c',
    subscribe_key:  'sub-c-55cc2d3c-8617-11e4-a77a-02ee2ddab7fe',
    channel:        'checkin',
    user:           'derek'
  },
  google: {
     clientId: '220003566090-2uardbhjrtvag79l2492af0mrdj6c5v9.apps.googleusercontent.com',
     clientSecret: '16Ork-CQNR5EjbFNgIqLuEPF'
  },
   expressSession: {
     secret: 'asdfjaksdjfkasdjf'
  }
};
