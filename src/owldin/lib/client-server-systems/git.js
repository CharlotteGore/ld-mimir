module.exports = function (repoPath){

  var repo = require('./git/git-repo.js')(process.env.PROJECT_DIR);

  return {

    close : function (){

      // nothing

    },
    handlers : {

      'git-status' : function (msg, conn){

        repo.status(function (err, status){

          conn.write(JSON.stringify({
            'git-status' : {
              id : msg.id,
              packet : status
            }
          }));

        });
      },

      'git-commit' : function (msg, conn){

        repo.commit(msg.msg, msg.stage, function (err, status){

          conn.write(JSON.stringify({
            'git-commit' : {
              id : msg.id,
              packet : status
            }

          }));

        });

      },

      'git-push' : function (msg, conn){

        repo.push(function (err, stdout, stderr){

          conn.write(JSON.stringify({
            'git-push' : {
              id : msg.id,
              packet : {
                out : stdout,
                err : stderr
              }
            }
          }))

        })

      },

      'project-build' : function (msg, conn){

        repo.build(function (err, stdout, stderr){

          conn.write(JSON.stringify({
            'project-build' : {
              id : msg.id,
              packet : {
                out : stdout,
                err : stderr
              }
            }
          }))

        })

      },

      'build-patch' : function (patch, conn){

        repo.buildPatch(patch, function (err, status){

          console.log(status);

          conn.write(JSON.stringify({
            'build-patch' : {
              success : !err,
              result : status
            }
          }))

        })
      },

      'get-head-hash' : function (msg, conn){

        repo.revParse(function (err, hash){

          console.log(err, hash);

          conn.write(JSON.stringify({
            'head-hash' : {
              hash : hash
            }
          }));

        });

      },

      'apply-bundle' : function (bundle, conn){

        repo.applyBundle(bundle, function (err, status){

          console.log(status);

          conn.write(JSON.stringify({
            'apply-bundle' : {
              success : !err,
              result : status
            }
          }))

        });

      }

    }
  }
}