const CurrentExile = require("../data-access/currentExiles");
const PoeHttp = require("../http-access/poeHttp");
const DiscordHelper = require("../discordHelper");

const CURRENT_LEAGUE = process.env.CURRENT_LEAGUE;
//TODO REPLACE THIS WITH DYNAMIC UPGRADES FROM ANOTHER POE API.

function printPoeLeague(receivedMessage) {
  CurrentExile.findOneByDiscordUid(receivedMessage.author.id).then((result) => {
    if (!result) {
      DiscordHelper.sendMessageAndRemoveCommandMessage(
        receivedMessage,
        `!rank is not available for exiles who've not linked their discord accounts to there PoE account.`
      );
      return;
    }

    PoeHttp.getLeagueLadderForAccount(CURRENT_LEAGUE, result.id)
      .then((body) => {
        if (!body) {
          DiscordHelper.sendMessageAndRemoveCommandMessage(
            receivedMessage,
            `\`\`\`css\n[Global] There seems to be a problem connecting to api.pathofexile.com ranking unable to be retrieved.\`\`\``
          );
          return;
        }

        if (!body.entries || body.entries.length === 0) {
          DiscordHelper.sendMessageAndRemoveCommandMessage(
            receivedMessage,
            `\`\`\`css\n[Global] ${receivedMessage.author.username} currently has no rank in ${CURRENT_LEAGUE}. Note: The PoE API Only shows the top 15,000 users.\`\`\``
          );
          return;
        }

        if (body.entries.length === 1) {
          let e = body.entries[0];
          DiscordHelper.sendMessageAndRemoveCommandMessage(
            receivedMessage,
            `\`\`\`css\n[Global] Rank.${e.rank} Character.${e.character.name} Level.${e.character.level} Class.${e.character.class} Experience.${e.character.experience}\n\`\`\``
          );
        } else {
          let msgL = `\`\`\`css\n$[Multiple Globally Ranked Characters for ${receivedMessage.author}]\n`;
          body.entries.forEach((e) => {
            msgL += `[Global] Rank.${e.rank} Character.${e.character.name} Level.${e.character.level} Class.${e.character.class} Experience.${e.character.experience}\n`;
          });
          msgL += "```";
          DiscordHelper.sendMessageAndRemoveCommandMessage(
            receivedMessage,
            msgL
          );
        }
      })
      .catch((err) => {
        DiscordHelper.sendMessageAndRemoveCommandMessage(
          receivedMessage,
          `There was an error retrieving the details from PoE website -> ${err.message}`
        );
      });
  });
}

module.exports = {
  printPoeLeague,
};
