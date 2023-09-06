const CurrentExile = require('../data-access/currentExiles');
const AppliedExile = require('../data-access/appliedExiles');
const DiscordHelper = require('../discordHelper');
const moment = require('moment-timezone');
const Logger = require('../logger').getLogger();
const _ = require('lodash');

function actionMemberLinking(exilesToLink) {
  exilesToLink.forEach(e => {
    AppliedExile.findOneByIgn(e).then(exile => {
      if (!exile) {
        Logger.info(`${e} User has no discord linking info (In AppliedCollection) added to guild not through joining process.`);
        return;
      }

      CurrentExile.createLink(e, exile.discordUid, exile.discordUsername).then(() => {
        Logger.info(`${e} document from currentExiles collection updated`);

        AppliedExile.deleteByIgn(e).then(() => {
          Logger.info(`${e} document from appliedExiles collection deleted`);
          addNewMemberRoles(exile);
        });
      })
    });
  });
}

async function removeExilesAndRoles(exiledExiles) {
  for (let i = 0; i < exiledExiles.length; i++) {
    await CurrentExile.deleteOneById(exiledExiles[i].id).then(() => {
      removeMembersRoles(exiledExiles[i]);
    });
  }
}

function actionAddRemoveDiscordRoles(discordUid, discordUsername, roleToAdd, rolesToRemove) {
  DiscordHelper.DiscordFileLog.debug(`(start)::${discordUsername}/${discordUid} Adding: ${roleToAdd}, Removing: ${rolesToRemove}.`);

  DiscordHelper.getGuild().members.fetch(discordUid).then(guildMember => {
    DiscordHelper.DiscordFileLog.debug(`actionAddRemoveDiscordRoles::${discordUsername}/${discordUid} member fetched - removing/adding roles.`);

    guildMember.roles.remove(rolesToRemove).then(gm => {
      gm.roles.add(roleToAdd).catch(err => {
        DiscordHelper.DiscordFileLog.warn(`Discord User: ${discordUsername}/ ${discordUid} - Failed to add role ${roleToAdd} ${err}`);
      });
    }).catch(err => {
      DiscordHelper.DiscordFileLog.warn(`Discord User: ${discordUsername}/${discordUid} - Failed to remove roles ${rolesToRemove} - ${err.message}`);
    });
  }).catch(err => {
    DiscordHelper.DiscordFileLog.warn(`Discord User: ${discordUsername}/${discordUid} - Failed to fetch member - Likely no longer in discord server. ${err}`);
  });
}

// REMOVE MEMBERS - > USER DISCORD ROLES (Remove 'Member', OfficerRole -> Add 'Ex-Member')
function removeMembersRoles(exiledExile) {
  Logger.debug('In removeMembersRoles  for exiledExile - ' + exiledExile);
  if (!exiledExile.discordUid) {
    Logger.warn(`${exiledExile.id} - User was not linked, No action`);
    return;
  }
  const addRoles = DiscordHelper.getRoles().exMemberRole;
  const removeRoles = [DiscordHelper.getRoles().memberRole, DiscordHelper.getRoles().officerRole];
  actionAddRemoveDiscordRoles(exiledExile.discordUid, exiledExile.discordUsername, addRoles, removeRoles);
}

// ADD MEMBERS - > USER DISCORD ROLES (Remove 'Ex Member, Unverified', 'Applied' -> Add  'Member')
function addNewMemberRoles(newExile) {
  Logger.debug('In addNewMemberRoless for newExile - ' + newExile);
  if (!newExile.discordUid) {
    Logger.warn(`Members UID not found - ${newExile.discordUid}`);
    return;
  }

  const addRole = DiscordHelper.getRoles().memberRole;
  const removeRoles = [DiscordHelper.getRoles().exMemberRole, DiscordHelper.getRoles().appliedRole];
  actionAddRemoveDiscordRoles(newExile.discordUid, newExile.discordUsername, addRole, removeRoles);
}

async function getCurrentMembersOrCreateIfDoesntExist(inGameExiles) {
  return await CurrentExile.findAll().then(async result => {
    if (_.size(result) > 0) {
      return result;
    }
    return await CurrentExile.bulkInsert(inGameExiles).then(doc => {
      Logger.info(_.size(doc.insertedIds) + ' records inserted');
      return null;
    });
  })
}

function printCurrentMemberLength(receivedMessage) {
  CurrentExile.findAll().then(result => {
    receivedMessage.channel.send(`We currently have ${result.length} members.`);
  })
}

/**
 * Loops through the indexes to add any 'same' values as the n(th) index.
 * @param {} topArray 
 * @param {*} linkedExiles 
 * @param {*} lastRecord 
 * @param {*} nextRecord 
 */
function incrementBasedOnArrayPos(topArray, linkedExiles, lastRecord, nextRecord) {
  let idx = topArray.length;

  while (lastRecord && nextRecord && (lastRecord.challengesCompleted === nextRecord.challengesCompleted)) {
    nextRecord = linkedExiles[idx++];
      
      if ((nextRecord && nextRecord.challengesCompleted) === (lastRecord && lastRecord.challengesCompleted)) {
          topArray.push(nextRecord);
      }
  }
  return topArray;
}

