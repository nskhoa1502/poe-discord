const MongoDB = require("./mongoDb");
const appliedExilesCollection = "appliedExiles";

const create = async (exile) => {
  return await MongoDB.getDB()
    .collection(appliedExilesCollection)
    .insertOne(exile);
};

const findAll = async () => {
  return await MongoDB.getDB()
    .collection(appliedExilesCollection)
    .find({})
    .toArray();
};

const findOneByDiscordUid = async (discordUid) => {
  return await MongoDB.getDB()
    .collection(appliedExilesCollection)
    .findOne({ discordUid: discordUid });
};

const findOneByIgn = async (ign) => {
  return await MongoDB.getDB()
    .collection(appliedExilesCollection)
    .findOne({ ignAccountName: { $regex: new RegExp(`^${ign}$`, "i") } });
};

const deleteByDiscordUid = async (discordUid) => {
  // if (!/^\d+$/.test(discordUid)) {
  //   console.log(`from deletebyDiscordUid func`, discordUid);
  //   return;
  // }
  console.log(discordUid);
  const extractDiscordUidNumber = /(\d+)/;
  const discordUidNumb = discordUid.match(extractDiscordUidNumber);
  return await MongoDB.getDB()
    .collection(appliedExilesCollection)
    .deleteOne({ discordUid: discordUidNumb });
};

const deleteByIgn = async (accountName) => {
  return await MongoDB.getDB()
    .collection(appliedExilesCollection)
    .deleteOne({
      ignAccountName: { $regex: new RegExp(`^${accountName}$`, "i") },
    });
};

module.exports = {
  deleteByDiscordUid,
  findOneByDiscordUid,
  deleteByIgn,
  findAll,
  findOneByIgn,
  create,
};
