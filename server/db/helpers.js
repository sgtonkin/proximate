var models = require('../models');
var moment = require('moment');
var _ = require('underscore');
var promise = require('bluebird');

// POST HELPERS

// Update the device id for a given participant
exports.updateDeviceId = function(email, deviceId) {

  return new models.Participant()
    .query({where: {email: email}})
    .fetch()
    .then(function(model) {
      console.log('updating', model);
      // We have a record to update
      if (model) {
        model.set('device_id', deviceId);
        model.save();
        return model;
      } else {
        return (404);
      }
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

exports.updateAdminTokens = function(userInfo) {

  userInfo.created_at = moment().utc().format();

  return new models.Admin({email: userInfo.email})
    .fetch()
    .then(function(model) {
      if (!model) {
        // Create record if it doesn't exist
        return models.Admin.forge(userInfo);
      } else {
        // Update existing record
        model.set('access_token', userInfo.access_token);
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

  var now = moment().utc();
  var checkinType = 'manual';

  return new models.EventParticipant({
      participant_id: participantInfo.participant_id,
      event_id: participantInfo.event_id
    })
    .fetch({require:true})
    .then(function(event_participant) {
      return event_participant.save({
        status:participantInfo.status,
        checkin_type: checkinType,
        checkin_time: now.format()
      });
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

exports.getCheckinStatus = function(participantId, eventId) {

  return new models.EventsParticipants()
    .query({where:{participant_id: participantId, event_id: eventId}})
    .fetchOne({require: true})
    .then(function(model) {
      return model;
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

exports.checkinUser = function(participantId, type) {

  // Define the type of checkin for storage later
  var checkinType = (type === 'didEnterRegion') ? 'auto' : 'manual';
  var eventId;
  var participantName;
  var participantEmail;
  var eventStartTime;
  var status;
  var now = moment().utc();

  // Log the name/email for easier login
  exports.getParticipantInfo(participantId)
  .then(function(participant) {
    if (participant) {
      participantName = participant.get('name');
      participantEmail = participant.get('email');
      console.log('Attempting checkin for', participantName, participantEmail);
    } else {
      console.log('Invalid participant id for checkin');
    }
  });

  // Get the event_id of the closest event in time
  return exports.getCurrentEvent(participantId)
    .then(function(collection) {
      var model = collection.at(0);
      // Make sure there's a current event to check the user into
      if(model) {
        eventId = model.get('id');
        console.log('Current event id:', eventId, 'name:', model.get('name'), 'found for checkin');
        eventStartTime = moment(model.get('start_time'));
        // Update the event_participant status and check-in time
        status = (eventStartTime.format('X') - now.format('X') >= 0) ? 'ontime' : 'late';
        return new models.EventParticipant({event_id: eventId, participant_id: participantId})
          .fetch();
      } else {
        throw 'No current event to check user into';
      }
    })
    .then(function(model) {
      // Event participant record exists
      if (model) {
        // Status is null or none, update it
        if(model.get('status') === null || model.get('status') === 'none') {
          model.set('status', status);
          model.set('checkin_type', checkinType);
          model.set('checkin_time', now.format());
          model.save();
          console.log('Status record updated for', participantName, participantEmail);
        } else {
          // Status is already set, exit out
          console.log('Status record already set for', participantName, participantEmail);
          return;
        }
      // Event participant record doesn't exist, create it
      } else {
        models.EventParticipant.forge({
          event_id: eventId,
          participant_id: participantId,
          status: status,
          checkin_type: checkinType,
          checkin_time: now.format()
        }).save();
        console.log('Status record created for', participantName, participantEmail);
      // Status is already set, do nothing
      }
      return {
        eventId: eventId,
        checkinType: checkinType,
        checkinTime: now.format(),
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

  console.log(participant.email);

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
