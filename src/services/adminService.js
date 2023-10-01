const discordAuthorRex = /^<{1}@{1}!?\d+>{1}$/;
const Logger = require("../logger").getLogger();
const CurrentExile = require("../data-access/currentExiles");
const DiscordHelper = require("../discordHelper");
const { validateAccountName } = require("../controllers/newMemberController");
const { doLinkChecking } = require("./newMemberService");
const MongoDB = require("../data-access/mongoDb");
const currenExilesCollection = "currentExiles";
const PoeHttp = require("../http-access/poeHttp");

const CURRENT_LEAGUE = process.env.CURRENT_LEAGUE;
//TODO REPLACE THIS WITH DYNAMIC UPGRADES FROM ANOTHER POE API.

// We do it this way to allow private messaging, doing receivedMessage.member.roles doesn't work if it's a DM.
async function isAdmin(receivedMessage) {
  return await DiscordHelper.getGuild()
    .members.fetch(receivedMessage.author.id)
    .then((guildMember) => {
      return guildMember.roles.cache.has(DiscordHelper.getRoles().botAdminRole);
    })
    .catch((error) => {
      Logger.info(`Admin Message Received failed due to ${error}`);
      return false;
    });
}

async function adminGetIgn(discordUid, receivedMessage) {
  const extractDiscordUidNumber = /<@(\d+)>/; // Modify the regex pattern
  const discordUidNumb = discordUid.match(extractDiscordUidNumber);
  let inGameCharacters = [];
  let numericPart;
  if (discordUidNumb) {
    numericPart = discordUidNumb[1];
  }
  // console.log("discordUid", discordUid);
  // console.log("discordNumb", discordUidNumb);
  // console.log("numericPart", numericPart);
  try {
    const user = await MongoDB.getDB()
      .collection(currenExilesCollection)
      .findOne({ discordUid: numericPart });

    Logger.info(
      `Fetching in-game characters for discord user ${user.discordUsername} with poe account ${user.id}`
    );
    // console.log("user is", user);
    // console.log("received message", receivedMessage);

    const charactersJson = await PoeHttp.getAccountCharacters(user.id);
    console.log("charactersJson", charactersJson);
    for (let i = 0; i < charactersJson.length; i++) {
      const { name, league } = charactersJson[i];
      const className = charactersJson[i]["class"];
      inGameCharacters.push({ name, className, league });
    }

    Logger.info(
      `Finished fetching in-game characters for discord user ${user.discordUsername} with poe account ${user.id}`
    );
    // console.log(inGameCharacters);

    await CurrentExile.updateOneIgCharacter(numericPart, inGameCharacters);
    DiscordHelper.sendMessageToMembersLogChannel(
      `Finished fetching characters for discord ${user.discordUsername} with poe account ${user.id}`
    );
    DiscordHelper.sendMessageAndRemoveCommandMessage(
      receivedMessage,
      `Finished fetching characters for discord ${user.discordUsername} with poe account ${user.id}`
    );

    return;
  } catch (error) {
    Logger.info(
      `Error fetching in-game characters for discord user ${discordUid}`
    );
  }
}

async function isAdminCreateLink(
  poeAccountName,
  discordAccount,
  receivedMessage
) {
  const admin = true;
  const linkedMember = await DiscordHelper.getGuild().members.fetch(
    receivedMessage.author.id
  );

  // console.log("LinkedMember", linkedMember);
  // console.log("LinkedMember.user", linkedMember.user);

  Logger.info(
    `Admin ${receivedMessage.author.username}/${receivedMessage.author.id} has started linking ${poeAccountName} to member ${linkedMember.user.username}`
  );

  DiscordHelper.sendMessageToMembersLogChannel(
    `Admin ${receivedMessage.author.username}/${receivedMessage.author.id} has started linking ${poeAccountName} to member ${linkedMember.user.username}`
  );

  if (!poeAccountName) {
    receivedMessage.author.send("No POE account name provided");
    return;
  }

  if (!discordAccount) {
    receivedMessage.author.send("No discordAccount provided");
    return;
  }
  if (poeAccountName.length < 3 || poeAccountName.length > 23) {
    receivedMessage.author.send(
      "accountName provided is invalid, doesnt meet the length requirements of PoE character naming conventions."
    );
    return;
  }

  validateAccountName(poeAccountName)
    .then((accountName) => {
      if (!accountName) {
        receivedMessage.author.send(
          `Account Not found - Possible Reasons Include: \na) POE Website is unavailable \nb) Character Tab is private \nc) Profile is private \nPlease make your profile public and retry, you can make it private after you've joined.`
        );
      } else {
        doLinkChecking(linkedMember.user, accountName, admin);
      }
    })
    .catch((err) => {
      Logger.error(`Error in validateAccountName URL Call - ${err}`);
    });
}

function whois(author, receivedMessage) {
  if (!discordAuthorRex.test(author)) {
    receivedMessage.channel.send("Invalid syntax.");
    return;
  }
  const discordUid = author.replace(/[^0-9]/g, "").trim();

  CurrentExile.findOneByDiscordUid(discordUid).then((result) => {
    if (result) {
      let charStr = "No Characters Found - Private Profile or Character Tab.";
      if (result.inGameCharacters && result.inGameCharacters.length > 0) {
        charStr = `**${CURRENT_LEAGUE} League Characters:** `;
        for (let i = 0; i < result.inGameCharacters.length; i++) {
          let c = result.inGameCharacters[i];
          if (c.league === CURRENT_LEAGUE) {
            charStr += `\n*Name:* ${c.name} \n Class: ${c.className} ;`;
          }
        }
      }
      DiscordHelper.sendMessageAndRemoveCommandMessage(
        receivedMessage,
        `**IGN:** ${escape(result.id)}, **Challenges Complete:** ${
          result.challengesCompleted
        }, **Last Online:** ${result.last_online}, **Linked At:** ${
          result.linkDate
        }, ${charStr}`
      );
    } else {
      DiscordHelper.sendMessageAndRemoveCommandMessage(
        receivedMessage,
        `Exile not linked (No discordUid -> IGN link)`
      );
    }
  });
}

module.exports = {
  isAdmin,
  whois,
  isAdminCreateLink,
  adminGetIgn,
};
