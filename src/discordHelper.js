const { Client, GatewayIntentBits } = require("discord.js");
const discordGuildUid = process.env.DISCORD_GUILD_UID;
const discordGuildOwnerUid = process.env.DISCORD_GUILD_OWNER_UID;
const discordMemberLogChannelUid = process.env.DISCORD_MEMBERS_LOG_CHANNEL_UID;

const discordReceivedMessageRemovalDelay = process.env
  .DISCORD_RECEIVED_MESSAGE_REMOVAL_DELAY
  ? parseInt(process.env.DISCORD_RECEIVED_MESSAGE_REMOVAL_DELAY)
  : 5000;
const discordSentMessageRemovalDelay = process.env
  .DISCORD_SENT_MESSAGE_REMOVAL_DELAY
  ? parseInt(process.env.DISCORD_SENT_MESSAGE_REMOVAL_DELAY)
  : 10000;

const roles = {
  officerRole: process.env.DISCORD_ROLE_OFFICER_UID,
  botAdminRole: process.env.DISCORD_ROLE_BOTADMIN_UID,
  appliedRole: process.env.DISCORD_ROLE_APPLIED_UID,
  exMemberRole: process.env.DISCORD_ROLE_EXMEMBER_UID,
  memberRole: process.env.DISCORD_ROLE_MEMBER_UID,
};

const Logger = require("./logger").getLogger();
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const _ = require("lodash");

const opts = {
  logFilePath: "../poe-discord/logs/discord.log",
  timestampFormat: "YYYY-MM-DD HH:mm:ss.SSS",
  fileNamePattern: "roll-<DATE>.log",
};

const DiscordFileLog = require("simple-node-logger").createSimpleLogger(opts);
DiscordFileLog.setLevel(process.env.LOG_LEVEL);
DiscordFileLog.info(`DiscordFileLog has been initialized.`);

function getClientUser() {
  return discordClient.user;
}
function getRoles() {
  return roles;
}

function getGuildOwnerUid() {
  return discordGuildOwnerUid;
}

function doLogin() {
  login();
}

const login = _.throttle(() => {
  Logger.info(`Discord.js - Attempting to login`);
  discordClient
    .login(process.env.DISCORD_TOKEN)
    .then(() => Logger.info(`Discord.js - Login successful`))
    .catch((err) => {
      Logger.error(`Discord.js - Exception logging in - ${err}`);
      login();
    });
}, 10000);

function onEvent(event, callback) {
  return discordClient.on(event, callback);
}

function getGuild() {
  return discordClient.guilds.cache.get(discordGuildUid);
}
function getGuildAsync() {
  return discordClient.guilds.fetch(discordGuildUid);
}

function sendMessageToMembersLogChannel(message) {
  const channelCache = discordClient.channels.cache.get(
    discordMemberLogChannelUid
  );
  if (channelCache) {
    discordClient.channels.cache.get(discordMemberLogChannelUid).send(message);
  } else {
    discordClient.channels
      .fetch(discordMemberLogChannelUid)
      .then((channel) => channel.send(message));
  }
}

/**
 * Sends a message replying to the received message and then deletes the sent message
 * and the received message after X time in millis.
 * - Checks to see if is guild, as wont delete DM's.
 * @param {Discord.js receivedMessage} receivedMessage
 * @param {String of message to send} message
 */
function sendMessageAndRemoveCommandMessage(receivedMessage, message) {
  receivedMessage.channel
    .send(message)
    .then((sentMessage) => {
      if (receivedMessage.guild !== null) {
        setTimeout(
          () =>
            sentMessage
              .delete()
              .then((deletedMessage) => {
                Logger.debug(
                  `Deleted message from ${deletedMessage.author.username}`
                );
              })
              .catch((err) => Logger.warn(`Error deletingMessage - ${err}`)),
          discordSentMessageRemovalDelay
        );

        setTimeout(
          () =>
            receivedMessage
              .delete()
              .then((deletedMessage) => {
                Logger.debug(
                  `Deleted message from ${deletedMessage.author.username}`
                );
              })
              .catch((err) => Logger.warn(`Error deletingMessage - ${err}`)),
          discordReceivedMessageRemovalDelay
        );
      }
    })
    .catch((err) => {
      Logger.warn(`Error when sending message to discord channel - ${err}`);
    });
}

module.exports = {
  getGuild,
  getGuildAsync,
  getGuildOwnerUid,
  getRoles,
  getClientUser,
  sendMessageToMembersLogChannel,
  sendMessageAndRemoveCommandMessage,
  doLogin,
  onEvent,
  DiscordFileLog,
};
