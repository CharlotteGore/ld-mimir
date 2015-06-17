var gitCommand = require('./git-command.js');
var fs = require('fs');
var path = require('path')

module.exports = function (patch, repoPath, callback){

  // okay first of all we need to do a hard reset... 

  var writeOutThePatch = function (){

      fs.writeFile('/tools/.patch.tmp', patch, function (err){

        if (!err){
          applyThePatch();
          return;
        }

        callback(true, 'writing the patch failed');


      });
  }

  var resetGit = function (){

    gitCommand('git reset --hard', repoPath, function (code, stdout, stderr){

      if (!code){
        writeOutThePatch();
        return;
      }

      callback(true, 'resetting git failed');

    })

  }

  var applyThePatch = function (){

    gitCommand('git apply /tools/.patch.tmp', repoPath, function (code, stdout, stderr){

      if (!code){
        runTheBuild();
        return
      }

      callback(true, 'applying the patch failed');

    })

  }

  var runTheBuild = function (){

    gitCommand('makeless', repoPath, function (code, stdout, stderr){

      if (!code){
        callback(false, 'success');
        return

      }

      callback(true, 'building failed')

    })

  }

  resetGit();

}