require("dotenv").config();
const Logger = require("./logger").getLogger();
const MongoDB = require("./data-access/mongoDb");

const CommandReceivedController = require("./controllers/commandReceivedController");
const GuildMemberController = require("./controllers/guildMemberController");

const CurrentExilesService = require("./services/currentExilesService");
const DiscordHelper = require("./discordHelper");

const commandPrefix = process.env.COMMAND_PREFIX
  ? process.env.COMMAND_PREFIX
  : "!";
const welcomeMessage = process.env.WELCOME_MESSAGE
  ? process.env.WELCOME_MESSAGE
  : "Welcome message is undefined please set env var WELCOME_MESSAGE";

DiscordHelper.onEvent("ready", () => {
  Logger.info(
    `Discord.js - Client Ready as ${DiscordHelper.getClientUser().username}`
  );
  GuildMemberController.scrapeGuildMembers();
});

DiscordHelper.onEvent("messageCreate", (receivedMessage) => {
  if (receivedMessage.author === DiscordHelper.getClientUser()) {
    return;
  }
  if (receivedMessage.content.startsWith(commandPrefix)) {
    CommandReceivedController.processCommand(receivedMessage);
  }
});

DiscordHelper.onEvent("guildMemberAdd", (member) => {
  member.send(welcomeMessage);
});

DiscordHelper.onEvent("guildMemberRemove", (member) => {
  CurrentExilesService.notifyGuildOfMemberLeftDiscord(member);
});

DiscordHelper.onEvent("error", (err) => {
  Logger.error(`FATAL =>  ${err.message}`);
});

DiscordHelper.onEvent("reconnecting", () => {
  Logger.info(`Attempting WS reconnection...`);
});

MongoDB.connectDB((err) => {
  if (err) {
    Logger.error(err);
    throw err;
  }

  Logger.info(`Bot initializing started, now connection to DB established`);
  // Initialize the bot now connection DB connection established.
  DiscordHelper.doLogin();
  DiscordHelper.getGuildAsync().then((guild) => {
    Logger.info(`Guild Fetched = ${guild.id}`);
    require("./controllers/newMemberController");
  });
  // require('./controllers/newMemberController');
});
