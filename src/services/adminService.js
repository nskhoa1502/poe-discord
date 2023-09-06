
const discordAuthorRex = /^<{1}@{1}!?\d+>{1}$/;
const { Logger } = require('simple-node-logger');
const CurrentExile = require('../data-access/currentExiles');
const DiscordHelper = require('../discordHelper');

const CURRENT_LEAGUE = process.env.CURRENT_LEAGUE;
//TODO REPLACE THIS WITH DYNAMIC UPGRADES FROM ANOTHER POE API.

// We do it this way to allow private messaging, doing receivedMessage.member.roles doesn't work if it's a DM.
async function isAdmin(receivedMessage) {
  return await DiscordHelper.getGuild().members.fetch(receivedMessage.author.id).then(guildMember => {
    return guildMember.roles.cache.has(DiscordHelper.getRoles().botAdminRole);
  }).catch((error) => {
    Logger.info(`Admin Message Received failed due to ${error}`)
    return false;
  });
}

function whois(author, receivedMessage) {
  if (!discordAuthorRex.test(author)) {
    receivedMessage.channel.send('Invalid syntax.');
    return;
  }
  const discordUid = author.replace(/[^0-9]/g, '').trim();

  CurrentExile.findOneByDiscordUid(discordUid).then(result => {
    if (result) {
      let charStr = 'No Characters Found - Private Profile or Character Tab.';
      if (result.characters && result.characters.length > 0) {
        charStr = `**${CURRENT_LEAGUE} League Characters:** `;
        for (let i = 0; i < result.characters.length; i++) {
          let c = result.characters[i];
          if (c.league === CURRENT_LEAGUE) {
            charStr += `*Name:* ${c.name}, Class: ${c.class}, Level: ${c.level}, Experience: ${c.experience} `;
          }
        }
      }
      DiscordHelper.sendMessageAndRemoveCommandMessage(receivedMessage, `**IGN:** ${escape(result.id)}, **Challenges Complete:** ${result.challengesCompleted}, **Last Online:** ${result.last_online}, **Linked At:** ${result.linkDate}, ${charStr}`);
    } else {
      DiscordHelper.sendMessageAndRemoveCommandMessage(receivedMessage, `Exile not linked (No discordUid -> IGN link)`);
    }
  });
}

module.exports = {
  isAdmin,
  whois
};
