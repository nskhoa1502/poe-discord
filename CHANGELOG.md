# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1]
- Daily Stats Removed due to last_long removed.
- New way to invite users (cheaper more efficient).
- POESESSID removed from being a requirement due to the above changes.
- Added guildRulesChannelId to Config, was hardcoded.
- Removed rateLimit settings from users, and set it to the rateLimit of PoE API's

## [1.1.0]
- Moved config files to ENV_VARs

## [1.0.0] - 2019-02-24
### Released
- Bot has been released for others to use.
- Manages discord member roles to there roles in path of exile game
- Has daily statistics run to get cool features like create graphs of guild members online average over time.
- Saves latest character information and xp etc to the users profile
- Stores last_online, for scans if you implement a 'must be online' policy.