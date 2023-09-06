const PoeHttp = require('../http-access/poeHttp');
const cheerio = require('cheerio');
const Logger = require('../logger').getLogger();

function printLatestPatchNotes(receivedMessage) {
  PoeHttp.getPatchNotes().then(htmlBody => {
    const $ = cheerio.load(htmlBody);
    const thread = $('table.forumTable td .title a').eq(0);
    const title = thread.text().trim();
    const url = 'https://www.pathofexile.com' + thread.attr('href');
    receivedMessage.channel.send('Latest POE Patch Version is : ' + title);
    receivedMessage.channel.send(url);
  }).catch(err => {
    Logger.error(err);
  });
}

module.exports = {
  printLatestPatchNotes
}