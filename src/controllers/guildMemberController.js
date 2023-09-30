require("dotenv").config();
const cheerio = require("cheerio");
const Logger = require("../logger").getLogger();
const CurrentExile = require("../data-access/currentExiles");
const _ = require("lodash");
const CurrentExilesService = require("../services/currentExilesService");
const valvelet = require("valvelet");
const DiscordHelper = require("../discordHelper");

require("events").EventEmitter.prototype._maxListeners = 250;

const PoeHttp = require("../http-access/poeHttp");

const challengesGoldRole = process.env.CHALLENGES_GOLD_ROLE_UID;
const challengesSilverRole = process.env.CHALLENGES_SILVER_ROLE_UID;
const challengesBronzeRole = process.env.CHALLENGES_BRONZE_ROLE_UID;

let currentMemberLength, memberExecuter;

function scrapeGuildMembers() {
  PoeHttp.getGuildProfile()
    .then((body) => {
      const $ = cheerio.load(body);
      const igExileNames = [];

      $("div.members div.member").each((idx, element) => {
        const $profile = $(element).find("span.profile-link a");
        const $memberType = $(element).find("span.memberType");

        let completedChallenges = 0;
        try {
          const $challengesCompletedText = $(element)
            .find("span.profile-link.challenges-completed")
            .attr("class");
          completedChallenges = parseInt(
            $challengesCompletedText
              .substr(
                $challengesCompletedText.indexOf(" completed") +
                  " completed".length
              )
              .trim()
          );
          // completedChallenges = parseInt($challengesCompletedText.substr(43, 2).trim());
        } catch (err) {
          Logger.debug(
            `challenges-completed class not found for ${$profile.text()} - defaulting to 0.`
          );
        }

        let exile = {
          id: $profile.text(),
          challengesCompleted: completedChallenges,
          memberType: $memberType.text(),
        };

        if (exile.id) {
          igExileNames.push(exile);
        }
      });

      currentMemberLength = igExileNames.length;

      // If no exiles are found it means that there's an error with the website.
      if (igExileNames.length > 0) {
        Logger.info(`## UPDATING IN GAME EXILES ROUTINE`);
        updateInGameExiles(igExileNames);
      } else {
        Logger.warn(
          `PoE Website may be down, unable to scrape/update guild members/stats, maybe authentication?`
        );
      }

      setNextTimeOutPeriod();
    })
    .catch((err) => {
      Logger.error(
        `GuildMemberController::Error loading PoE guild site likely down for maintenance. - ${err.message}`
      );
      setNextTimeOutPeriod();
    });
}

function setNextTimeOutPeriod() {
  clearTimeout(memberExecuter);
  memberExecuter = setTimeout(
    scrapeGuildMembers,
    process.env.REFRESH_USERS_TTL
      ? parseInt(process.env.REFRESH_USERS_TTL)
      : 3600000
  );
}

let completedRequests = 0;
function getExileCharacterDetails(inGameExiles) {
  completedRequests = 0;
  return new Promise((resolve) => {
    for (let i = 0; i < inGameExiles.length; i++) {
      setTimeout(() => {
        executeGetCharacterCall(inGameExiles[i], inGameExiles, resolve);
      }, 5000);
    }
  });
}

function executeGetCharacterCall(exile, inGameExiles, resolve) {
  //Temp remove character calls as we don't actually need/use them at the moment.
  resolve(inGameExiles);
  return;

  // PoeHttp.getAccountCharacters(exile.id)
  //   .then((charactersJson) => {
  //     exile.characters = charactersJson;
  //     // console.log(charactersJson);
  //   })
  //   .catch((err) => {
  //     if (err.statusCode === 403) {
  //       Logger.debug(
  //         `## (${err.statusCode}) Forbidden (Private Profile) when looping character info for id ${exile.id}`
  //       );
  //     } else {
  //       Logger.warn(
  //         `## Error(${err.statusCode}) when looping character info for id ${exile.id}`
  //       );
  //     }
  //   })
  //   .then(() => {
  //     completedRequests++;
  //     if (completedRequests >= inGameExiles.length) {
  //       Logger.info(
  //         `## All character requests now completed - resolving promise.`
  //       );
  //       resolve(inGameExiles);
  //     }
  //   });
}

