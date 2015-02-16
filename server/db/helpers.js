var models = require('../models');
var moment = require('moment');
var _ = require('underscore');
var promise = require('bluebird');

// POST HELPERS

exports.updateDeviceId = function(email, deviceId) {

  return new models.Participant()
    .query({where: {email: email}})
    .fetch({require:true})
    .then(function(model) {
      model.set('device_id', deviceId);
      model.save();
      return model;
    });

};

exports.getAdminTokens = function(email) {

  return new models.Admin({email: email})
    .fetch({require: true})
    .then(function(model) {
      return {
        access_token: model.get('access_token'),
        refresh_token: model.get('refresh_token'),
        expiry_date: model.get('token_expiry')
      };
    });

};

exports.getAdminFromEmail = function(email) {
  return new models.Admin({email: email})
    .fetch({require: true})
    .then(function(model) {
      return model;
    });
};

exports.updateAdminTokens = function(email, name, tokens) {

  return new models.Admin({email: email})
    .fetch()
    .then(function(model) {
      if (!model) {
        if (!tokens.refresh_token) {
          throw new Error('Refresh token not supplied for new user');
        }
        // Create record if it doesn't exist
        return models.Admin.forge({
          name: name,
          email: email,
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          token_expiry: tokens.expiry_date,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        });
      } else {
        // Update existing record
        model.set('access_token', tokens.access_token);
        model.set('token_expiry', tokens.expiry_date);
        return model;
      }
    });

};

exports.upsert = function(model, recordInfo, recordId) {

  // Admin record exists, update it
  if (recordId) {
    return new models[model]({id: recordId})
      .fetch({require: true})
      .then(function(model) {
        return model.save(recordInfo);
      });
  }
  // New record, create it
  return models[model].forge(recordInfo).save();

};

exports.updateStatus = function(participantInfo) {

  return new models.EventParticipant({
      participant_id: participantInfo.participant_id,
      event_id: participantInfo.event_id
    })
    .fetch({require:true})
    .then(function(event_participant) {
      return event_participant.save({status:participantInfo.status});
    });

};

// DELETE HELPERS

exports.deleteBeacon = function(id) {

  console.log('deleting beacon', id);

  return models.Beacon.forge({
    id: id
  }).destroy();

};

// GET HELPERS

exports.getBeacons = function(eventId) {

  return new models.Events()
    .query({where: {event_id: eventId}})
    .fetch({withRelated: ['beacons'], require: true})
    .then(function(events) {
      return events.related('beacons');
    });

};

exports.getAdminBeacons = function(adminId) {

  return new models.Admin()
    .query({where: {id: adminId}})
    .fetch({withRelated: ['beacons'], require: true})
    .then(function(admin) {
      return admin.related('beacons');
    });

};

exports.getEvents = function(participantId) {

  return new models.Participant()
    .query({where: {id: participantId}})
    .fetch({withRelated: ['events'], require: true})
    .then(function(model) {
      return model;
    });

};

exports.getParticipantEventHistory = function(participantId) {

  return new models.EventsParticipants()
    .query({where: {participant_id: participantId}})
    .fetch({withRelated: ['event'], require: true})
    .then(function(model) {
      return model;
    });

};

exports.getAdminName = function(adminId) {

  return new models.Admin()
    .query({where: {id: adminId}})
    .fetch({require: true})
    .then(function(model) {
      return model;
    });

};

exports.getParticipantInfo = function(participantId) {
  return new models.Participant()
    .query({where: {id: participantId}})
    .fetch({require: true})
    .then(function(model) {
      return model;
    });
};

exports.getEventsByAdminId = function(adminId) {

  return new models.Events()
    .query({where: {admin_id: adminId}})
    .fetch()
    .then(function(collection) {
      return collection;
    });

};

exports.getEventParticipants = function(eventId) {

  return new models.Event({id: eventId})
    .fetch({withRelated: ['participants'], require: true})
    .then(function(model) {
      return model;
    });

};

exports.getParticipant = function(deviceId) {

  return new models.Participant()
    .query({where: {device_id: deviceId}})
    .fetch({require: true})
    .then(function(model) {
      return model;
    });

};

