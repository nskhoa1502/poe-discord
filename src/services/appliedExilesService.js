const escape = require("markdown-escape");
const DiscordHelper = require("../discordHelper");
const AppliedExile = require("../data-access/appliedExiles");
const Logger = require("../logger").getLogger();

function printPendingGuildInvites(receivedMessage) {
  AppliedExile.findAll().then((result) => {
    if (result) {
      receivedMessage.channel.send(
        `There are currently ${result.length} pending guild invites.`
      );
      result.forEach((e) => {
        receivedMessage.channel.send(
          `Discord User: <@${e.discordUid}>, PoE Account: ${escape(
            e.ignAccountName
          )}, Applied Date: ${e.applyDt}`
        );
        // receivedMessage.channel.send(`Discord User: <@${e.discordUid}>, PoE Account: ${escape(e.ignAccountName)}, IGN: ${escape(e.suppliedCharacterName)}, Applied Date: ${e.applyDt}`);
      });
    } else {
      receivedMessage.channel.send(
        `There are no pending guild invites to action.`
      );
    }
  });
}

function removePendingGuildInvite(discordUid, receivedMessage) {
  // console.log(discordUid);
  AppliedExile.deleteByDiscordUid(discordUid).then((result) => {
    if (!result || result.deletedCount !== 1) {
      DiscordHelper.sendMessageAndRemoveCommandMessage(
        receivedMessage,
        `Record not found to remove.`
      );
      return;
    }
    DiscordHelper.sendMessageAndRemoveCommandMessage(
      receivedMessage,
      `The users application has been removed.`
    );
    DiscordHelper.getGuild()
      .members.fetch(discordUid)
      .then((guildMember) => {
        guildMember.roles.remove(DiscordHelper.getRoles().appliedRole);
      })
      .catch((err) => {
        Logger.warn(
          `Error fetching guild member ${discordUid} to remove Applied Role - ${err}`
        );
      });
  });
}

module.exports = {
  printPendingGuildInvites,
  removePendingGuildInvite,
};
