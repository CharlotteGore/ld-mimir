var path = require('path');

var gitStatus = require('./git-status.js');
var gitCommit = require('./git-commit.js');
var gitPush = require('./git-push.js');
var gitBuild = require('./project-build.js');
var buildPatch = require('./build-patch.js');
var gitRevParse = require('./git-rev-parse.js');
var applyBundle = require('./git-bundle.js');

module.exports = function (repoPath){

  return {
    status : function (callback){
      return gitStatus(repoPath, callback);
    },
    commit : function (msg, list, callback){
      return gitCommit(repoPath, msg, list, callback);
    },
    push : function (callback){
      return gitPush(repoPath, callback);
    },
    build : function (callback){
      return gitBuild(repoPath, callback);
    },
    buildPatch : function (patch, callback){
      return buildPatch(patch, repoPath, callback)
    },
    revParse : function (callback){
      return gitRevParse(repoPath, callback);
    },
    applyBundle : function (bundle, callback){
      return applyBundle(bundle, repoPath, callback);
    }
  }

}