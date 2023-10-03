const NewMemberController = require("./newMemberController");

const AppliedExilesService = require("../services/appliedExilesService");
const CurrentExilesService = require("../services/currentExilesService");

const PatchService = require("../services/patchService");

const BotPoeApiServices = require("../services/poeApiService");
const AdminService = require("../services/adminService");

const Logger = require("../logger").getLogger();

function processCommand(receivedMessage) {
  const fullCommand = receivedMessage.content.substr(1); // Remove the leading exclamation mark
  const splitCommand = fullCommand.split(" "); // Split the message up in to pieces for each space
  const primaryCommand = splitCommand[0]; // The first word directly after the exclamation is the command
  const args = splitCommand.slice(1); // All other words are args/parameters/options for the command

  Logger.info(
    `${receivedMessage.author.username}/${receivedMessage.author.id} entered command: ${primaryCommand}, Arguments: ${args}`
  );

  switch (primaryCommand) {
    case "help":
      helpCommand(args, receivedMessage);
      break;
    case "ladder":
      CurrentExilesService.retrieveGuildChallengeLadder(receivedMessage);
      break;
    case "rank":
      BotPoeApiServices.printPoeLeague(receivedMessage);
      break;
    case "patch":
      PatchService.printLatestPatchNotes(receivedMessage);
      break;
    case "join":
      NewMemberController.joinAcceptGuildRules(args, receivedMessage);
      AdminService.adminGetIgn(receivedMessage.author, receivedMessage);
      break;
    case "members":
      CurrentExilesService.printCurrentMemberLength(receivedMessage);
      break;
    case "whois":
      AdminService.whois(args[0], receivedMessage);
      break;
    case "filter":
      receivedMessage.channel.send(
        `Recommended Neversink @ https://github.com/NeverSinkDev/NeverSink-Filter/releases or if you wish to build your own check out https://www.filterblade.xyz/`
      );
      break;
    case "admin":
      AdminService.isAdmin(receivedMessage)
        .then((isAdmin) => {
          if (!isAdmin) {
            receivedMessage.channel.send(
              "You don't have the required access to perform this command."
            );
            return;
          }
          switch (args[0]) {
            case "whois":
              AdminService.whois(args[1], receivedMessage);
              break;
            case "createLink":
              AdminService.isAdminCreateLink(args[1], args[2], receivedMessage);
              break;
            case "getIgn":
              AdminService.adminGetIgn(args[1], receivedMessage);
              break;

            case "pending":
              switch (args[1]) {
                case "remove":
                  AppliedExilesService.removePendingGuildInvite(
                    args[2],
                    receivedMessage
                  );
                  break;

                default:
                  AppliedExilesService.printPendingGuildInvites(
                    receivedMessage
                  );
              }
              break;
            default:
              receivedMessage.channel.send(
                `The admin command requires extra params`
              );
          }
        })
        .catch((err) => {
          Logger.error(err);
        });
      break;
    default:
      receivedMessage.channel.send(
        `I don't understand the command. Try '!help'`
      );
  }
}

function helpCommand(args, receivedMessage) {
  let command = args[0];
  if (command === "commands") {
    receivedMessage.channel.send(
      `Commands: !patch, !filter, !members, !rank, !join`
    );
  } else if (command === "join") {
    let msg = `*!join accept poeAccountName* - accepts the rules and wishes to join the guild see <#${process.env.DISCORD_RULES_CHANNEL_UID}>\n`;
    msg += `e.g '!join accept dalmation' - This is the name of your PoE account name **NOT** a character.\n`;
    receivedMessage.channel.send(msg);
  } else {
    receivedMessage.channel.send(
      `Try '!help join' or '!help commands' for a list of commands.`
    );
  }
}

module.exports = {
  processCommand,
};
