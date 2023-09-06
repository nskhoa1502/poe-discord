
const escape = require('markdown-escape');
const GuildMemberController = require('../controllers/guildMemberController');
const AppliedExiles = require('../data-access/appliedExiles');
const CurrentExile = require('../data-access/currentExiles');
const DiscordHelper = require('../discordHelper');
const Logger = require('../logger').getLogger();

function doLinkChecking(receivedMessage, accountName, characterName) {

  // CHECK IF USER IS ALREADY IN THE TEMP COLLECTION (APPLIED/ACCEPTED).
  AppliedExiles.findOneByDiscordUid(receivedMessage.author.id).then(r => {
    if (r) {
      receivedMessage.author.send(`Your application to join already exists for **PoE Account:** ${escape(r.ignAccountName)}, if you need this updated as it's incorrect please contact an admin.`);
      return;
    }

    // CHECK IF USER IS ALREADY A MEMBER 
    // CHECK IF USER IS LINKED ALREADY BY DISCORD ID
    CurrentExile.findOneByDiscordUid(receivedMessage.author.id).then(r1 => {
      if (r1) {
        receivedMessage.author.send(`Your discord account is already linked with the bot.`);
        return;
      }

      // CHECK IF USER IS ALREADY A MEMBER (BY ACCT NAME, AND NOT LINKED -> MODIFY ROLES)
      CurrentExile.findOneByIgn(accountName).then(r2 => {

        if (r2 && !r2.linkDate) {
          // MEMBER FOUND -> LINK THE ACCOUNT
          CurrentExile.createLink(r2.id, receivedMessage.author.id, receivedMessage.author.username).then(() => {
            // MODIFY THE ROLES
            DiscordHelper.getGuild().members.fetch(receivedMessage.author.id).then(guildMember => {
              guildMember.roles.add(DiscordHelper.getRoles().memberRole).then(gM => {
                gM.roles.remove([DiscordHelper.getRoles().exMemberRole, DiscordHelper.getRoles().appliedRole]).catch(err => {
                  Logger.warn(`Discord User (${receivedMessage.author.id}) - Failed to remove roles in addNewMember roles ${err}`);
                });
              }).catch(err => {
                Logger.warn(`Discord User (${receivedMessage.author.id}) - Failed to add role member ${err}`);
              });
            }).catch(err => {
              Logger.error(err);
            });

            receivedMessage.author.send(`You're already a current guild member in game, created a link from PoE -> Discord and updated your user roles.`);

            AppliedExiles.deleteByIgn(accountName).then(r3 => {
              if (!r3 || r3.deletedCount !== 1) {
                Logger.info(`No record found to remove ${accountName} - must of been a current member linking their account.`);
                return;
              }
              Logger.info(`New member ${accountName} document from appliedExilesCollection removed.`);
            })
          });
        } else if (r2 && r2.linkDate) {
          receivedMessage.channel.send(`Account is already linked - do you have a new discord account?`);
        } else {
          registerNewMemberRequest(receivedMessage, accountName, characterName);
        }
      });
    });
  });
}

// No existing members found - time to create a entry for guild recruitment pending member invite.
function registerNewMemberRequest(receivedMessage, accountName, characterName) {
  const discordUser = {
    discordUid: receivedMessage.author.id,
    discordUsername: receivedMessage.author.username,
    ignAccountName: accountName,
    suppliedCharacterName: characterName,
    applyDt: new Date()
  };

  AppliedExiles.create(discordUser).then(() => {
    // MODIFY THE ROLES
    DiscordHelper.getGuild().members.fetch(receivedMessage.author.id).then(guildMember => {
      guildMember.roles.add(DiscordHelper.getRoles().appliedRole).catch(err => {
        Logger.warn(err);
      });
    }).catch(err => {
      Logger.error(err);
    });

    let msg = `<@&${DiscordHelper.getRoles().officerRole}> - Discord Author: ${receivedMessage.author} has requested to join the guild and has read/accepted the guild rules.\n`;

    if (GuildMemberController.currentMemberLength >= 250) {
      msg += `The user has been advised that we're currently full and to try again later.`;
      DiscordHelper.sendMessageToMembersLogChannel(msg);
      receivedMessage.author.send(`Thankyou for your application. We're currently full, If positions open we'll contact you.`);
    } else {
      msg += `Please invite to guild - **PoE Account:** ${escape(accountName)}, **IGN:** ${escape(characterName)}`;

      DiscordHelper.sendMessageToMembersLogChannel(msg);

      receivedMessage.author.send(`Thankyou for your application. If your profile is public a guild officer will invite you shortly, otherwise you'll be contacted in discord to get your in game character name for an invite.`);
    }
  }).catch(err => {
    Logger.error(`Error adding account to pending members collection ${JSON.stringify(discordUser)} - ${err.message}`);
  });
}

module.exports = {
  registerNewMemberRequest,
  doLinkChecking
}