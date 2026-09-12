// Bundle MusicXML (.mxl) scores as assets for the built-in catalogue.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('mxl');

module.exports = config;
