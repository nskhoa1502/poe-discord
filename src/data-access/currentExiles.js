const MongoDB = require("./mongoDb");
const currentExilesCollection = "currentExiles";

const create = async (exile) => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .insertOne(exile);
  } catch (e) {
    throw e;
  }
};

const bulkUpdate = async (exiles) => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .bulkWrite(exiles);
  } catch (e) {
    throw e;
  }
};

const bulkInsert = async (inGameExiles) => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .insertMany(inGameExiles);
  } catch (e) {
    throw e;
  }
};

const findAll = async () => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .find({})
      .toArray();
  } catch (e) {
    throw e;
  }
};

const findLinkedSortedByChallenges = async () => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .find({ discordUid: { $exists: true } })
      .sort({ challengesCompleted: -1 })
      .toArray();
  } catch (e) {
    throw e;
  }
};

const findOneByIgn = async (ign) => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .findOne({ id: { $regex: new RegExp(`^${ign}$`, "i") } });
  } catch (e) {
    throw e;
  }
};

const findOneByDiscordUid = async (discordUid) => {
  if (!/^\d+$/.test(discordUid)) {
    return;
  }

  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .findOne({ discordUid: discordUid });
  } catch (e) {
    throw e;
  }
};

const deleteByDiscordUid = async (discordUid) => {
  if (!/^\d+$/.test(discordUid)) {
    return;
  }

  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .deleteOne({ discordUid: discordUid });
  } catch (e) {
    throw e;
  }
};

const deleteOneById = async (id) => {
  try {
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .deleteOne({ id: id });
  } catch (e) {
    throw e;
  }
};

const createLink = async (ignId, discordUid, discordUsername) => {
  try {
    let select = { id: ignId };
    let update = {
      $set: {
        discordUid: discordUid,
        discordUsername: discordUsername,
        linkDate: new Date(),
      },
    };
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .updateOne(select, update);
  } catch (e) {
    throw e;
  }
};

const updateOneIgCharacter = async (discordUid, inGameCharactersArray) => {
  try {
    let select = { discordUid: discordUid };
    let update = {
      $set: {
        inGameCharacters: inGameCharactersArray,
      },
    };
    return await MongoDB.getDB()
      .collection(currentExilesCollection)
      .updateOne(select, update, { new: true });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  deleteOneById,
  deleteByDiscordUid,
  findLinkedSortedByChallenges,
  findOneByDiscordUid,
  findOneByIgn,
  findAll,
  createLink,
  create,
  bulkUpdate,
  bulkInsert,
  updateOneIgCharacter,
};