// List of users from website as param.
function updateInGameExiles(inGameExiles) {
  getExileCharacterDetails(inGameExiles).then((igExiles) => {
    CurrentExilesService.getCurrentMembersOrCreateIfDoesntExist(igExiles).then(
      (result) => {
        if (!result) return;

        // console.log(result);

        let igExileUsers = igExiles.map((val) => val.id); // (LATEST GUILD MEMBERS FROM WEBSITE)
        let databaseExiles = result.map((val) => val.id); // (CURRENT GUILD MEMBERS FROM OUT DB)
        let newExiles = igExileUsers.filter(
          (val) => !databaseExiles.includes(val)
        ); // (NEW RECRUITS)
        let exiledExiles = result.filter(
          (val) => !igExileUsers.includes(val.id)
        ); // (MEMBERS WHO'VE LEFT)
        let exiledExilesAsIds = exiledExiles.map((val) => val.id);
        let currentExiles = igExiles.filter((val) =>
          databaseExiles.includes(val.id)
        );

        Logger.info(`# NEW EXILES: (${newExiles.length}) : ${newExiles}`);
        Logger.info(
          `# EXILED EXILES: (${exiledExiles.length}) : ${exiledExilesAsIds}`
        );
        Logger.info(`# CURRENT EXILES: (${currentExiles.length}) `);

        updateMemberRoster(newExiles, exiledExiles)
          .then(() => {
            // Member roster now updated, now update everyones character / time details.
            if (_.size(currentExiles) > 0) {
              CurrentExilesService.updateLastOnlineTimeAndChallenges(
                currentExiles
              ).then(() => {
                CurrentExilesService.updateCharactersForUsers(
                  currentExiles,
                  result
                );

                let linkedExiles = result.filter((val) => val.discordUid);
                linkedExiles = linkedExiles.filter(
                  (val) => !exiledExilesAsIds.includes(val.id)
                );
                linkedExiles.sort(
                  (a, b) => b.challengesCompleted - a.challengesCompleted
                );
                linkedExiles.forEach((e) => {
                  maintainLinkedDiscordRoles(linkedExiles, e);
                });
                Logger.info(
                  `UpdateLastOnlineTimeAndChallenges completed, character updates completed, all requests to discord to update roles sent.`
                );
              });
            }
          })
          .catch((err) => {
            Logger.error(`Error when updating memberRoster - ${err.message}`);
          });
      }
    );
  });
}

async function updateMemberRoster(newExiles, exiledExiles) {
  if (_.size(newExiles) > 0) {
    let newExiledObj = newExiles.map((m) => ({ id: m }));
    return await CurrentExile.bulkInsert(newExiledObj).then(async () => {
      notifyDiscordChannel(newExiles, true);
      await CurrentExilesService.actionMemberLinking(newExiles);

      if (_.size(exiledExiles) > 0) {
        return await CurrentExilesService.removeExilesAndRoles(
          exiledExiles
        ).then(() => {
          notifyDiscordChannel(exiledExiles, false);
        });
      }
    });
  }

  if (_.size(exiledExiles) > 0) {
    return await CurrentExilesService.removeExilesAndRoles(exiledExiles).then(
      () => {
        notifyDiscordChannel(exiledExiles, false);
      }
    );
  }
}

/**
 * Rate Limited Function
 * Defaults: 10 requests, per 1 second period. (see config.discord)
 * Can be setup in config
 * @param {} accountName
 */
const discordRateLimit = process.env.DISCORD_RATE_LIMIT
  ? parseInt(process.env.DISCORD_RATE_LIMIT)
  : 10;
const discordRateInterval = process.env.DISCORD_RATE_INTERVAL
  ? parseInt(process.env.DISCORD_RATE_INTERVAL)
  : 1000;

