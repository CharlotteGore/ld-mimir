var gitCommand = require('./git-command.js');

module.exports = function (repoPath, callback){

  gitCommand('git rev-parse HEAD', repoPath, function (code, stdout, stderr){

    if (!code){
      callback(false, stdout, stderr);
    } else {
      callback(code, stderr);
    }

  });

}