const NewMemberService = require('../services/newMemberService');
const PoeHttp = require('../http-access/poeHttp');
const Logger = require('../logger').getLogger();

async function joinAcceptGuildRules(args, receivedMessage) {
  if (args[0] !== 'accept' && args[0] !== 'Accept') {
    receivedMessage.author.send(`Rules have not been accepted.`);
    return;
  }

  const accountName = args[1];

  Logger.info(`${receivedMessage.author.username}/${receivedMessage.author.id} has accepted the terms and conditions applied with accountName ${accountName}`);

  if (!accountName) {
    receivedMessage.author.send('No PoE account name provided.');
    return;
  }

  if (accountName.length < 3 || accountName.length > 23) {
    receivedMessage.author.send('accountName provided is invalid, doesnt meet the length requirements of PoE character naming conventions.');
    return;
  }

  validateAccountName(accountName).then(accountName => {
    if (!accountName) {
      receivedMessage.author.send(`Account Not found - Possible Reasons Include: \na) POE Website is unavailable \nb) Character Tab is private \nc) Profile is private \nPlease make your profile public and retry, you can make it private after you've joined.`);
    } else {
      NewMemberService.doLinkChecking(receivedMessage, accountName);
    }
  }).catch(err => {
    Logger.error(`Error in validateAccountName URL Call - ${err}`);
  });

}

const validateAccountName = async (accountName) => {
  return await PoeHttp.getAccountCharacters(accountName).then(jsonBody => {
    if (jsonBody && jsonBody.length > 0) {
      return accountName;
    }
    return null;
  }).catch(err => {
    Logger.error(`ValidateAccountName::err(${err.statusCode}) when retrieving accounts characters info for account ${accountName}`);
    return null;
  });
}

//   validateAccountName(accountName).then(accountName => {
//     if (!accountName) {
//       receivedMessage.author.send(`Character not found - Possible Reasons Include: \na) POE Website is unavailable \nb) Character Tab is private \nc) Profile is private \nPlease make your profile public and retry, you can make it private after you've joined.`);
//     } else {
//       NewMemberService.doLinkChecking(receivedMessage, accountName);
//     }
//   }).catch(err => {
//     Logger.error(`Error in validateAccountName URL Call - ${err}`);
//   });
// }

// July 2022 - GGG Removed the API to get account names by character.
// const validateAccountName = async (characterName) => {
//   return await PoeHttp.fetchAccountNameForCharacter(characterName).then(jsonBody => {
//     if (jsonBody && jsonBody.accountName) {
//       return jsonBody.accountName;
//     }
//     return null;
//   }).catch(err => {
//     Logger.error(`ValidateAccountName::err(${err.statusCode}) when retrieving characterName info for id  ${characterName}`);
//     return null;
//   });
// }

module.exports = {
  joinAcceptGuildRules
}