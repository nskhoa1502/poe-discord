# Path of Exile / Discord Guild Management BOT

This is a Discord bot for Path of Exile Guild Management
We currently have about 3/4 of our guild currenty linked and it has assisted in automating recruitment.
Whilst some 'features' we added may of been accessible to those 'no linked' we disabled there ability to see it. (Such as not being in a ladder).

## How it works

The bot uses your configurations and polls the PoE Website every TTL interval (30minutes) by default and extracts a bunch of usefull information.
It then matches that information against linked discord accounts in the mongo collection and acts appropriately (adds/removes roles notifies people)
This is very opinionated on how your guild is run, but is highly customizable to do what *you* want.

## Important Changes in V1.1.0
- The bot_auth.json has been removed and replaced with environment variables.

Environment Variable | 
---------|
DISCORD_TOKEN | 


## Required Settings
- DISCORD_TOKEN are now stored as Environment Variables.
- config.json
    - guildProfileId (the numeric number that matches your guild).
    - timezone (e.g "Australia/Sydney")
    - currentLeague (Self-Explanatory) - E.g "Hardcore Synthesis"
    - welcomeMessage (Self-Explanatory)
    - refreshUsersTtl (this is how often you want the bot to refresh all character data, i use 30minutes, but depending on your server/capabilities you could make it less).
    - logLevel (if you feel you have issues can lower to debug/info, but I now have it stable at warn)
    - db { settings in here for mongo }
    - discord { settings for all discord ids/roles }


## Installation (Assumes you've got Discord BOT App already configured)
- Install NodeJS/NPM - Minimum I believe is like v8 nodejs
- Install mongodb
  - Create a DB and 3 collections, make them match config.json
- Update bot_auth.json
  - Retrieve your POESESSID from POE Website (use dev tools to locate or google it)
  - discordToken - required for your bot to connect [discord dev portal](https://discordapp.com/developers/docs/intro)
- Manage your Discord Server, Create the user roles 'Member', 'Officer', 'Ex-Member', 'Applied'.
  - Create a #member-log chat channel, as public as you care it to be, I use open to role 'Member'
  - Get the ID's of all these roles/channels and the Guild Owners ID
  - Check all settings listed below an dmake them be what you want.
- Set your timezone to match that of whom ever is setting up the bot to there  'PoE' timezone in the website. This makes dates/times match
- ** Above is required** even if it's UTC, because PoE add 'Z' to the end of the last_online, even though they actually are returned in local settigns time of the user.
- can't think of anything else..
- use node-forever or pm2 - and set up cron, you can set your  log level too if you have issues, to let me know.
- npm start  OR node src/app.js


## Features
- Create a database linking system for current guild members from there <accountName> -> <discordUid> on the guild service.
- Manages/Automates - 'Member', 'Officer', 'Applied', 'Ex-Member' roles.
- Syncs periodically with the poe website, and pulls in each users latest character details, and last_online including challenge.
- Notifies Guild Leader when a member leaves discord server, but is still in the guild and needs to be removed.
- Logs all new members and members who've left to a '#member-log' channel.
- Automates the joining process for new members who're request access. Using commands e.g. !join accept poeCharacterName
- Has a whois feature so you can see who someone in discord is in game and there details.
- Level 100 recording on characters, and date/times (with in the TTL period), used this for additional features of 'guild ladder'.
- Command !patch (Provides latest patch details directly to discord)
- Command !filter (Links to neversink @ filterblade) *Modifyable

## Removed Features due to changes in PoE Website.
- Creates a 'Daily Online' statistics for the guild.

## Additional features you could add to it
- Run a wikibot I used [PoEWikiBot](https://github.com/DrJam/PoEWikiBot) - but I have a modified version that has caching.
 

## Additional features *coming soon* (Not in this release)
### These are some of the extra I removed for the publication of this bot to give a baseline first. If enough interest, I may add them here, not just in my guild.
- 'Guild' Ladders for 'top 10' (like the PoE.API top 15,000) but just your guild
- 'Guild' Challenge Ladder (for top people in challenges, also attached cool Discord 'Roles' for top 10, 25, 50 etc...)


## Settings
Settings available in the **src/config.json** are:

Settings | Default Value | Description
---------|-------------- | ------------
guildProfileId | *required* | Numeric value of your guild, located on the /guilds/ poe website.
timezone | "Australia/Sydney" | required to match what the POESESSID users 'associated timezone with poe'
currentLeague | "Betrayal" | Modify it to what ever league is current, and your guild looks after (e.g. HC)'
welcomeMessage | "Welcome to [GuildName Here], if you're interested in joining please go to <#518369100867829792>for more details."| your welcome message that gets sent to the new person joining your discord server, the ID here is say your 'Welcome How to join channel ID'
refreshUsersTtl | 1800000 (30 minutes) | 
logLevel  | "warn" | 
commandStart | ! | Bot command it listens for, can change to what you want.
db.exileDbUrl | mongodb://localhost:27017/igExilesDB | Location of your mongoDB server (generally will be local)
db.exileDbName | igExilesDB | Mongo DB Name (make it what you want, but has to match the above url nb name)
db.currentExilesCollection | currentExiles | Storage(collection) name for current exiles
db.appliedExilesCollection | appliedExiles | Storage(collection) name for applied exiles
http.discord.rateLimit | 10 | Limit of calls to the discord server for role adjustments 250+ calls every 30minutes.
http.discord.rateInterval | 1000 | Interval the above limit can have. Set these to what your system can achieve
discord.guildUid | *required* | The Guilds Discord UID
discord.guildOwnerUid | *required* | Guild owner, so he can be notified when to remove members who leave discord server.
discord.membersLogChannel | *required* | channel created to send all log events for guild members who join/leave and discord leavers.
discord.roles.officerRole | *required* | Role ID of the Offcer in Discord
discord.roles.appliedRole | *required* | Role ID of the Applied in Discord
discord.roles.exMemberRole | *required* | Role ID of the Ex Member in Discord
discord.roles.memberRole | *required* | Role ID of the Member  in Discord
discord.roles.botAdminRole | *required* | Role ID of the BotAdminRole in Discord
