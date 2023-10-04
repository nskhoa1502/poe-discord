const RP_def = require("request-promise-native");
const cookie = RP_def.cookie(`POESESSID=${process.env.POESESSID}`);
const cookieJar = RP_def.jar();
cookieJar.setCookie(cookie, "https://www.pathofexile.com");
const RP = RP_def.defaults({
  jar: cookieJar,
});
const valvelet = require("valvelet");

const opts = {
  logFilePath: "../poe-discord/logs/httpCalls.log",
  timestampFormat: "YYYY-MM-DD HH:mm:ss.SSS",
  fileNamePattern: "roll-<DATE>.log",
};

const HttpFileLog = require("simple-node-logger").createSimpleLogger(opts);
HttpFileLog.setLevel(process.env.LOG_LEVEL);
HttpFileLog.info(`PoeHttpAccess has configured the Cookie Jar.`);

async function getGuildProfile() {
  let encodedUrl = encodeURI(
    `https://www.pathofexile.com/guild/profile/${process.env.GUILD_PROFILE_ID}`
  );
  HttpFileLog.info(`Calling: ${encodedUrl}`);
  return RP(encodedUrl);
}

async function getPatchNotes() {
  let url = `https://www.pathofexile.com/forum/view-forum/patch-notes`;
  HttpFileLog.info(`Calling: ${url}`);
  return RP(url);
}

async function getLeagueName() {
  let url = `https://api.pathofexile.com/league?realm=pc&type=main&limit=1&offset=8`;
  HttpFileLog.info(`Calling: ${url}`);
  return RP(url);
}

/**
 * Rate Limited Function (Has it's own limiter)
 * x-rate-limit-policy: ladder-view
 * x-rate-limit-ip: 5:5:10,10:10:30,15:10:300
 * X requests per X seconds, if go over = X second ban.
 * 5:5:10 -> Ban 10 seconds
 * 10:10:30 -> Ban 30 seconds
 * 15:10:300 -> Ban 300 seconds
 * @param {} accountName
 */
const getLeagueLadderForAccount = valvelet(
  getLeagueLadderForAccountLimited,
  1,
  1010
);

async function getLeagueLadderForAccountLimited(currentLeague, accountName) {
  let encodedUrl = encodeURI(
    `https://api.pathofexile.com/ladders/${currentLeague}?accountName=${accountName}`
  );
  HttpFileLog.info(`Calling: ${encodedUrl}`);
  return RP(encodedUrl, { json: true });
}

/**
 * `https://api.pathofexile.com/ladders/Ancestor?accountName=kietack1203`
 * Rate Limited Function x per/x sec/else x sec ban
 * x-rate-limit-account: 60:60:60,200:120:900
 * x-rate-limit-account-state: 1:60:0,4:120:0
 * x-rate-limit-policy: backend-character-request-limit
 * x-rate-limit-rules: Account
 * @param {} accountName
 */
const getAccountCharacters = valvelet(getAccountCharactersCall, 1, 2000);

async function getAccountCharactersCall(accountName) {
  let encodedUrl = encodeURI(
    `https://www.pathofexile.com/character-window/get-characters?accountName=${accountName}`
  );
  HttpFileLog.debug(`Calling: ${encodedUrl}`);
  return RP(encodedUrl, { json: true });
}

/**
 * Rate Limited Function x per/x sec/else x sec ban
 * x-rate-limit-account: 60:60:60,200:120:900
 * x-rate-limit-account-state: 1:60:0,1:120:0
 * x-rate-limit-policy: backend-character-request-limit
 * x-rate-limit-rules: Account
 * @param {*} characterName
 */
const fetchAccountNameForCharacter = valvelet(
  fetchAccountNameForCharacterCall,
  1,
  1010
);

async function fetchAccountNameForCharacterCall(characterName) {
  let encodedUrl = encodeURI(
    `https://www.pathofexile.com/character-window/get-account-name-by-character?character=${characterName}`
  );
  HttpFileLog.info(`Calling: ${encodedUrl}`);
  return RP(encodedUrl, { json: true });
}

module.exports = {
  getPatchNotes,
  getLeagueLadderForAccount,
  getAccountCharacters,
  getGuildProfile,
  fetchAccountNameForCharacter,
  getLeagueName,
};