const maintainLinkedDiscordRoles = valvelet(
  updateGuildMemberRoles,
  discordRateLimit,
  discordRateInterval,
  250
);
const incrementChallengeLimit = 5;
let errorFetchedForUserIgnoreList = [];
function updateGuildMemberRoles(linkedExiles, linkedExile) {
  let sliceTop5 = linkedExiles.slice(0, incrementChallengeLimit);
  sliceTop5 = CurrentExilesService.incrementBasedOnArrayPos(
    sliceTop5,
    linkedExiles,
    sliceTop5[sliceTop5.length - 1],
    linkedExiles[sliceTop5.length]
  );

  let sliceTop10 = linkedExiles.slice(
    sliceTop5.length,
    sliceTop5.length + incrementChallengeLimit
  );
  sliceTop10 = CurrentExilesService.incrementBasedOnArrayPos(
    sliceTop10,
    linkedExiles,
    sliceTop10[sliceTop10.length - 1],
    linkedExiles[sliceTop10.length]
  );

  let sliceTop15 = linkedExiles.slice(
    sliceTop10.length,
    sliceTop10.length + incrementChallengeLimit
  );
  sliceTop15 = CurrentExilesService.incrementBasedOnArrayPos(
    sliceTop15,
    linkedExiles,
    sliceTop15[sliceTop15.length - 1],
    linkedExiles[sliceTop15.length]
  );

  DiscordHelper.getGuild()
    .members.fetch(linkedExile.discordUid)
    .then((guildMember) => {
      DiscordHelper.DiscordFileLog.debug(
        `PoE Account: ${linkedExile.id} Discord: ${linkedExile.discordUsername}/${linkedExile.discordUid} member fetched - validating/verifying user permissions/roles now.`
      );

      var modifyRolePromise = new Promise(function (resolve, error) {
        let addRole;
        let removeRoles = [
          challengesGoldRole,
          challengesSilverRole,
          challengesBronzeRole,
        ];
        // 1007585308755361835 209127429170528256
        if (sliceTop5.indexOf(linkedExile) !== -1) {
          addRole = challengesGoldRole;
          removeRoles.splice(0, 1);
        } else if (sliceTop10.indexOf(linkedExile) !== -1) {
          addRole = challengesSilverRole;
          removeRoles.splice(1, 1);
        } else if (sliceTop15.indexOf(linkedExile) !== -1) {
          addRole = challengesBronzeRole;
          removeRoles.splice(2, 1);
        }

        DiscordHelper.DiscordFileLog.debug(
          `## Challenge Role Changes for Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Adding Role: ${addRole}, Removing roles: ${removeRoles}`
        );

        if (addRole) {
          guildMember.roles
            .add(addRole)
            .then((gm) => {
              gm.roles
                .remove(removeRoles)
                .catch((err) => {
                  DiscordHelper.DiscordFileLog.error(
                    `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Failed to remove roles ${removeRoles} - ${err}`
                  );
                })
                .then(() => {
                  resolve();
                });
            })
            .catch((err) => {
              DiscordHelper.DiscordFileLog.error(
                `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Failed to add role(${addRole}), likely now skipped the removal of challenge roles -  ${err}`
              );
              resolve();
            });
        } else {
          guildMember.roles
            .remove(removeRoles)
            .catch((err) => {
              DiscordHelper.DiscordFileLog.error(
                `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Error removing roles ${removeRoles} -  ${err}`
              );
            })
            .then(() => {
              resolve();
            });
        }
      });

      modifyRolePromise
        .then(() => {
          // Manage Officer Roles...
          let hasOfficerRoleDiscord = guildMember.roles.cache.has(
            DiscordHelper.getRoles().officerRole
          );
          let hasMemberRoleDiscord = guildMember.roles.cache.has(
            DiscordHelper.getRoles().memberRole
          );
          let hasExMemberRoleDiscord = guildMember.roles.cache.has(
            DiscordHelper.getRoles().exMemberRole
          );

          if (
            (linkedExile.memberType === "Officer" ||
              linkedExile.memberType === "Leader") &&
            !hasOfficerRoleDiscord
          ) {
            DiscordHelper.DiscordFileLog.info(
              `Exile Officer Detected, with no discord role - attempting to add it for user ${linkedExile.discordUsername}`
            );
            guildMember.roles
              .add(DiscordHelper.getRoles().officerRole)
              .catch((err) => {
                DiscordHelper.DiscordFileLog.error(
                  `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Failed to add officer role - ${err}`
                );
              });
          }

          if (
            (linkedExile.memberType === "Member" ||
              linkedExile.memberType === "Initiate") &&
            hasOfficerRoleDiscord
          ) {
            DiscordHelper.DiscordFileLog.warn(
              `Exile Member Detected, with officer discord role - need to remove it from user ${linkedExile.discordUsername}`
            );
            guildMember.roles
              .remove(DiscordHelper.getRoles().officerRole)
              .catch((err) => {
                DiscordHelper.DiscordFileLog.error(
                  `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Failed to remove officer role - ${err}`
                );
              });
          }

          if (
            linkedExile.memberType === "Member" ||
            linkedExile.memberType === "Officer" ||
            linkedExile.memberType === "Leader" ||
            linkedExile.memberType === "Initiate"
          ) {
            if (!hasMemberRoleDiscord) {
              DiscordHelper.DiscordFileLog.warn(
                `Exile Member Detected, missing member discord role - need to add it to user ${linkedExile.discordUsername}`
              );
              guildMember.roles
                .add(DiscordHelper.getRoles().memberRole)
                .catch((err) => {
                  DiscordHelper.DiscordFileLog.error(
                    `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Failed to add member role - ${err}`
                  );
                });
            }
            if (hasExMemberRoleDiscord) {
              DiscordHelper.DiscordFileLog.warn(
                `Exile Member Detected, still has old ex-member discord role - need to remove it from user ${linkedExile.discordUsername}`
              );
              guildMember.roles
                .remove(DiscordHelper.getRoles().exMemberRole)
                .catch((err) => {
                  DiscordHelper.DiscordFileLog.error(
                    `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Failed to remove ex-member role - ${err}`
                  );
                });
            }
          }
        })
        .catch((err) => {
          DiscordHelper.DiscordFileLog.log(
            `Discord User (${linkedExile.discordUsername}) - ${linkedExile.discordUid} - Error in role promise  adjustment - ${err}`
          );
        });
    })
    .catch((err) => {
      if (
        errorFetchedForUserIgnoreList.indexOf(linkedExile.discordUid) === -1
      ) {
        DiscordHelper.DiscordFileLog.warn(
          `Failed to fetch PoE Account: ${linkedExile.id}, Discord: ${linkedExile.discordUsername}/${linkedExile.discordUid} - ${err}, likely left the discord channel but not guild in game.`
        );
        // DiscordHelper.sendMessageToMembersLogChannel(
        //   `Failed to fetch PoE Account: ${linkedExile.id}, Discord: ${linkedExile.discordUsername}/${linkedExile.discordUid} - ${err}, likely left the discord channel but not guild in game.`
        // );
        errorFetchedForUserIgnoreList.push(linkedExile.discordUid);
      }
    });
}

// newFlag - decides if it's 'a 'new' or 'removed' user.
function notifyDiscordChannel(exiles, newFlag) {
  if (exiles.length < 1) {
    return;
  }

  let exilesStringed = "";
  exiles.forEach((e) => {
    exilesStringed = exilesStringed + (newFlag ? `+ ${e}` : `- ${e.id}`) + "\n";
  });

  let message = "```diff\n" + exilesStringed + "```";
  DiscordHelper.sendMessageToMembersLogChannel(message);
}

module.exports = {
  currentMemberLength,
  memberExecuter,
  scrapeGuildMembers,
};