exports.getCheckinStatus = function(deviceId, eventId) {

  var participant_id;

  return exports.getParticipant(deviceId)
    .then(function(model) {
      participant_id = model.get('id');
    })
    .then(function() {
      return new models.EventsParticipants()
        .query({where:{participant_id: participant_id, event_id: eventId}})
        .fetchOne({require: true})
        .then(function(model) {
          return model;
        });
    });

};

exports.getCurrentEvent = function(participantId) {

  return new models.Participant({id: participantId})
    .fetch({withRelated: 'currentEvent', require: true})
    .then(function(participant) {
      return participant.related('currentEvent');
    });

};

exports.getCurrentEventByAdmin = function(adminId) {

  return new models.Admin({id: adminId})
    .fetch({withRelated: 'currentEvent', require: true})
    .then(function(admin) {
      return admin.related('currentEvent');
    });
};

// PUBNUB HELPERS

exports.checkinUser = function(deviceId) {

  var participantId;
  var eventId;
  var eventStartTime;
  var status;
  var now = moment();

  // Get the participant_id from the deviceID
  return exports.getParticipant(deviceId)

    // Get the event_id of the closest event in time
    .then(function(model) {
      participantId = model.get('id');
      return exports.getCurrentEvent(participantId);
    })
    .then(function(collection) {
      var model = collection.at(0);
      eventId = model.get('id');
      eventStartTime = moment(model.get('start_time'));
      // Update the event_participant status and check-in time
      status = (eventStartTime.format('X') - now.format('X') >= 0) ? 'ontime' : 'late';
      return new models.EventParticipant({event_id: eventId, participant_id: participantId})
        .fetch();
    })
    .then(function(model) {
      if (model && !model.get('status')) {
        // Record exists with a null status, update it
        model.set('status', status);
        model.set('checkin_time', moment().format('YYYY-MM-DD HH:mm:ss'));
        model.save();
      } else if (!model) {
        // Record doesn't exist, create it
        models.EventParticipant.forge({
          event_id: eventId,
          participant_id: participantId,
          status: status,
          checkin_time: now.format('YYYY-MM-DD HH:mm:ss')
        }).save();
      } else {
        // Status is already set, do nothing
        return;
      }
      return {
        deviceId: deviceId,
        eventId: eventId,
        participantId: participantId,
        status: status
      };
    });
};

// SYNC HELPERS
exports.getSyncToken = function(adminId, calendarId) {

  return new models.Calendar({admin_id: adminId, calendar_id: calendarId})
    .fetch()
    .then(function(model) {
      if (model) {
        return model.get('sync_token');
      }
    });
};

exports.upsertEvent = function(event) {

  return new models.Event({gcal_id: event.gcal_id})
    .fetch()
    .then(function(model) {
      if (model) {
        return model.save(event);
      } else {
        return models.Event.forge(event).save();
      }
    });

};

exports.upsertSyncTokens = function(calendarRecord) {

  return new models.Calendar({calendar_id: calendarRecord.calendar_id})
    .fetch()
    .then(function(model) {
      if (model) {
        return model.save(calendarRecord);
      } else {
        return models.Calendar.forge(calendarRecord).save();
      }
    });
};

// Update an event record, and event participant record based on gcal api event info
exports.upsertEventParticipants = function(eventRecord, attendees) {

  if (attendees.length > 0) {
    var eventParticipants = _.map(attendees, function(attendee) {
      return {
        event_id: eventRecord.attributes.id,
        gcal_id: eventRecord.attributes.gcal_id,
        participant_id: attendee.participant_id,
        gcal_response_status: attendee.gcal_response_status
      };
    });
    return promise.map(eventParticipants, function(eventParticipant) {
      return new models.EventParticipant(eventParticipant)
        .fetch()
        .then(function(model) {
          if (model) {
            return model.save(eventParticipant);
          } else {
            return models.EventParticipant.forge(eventParticipant).save();
          }
        });
    });
  }

};

// Upsert participant info from gcal sync
exports.upsertParticipant = function(participant) {

  return new models.Participant({email: participant.email})
    .fetch()
    .then(function(model) {
      if (model) {
        return model.save(participant);
      } else {
        return models.Participant.forge(participant).save();
      }
    });

};
