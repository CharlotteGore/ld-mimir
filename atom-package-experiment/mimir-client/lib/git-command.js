var spawn = require('child_process').spawn;

module.exports = function (cmd, cwd, callback){

  var stdout = "";
  var stderr = "";

  var exec = spawn('/bin/sh', ['-c', cmd], { 
    cwd : cwd
  });

  exec.stdout.on('data', function (data){
    stdout += '' + data
  });

  exec.stderr.on('data', function (data){
    stderr += '' + data
  });

  exec.on('close', function (code) {

    callback(code, stdout, stderr);

  });

}