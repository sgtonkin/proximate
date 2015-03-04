var crypto = require('crypto');
var models = require('./models');
var helpers = require('./db/helpers');
var sync = require('./db/sync');
var jwt = require('express-jwt');

var jwtCheck = jwt({
  secret: new Buffer('HX1IIvt93PfF1XF8Y73tpZ8LwIDKEaYKHTe0jWm_E30rQ9dN8cwZEboX-uRkKDlD', 'base64'),
  audience: 'nJT0VagYnM6qeMyL01V84ociE46s9LOn'
});

var jwtCheckMobile = jwt({
  secret: new Buffer('b6uKKdb1m7vgCP73I6kNQaVHrnxxOeghOFdsN9IDIVd1-e-9fYtp_Xb98gmrIFj8', 'base64'),
  audience: 'n1J0tFSCtaZSp6lZYOnrrh4e6zlEdHsq'
});

module.exports = function(app) {

  // Set up authenticated routes
  app.use([
    '/api/token',
    '/api/beacons',
    '/api/participant/status',
    '/api/admins/id',
    '/api/admins/*/beacons'
  ], jwtCheck);

  app.use([
    '/api/devices/*',
    '/api/participants/*/events/current',
    '/api/participants/*/events',
    '/api/participants/*/events/*/status'
  ], jwtCheckMobile);

  /* API routes */

  // POST ROUTES

  // Update admin info after a G+ login
  app.post('/api/token', function(req, res) {

    // Format info for a db insert
    var userInfo = {
      access_token: req.body.accessToken,
      refresh_token: req.body.refreshToken,
      email: req.body.email,
      name: req.body.name
    };

    // Closure variable to store admin ID after db
    var adminId;

    // Save the new token to the DB
    helpers.updateAdminTokens(userInfo)
      .then(function(admin) {
        return admin.save().then(function(admin) {
          adminId = admin.get('id');
          return sync(admin.get('id'), admin.get('access_token'), admin.get('email'));
        });
      })
      .then(function() {
        // Send the adminId back so it can be stored in the client session
        res.status(200).json({adminId: adminId});
      })
      .catch(function(error) {
        res.status(500).send('Authentication error', error);
      });

  });

  // Sign a user in and register their device if needed
  app.post('/api/signin', function(req, res) {

    var email = req.body.email;
    var deviceId = req.body.deviceId;

    helpers.updateDeviceId(email, deviceId)
      .then(function(model) {
        // No participant found
        if (model === 404) {
          // Create a new participant
          helpers.upsertParticipant({email:email})
            .then(function(model) {
              res.status(201).send(model.toJSON());
            });
        } else {
          res.status(201).send(model.toJSON());
        }
      })
      .catch(function(error) {
        res.status(404).send('No user found' + error);
      });

  });

  app.post('/api/sync', function(req, res) {

    var email = req.body.email;
    var accessToken = req.body.accessToken;
    var adminId = req.body.adminId;

    sync(adminId, accessToken, email)
      .then(function(model) {
        res.status(200).send();
      })
      .catch(function(error) {
        console.log('error', error);
        res.status(500).send('Error syncing calendar' + error);
      });

  });

  app.post('/api/beacons', function(req, res) {

    var beaconId = req.body.id;
    var beaconInfo = {
      admin_id: req.body.adminId,
      uuid: req.body.uuid,
      identifier: req.body.identifier,
      major: req.body.major,
      minor: req.body.minor
    };

    console.log('beaconinfo', beaconInfo);

    helpers.upsert('Beacon', beaconInfo, beaconId)
      .then(function(beacon) {
        beaconId = beacon.get('id');
        return helpers.getEventsByAdminId(beaconInfo.admin_id);
      })
      .then(function(events) {
        events.forEach(function(event) {
          var beaconEvent = {beacon_id: beaconId, event_id: event.get('id')};
          new models.BeaconEvent(beaconEvent)
            .fetch()
            .then(function(model) {
              if (!model) {
                models.BeaconEvent.forge(beaconEvent).save();
              }
            });
        });
        res.status(201).send();
      })
      .catch(function(error) {
        res.status(404).send('Error updating beacon info' + error);
      });

  });

  app.post('/api/participant/status', function(req, res) {

    var participantInfo = {
      participant_id: req.body.participantId,
      event_id: req.body.eventId,
      status: req.body.status
    };

    helpers.updateStatus(participantInfo)
      .then(function(event_participant) {
        res.status(201).send(event_participant.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Error deleting participant' + error);
      });

  });

  // DELETE ROUTES

  app.delete('/api/beacons/:beaconId', function(req, res) {
    helpers.deleteBeacon(req.params.beaconId)
      .then(function(beacon) {
        res.status(200).send('Deleted beacon', beacon.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Error deleting beacon' + error);
      });
  });

  // GET ROUTES

  // Return a list of beacons associated with events
  // that belong to a certain device ID
  app.get('/api/devices/:deviceId/beacons', function(req, res) {

    var deviceId = req.params.deviceId;

    new models.Participant()
      .query({where:{device_id: deviceId}})
      .fetch({withRelated:'events.beacons'})
      .then(function(model) {
        var beacons = model.related('events')
          .chain()
          .map(function(event) {
            return event.related('beacons')
              .map(function(beacon) {
                return JSON.stringify(beacon.pick(function(value, key) {
                  return !(/_pivot/.test(key));
                }));
              });
          })
          .flatten()
          .uniq()
          .map(function(event) {
            return JSON.parse(event);
          })
          .value();
        if (beacons.length > 0) {
          res.status(200).json(beacons);
        } else {
          res.status(404).send('No Beacons found for deviceId');
        }
      });
  });

  // Return a list of events for a participant
  app.get('/api/participants/:participantId/events', function(req, res) {

    var participantId = req.params.participantId;

    helpers.getEvents(participantId)
      .then(function(model) {
        res.status(200).json(model.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch events for this participant ' + error);
      });

  });

  // Return a list of events with associated statuses for a participant
  app.get('/api/participants/:participantId/history', function(req, res) {

    var participantId = req.params.participantId;

    helpers.getParticipantEventHistory(participantId)
      .then(function(model) {
        res.status(200).json(model.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch events for this participant ' + error);
      });

  });

  // Get event participants for a given eventId
  app.get('/api/events/:eventId/participants', function(req, res) {

    var eventId = req.params.eventId;

    helpers.getEventParticipants(eventId)
    .then(function(model) {
      res.status(200).json(model.toJSON());
    })
    .catch(function(error) {
      res.status(404).send('Invalid event ID ' + error);
    });

  });

  // Get the event info for any events happening within 1 hour of now for a given participant
  app.get('/api/participants/:participantId/events/current', function(req, res) {

    var participantId = req.params.participantId;

    helpers.getCurrentEvent(participantId)
      .then(function(events) {
        if (events.length > 0) {
          res.status(200).json(events.at(0).toJSON());
        } else {
          res.status(200).send('No current event found');
          return;
        }
      })
      .catch(function(error) {
        res.status(404).send('Error fetching events for this participant ' + error);
      });

  });

  // Get admin ID from email
  app.get('/api/admins/id', function(req, res) {
    helpers.getAdminFromEmail(req.query.email)
      .then(function(admin) {
        res.status(200).json(admin.id);
      }).catch(function(error) {
        res.status(404).send('Error retrieving admin id');
      });
  });

  // Get current event for an admin
  app.get('/api/admins/:adminId/events/current', function(req, res) {

    var adminId = req.params.adminId;

    helpers.getCurrentEventByAdmin(adminId)
      .then(function(events) {
        if (events.length > 0) {
          res.status(200).json(events.at(0).toJSON());
        } else {
          res.status(200).send('No current event found');
        }
      })
      .catch(function(error) {
        res.status(404).send('Error fetching current event data ' + error);
      });

  });

  // Get all events for a given admin ID
  app.get('/api/admins/:adminId/events', function(req, res) {

    var adminId = req.params.adminId;

    if (adminId) {
      helpers.getEventsByAdminId(adminId)
        .then(function(model) {
          if (model) {
            res.status(200).json(model.toJSON());
          } else {
            res.status(204).send('No events found for this admin ');
          }
        })
        .catch(function(error) {
          res.status(404).send('Unable to fetch admin events data ' + error);
        });
    }

  });

  // Get the admin name for a given admin ID
  app.get('/api/admins/:adminId', function(req, res) {

    var adminId = req.params.adminId;

    helpers.getAdminName(adminId)
      .then(function(model) {
        res.status(200).json(model.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch admin name ' + error);
      });
  });

  // Get the participant info for a given participlant ID
  app.get('/api/participants/:participantId', function(req, res) {

    var participantId = req.params.participantId;

    helpers.getParticipantInfo(participantId)
      .then(function(model) {
        res.status(200).json(model.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch participant info ' + error);
      });
  });

  // Get the participant info for a given device ID
  app.get('/api/devices/:deviceId/participant', function(req, res) {

    var deviceId = req.params.deviceId;

    helpers.getParticipant(deviceId)
      .then(function(model) {
        res.status(200).json(model.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch participant info ' + error);
      });

  });

  // Get the checkin status for a given participant and event
  app.get('/api/participants/:participantId/events/:eventId/status', function(req, res) {

    var participantId = req.params.participantId;
    var eventId = req.params.eventId;

    helpers.getCheckinStatus(participantId, eventId)
      .then(function(model) {
        res.status(200).json(model.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch checkin status ' + error);
      });

  });

  // Get all the beacons for a given admin
  app.get('/api/admins/:adminId/beacons', function(req, res) {

    var adminId = req.params.adminId;

    helpers.getAdminBeacons(adminId)
      .then(function(beacons) {
        res.status(200).json(beacons.toJSON());
      })
      .catch(function(error) {
        res.status(404).send('Unable to fetch beacons ' + error);
      });

  });

};