function retrieveGuildChallengeLadder(receivedMessage) {
  let limit = 10;

  CurrentExile.findLinkedSortedByChallenges().then(result => {
    let linkedExiles = result;

    let topLimit = linkedExiles.slice(0, limit);

    topLimit = incrementBasedOnArrayPos(topLimit, linkedExiles, topLimit[topLimit.length - 1], linkedExiles[topLimit.length]);

    let challengeOutput = '';
    // let outputLines = 1; // Embed links can only have 15 lines of text...
    let userRank = 1; // Sets the output value, e.g. if 2 people have the same challenges, they're the same rank...
    let lastRecord = false;

    topLimit.forEach(e => {
      // if (outputLines <= 15 && challengeOutput.length < 900) {
        if (lastRecord && lastRecord.challengesCompleted !== e.challengesCompleted) {
          userRank++;
        }

        challengeOutput += `\n${userRank}) Account: ${escape(e.id)}, Discord: ${escape(e.discordUsername)}, Completed Challenges: ${e.challengesCompleted}`;
        // outputLines++;
        lastRecord = e;
      // }
    });

    receivedMessage.channel.send(`**League Challenge Rankings**`);
    receivedMessage.channel.send(challengeOutput);

    // if (outputLines > 15 || challengeOutput.length > 900) {
    //   receivedMessage.channel.send(`Embed feature has a limit of 1024 characters, unable to list the others who're equal ${ordinal_suffix_of(userRank)}`);
    // }
  });
}


function notifyGuildOfMemberLeftDiscord(member) {
  if (member.roles.cache.has(DiscordHelper.getRoles().memberRole)) {
    CurrentExile.findOneByDiscordUid(member.id).then(result => {
      if (result) {
        DiscordHelper.sendMessageToMembersLogChannel(`<@${DiscordHelper.getGuildOwnerUid()}> Discord User: ${member} left the discord server need to be removed from guild in game. Account Name: ${result.id}`);
      } else {
        DiscordHelper.sendMessageToMembersLogChannel(`<@${DiscordHelper.getGuildOwnerUid()}> Discord User: ${member} left the discord server (Can't find the linked IGN, may of already left? or was never linked.)`);
      }
    });
  } else {
    DiscordHelper.sendMessageToMembersLogChannel(`Discord User: ${member} has left the discord server. (No action required).`);
  }
}

async function updateCharactersForUsers(currentExiles, databaseExiles) {
  let bulkArray = [];

  currentExiles.forEach(e => {
    // If this exile has characters...
    if (_.size(e.characters) > 0) {
      let dbExile = databaseExiles.find(dbe => dbe.id === e.id);
      if (_.size(dbExile.characters) > 0) {
        dbExile.characters.forEach(dbChar => {
          if (dbChar.hundredReachedAt) {
            let char = e.characters.find(c => c.name === dbChar.name);
            if (char) {
              char.hundredReachedAt = dbChar.hundredReachedAt;
            }
          }
        });
      }

      // This saves the first registered time the user reached level 100.
      e.characters.forEach(c => {
        if (c.level === 100 && !c.hundredReachedAt) {
          c.hundredReachedAt = new Date(moment.tz(process.env.TZ).utc());
          Logger.info(`# Setting date to NOW for aquired level 100 character - ${JSON.stringify(c)}`);
          if (c.league !== 'Standard' && c.league !== 'Hardcore Standard') {
            DiscordHelper.sendMessageToMembersLogChannel(`Congratulation <@${dbExile.discordUid}>/${dbExile.id} on reaching level 100 for character ${c.name} in ${c.league}.`);
          }
        }
      });

      bulkArray.push({
        updateOne: {
          filter: { id: e.id },
          update: { $set: { characters: e.characters } }
        }
      });
    }
  });

  if (bulkArray.length > 0) {
    CurrentExile.bulkUpdate(bulkArray);
  }
}

async function updateLastOnlineTimeAndChallenges(currentExiles) {
  let bulkArray = [];
  currentExiles.forEach(e => {
    if (e.last_online !== null && e.last_online !== undefined) {
      bulkArray.push({
        updateOne: {
          filter: { id: e.id },
          update: { $set: { last_online: e.last_online, challengesCompleted: e.challengesCompleted, memberType: e.memberType } }
        }
      });
    } else {
      bulkArray.push({
        updateOne: {
          filter: { id: e.id },
          update: { $set: { challengesCompleted: e.challengesCompleted, memberType: e.memberType } }
        }
      });
    }
  });

  if (bulkArray.length > 0) {
    CurrentExile.bulkUpdate(bulkArray);
  }
}

module.exports = {
  notifyGuildOfMemberLeftDiscord,
  printCurrentMemberLength,
  retrieveGuildChallengeLadder,
  incrementBasedOnArrayPos,
  updateLastOnlineTimeAndChallenges,
  getCurrentMembersOrCreateIfDoesntExist,
  updateCharactersForUsers,
  removeExilesAndRoles,
  actionMemberLinking
}