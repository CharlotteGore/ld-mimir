var gitCommand = require('./git-command.js');
var fs = require('fs');
var path = require('path')

module.exports = function (bundle, repoPath, callback){

  // okay first of all we need to do a hard reset... 

  var writeOutTheBundle = function (){

      var buffer = new Buffer(bundle.data);

      fs.writeFile('/tools/commits.bundle', buffer, function (err){

        if (!err){
          console.log('done');
          verifyTheBundle();
          return;
        }

        callback(true, 'writing the bundle failed');


      });
  }

  var verifyTheBundle = function (){

    gitCommand('git bundle verify /tools/commits.bundle', repoPath, function (code, stdout, stderr){

      if (!code){
        fetchTheBundle();
        return
      }

      callback(true, 'Bundle verification failed. Cannot apply');

    })

  } 

  var fetchTheBundle = function (){

    gitCommand('git fetch /tools/commits.bundle master:incoming', repoPath, function (code, stdout, stderr){

      if (!code){
        rebaseTheBranch();
        return
      }

      callback(true, 'Fetching the bundle failed. Cannot proceed');

    })

  }

  var rebaseTheBranch = function (){

    gitCommand('git rebase incoming', repoPath, function (code, stdout, stderr){

      if (!code){
        deleteTheIncomingBranch();
        return;
      }

      callback(true, 'Rebasing failed. Bundle cant be applied');

    })

  }

  var deleteTheIncomingBranch = function (){

    gitCommand('git branch -d incoming', repoPath, function (code, stdout, stderr){

      if (!code){
        callback(false, 'Success!')
        return
      }

      callback(true, 'Success, but unable to clean up afterwards. Future commits may fail.');

    })

  }

  var resetGit = function (){

    gitCommand('git reset --hard', repoPath, function (code, stdout, stderr){

      if (!code){
        writeOutTheBundle();
        return;
      }

      callback(true, 'resetting git failed');

    })

  }

  resetGit();

}