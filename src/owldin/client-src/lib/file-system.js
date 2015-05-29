var request = require('browser-request');
var Gather = require('gm-gather');
var cloneDeep = require('clone-deep');
var path = require('path')

var console = require('../components/console.js');

module.exports.initialiseFileSystem = function initialiseFileSystem (app, vfsRoot, artifactsVFSRoot){

  var system = new (require('events')).EventEmitter;

  // global application events... 
  app.on('remote-entity-update', function (msg){

    app.emit('entity-updated', 'update', msg.path);

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });

  });

  app.on('remote-entity-rename', function (msg){

    app.emit('entity-renamed', 'rename', msg.path, msg.oldPath);

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });


  })

  app.on('remote-entity-create', function (msg){

    app.emit('entity-updated', 'create', msg.path);

    // you know, 

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });

  });

  app.on('remote-entity-delete', function (msg){

    app.emit('entity-updated', 'delete', msg.path);

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });

  });


  // our internal data structure...
  var data = {
    entities : [],
    children : {
      root : {
        entities : [],
        name : "Project root",
        relPath : "/",
        href : vfsRoot + "/",
        children : {},
        parent : false
      }
    }
  };

  var entityLookup = {};

  system.getURI = function getURI (pathName){

    return vfsRoot + pathName;

  } 

  system.getArtifactURI = function getArtifactURI (pathName){

    return artifactsVFSRoot + pathName;

  }

  system.readFile = function readFile (pathName, fn){

    var entity = entityLookup[pathName];

    // technically if this doesn't exist...

    if (!entity){ // doesn't exist?
      var parentPath = path.join(path.dirname(pathName), '/');
      //parent = entityLookup[parentPath];

      entity = {
        parent : parentPath,
        href : vfsRoot + pathName,
        mime : '',
        size : 0,
        mtime : 0
      }
    }

    request(entity.href, function (err, response){

      //var headers = response.getAllResponseHeaders();

      if (!err){

        var body = response.body;

        request(vfsRoot + entity.parent, function (err, response){

          if (!err && (response.status === 200 || response.status === 304)){
            var meta = JSON.parse(response.body);
            for (var i = 0; i < meta.length; i++){
              if (meta[i].name === entity.name){
                entity.mime = meta[i].mime;
                entity.size = meta[i].size;
                entity.mtime = meta[i].mtime;
                fn (false, entity, body);
                break;
              }
            }
          } else {
            fn (err, entity);
          }

        });

      } else {
        fn (err, entity);
      }

    });

  };

  system.readFileAsBase64 = function readFileAsBase64 (pathName, fn){

    var entity = entityLookup[pathName];

    // have to go grizzly for this...

    var xhr = new XMLHttpRequest();
    xhr.open('GET', entity.href, true);
    xhr.responseType = 'blob';
    xhr.onload = function (){

      var blob = xhr.response;
      var body = URL.createObjectURL(blob);

      request(vfsRoot + entity.parent, function (err, response){

        if (!err){
          var meta = JSON.parse(response.body);
          for (var i = 0; i < meta.length; i++){
            if (meta[i].name === entity.name){
              entity.mime = meta[i].mime;
              entity.size = meta[i].size;
              entity.mtime = meta[i].mtime;
              fn (false, entity, body);
              break;
            }
          }
        } else {
          fn (err, entity);
        }

      });

    }
    xhr.onerror = function (){
      fn (response.status, entity);
    }

    xhr.send();

  }



  system.writeFile = function writeFile(pathName, body, fn){

    var entity = entityLookup[pathName];

    if (entity){

      request.put({ uri : entity.href, body : body}, function (err, response){
        if (!err){
          fn (false, entity);
          app.emit('entity-updated', 'update', pathName);
        } else {
          fn (err);
        }
      });

    } else {

      var entity = {
        href : vfsRoot + pathName,
        parent : path.dirname(pathName) + "/"
      }

      request.put({ uri : vfsRoot + pathName, body : body}, function (err, response){
        if (!err){

          var p = pathName.split('/'); var name = p.pop(); p.shift(); 
          var folder = "/" + p.join('/');

          if (!/\/$/.test(folder)){
            folder += "/";
          }

          request.get(vfsRoot + folder, function (err, response){

            var ref = getDirectoryReference(folder);

            var body = JSON.parse(response.body);

            for (var i = 0; i < body.length; i++){
              if (body[i].name === name){
                entity.name = body[i].name;
                entity.size = body[i].size;
                entity.mime = body[i].mime;
                entity.mtime = body[i].mtime;
                break;
              }
            }

            entityLookup[pathName] = entity;

            ref.entities.push(entity);

            fn (false, entity);
            app.emit('sync', data.children.root.relPath);
            app.emit('entity-updated', 'update', pathName);


          });


        } else {
          fn (err);
        }

      });

    }

  };

  system.renameFile = function renameFile (pathName, newName, fn){

    var entity = entityLookup[pathName];

    var oldPath = entity.relPath;
    var newPath = entity.href.replace(entity.name, newName);

    request({ method: 'POST', url : newPath, json : { renameFrom : oldPath }}, function (err, response, body){
      // load new metadata... 
      if (response.status === 200){
        var newEntity = cloneDeep(entity);
        newEntity.relPath = newPath.replace(vfsRoot, '');
        newEntity.href = newPath;
        newEntity.name = newName;

        delete entityLookup[pathName];

        entityLookup[newEntity.relPath] = newEntity;

        fn (false, newEntity, entity);
      } else {
        fn (err);
      }
      //fn(err, newName, entity.name );

    });
  };

  system.deleteFile = function deleteFile (pathName, fn){

    var entity = entityLookup[pathName];

    request({ method : 'delete', url : entity.href}, function (err, response){

      fn(err);

    })

  };

  system.readFolder = function readFolder (pathName, fn){

  };

  system.writeFolder = function writeFolder (pathName, newFolderName, fn){

    var entity = entityLookup[pathName];

    var newPath = entity.href + "/" + newFolderName + "/";

    request({ method: 'put', url : newPath}, function (err, response){

      fn (err, newFolderName);

    });

  };

  system.createFile = function writeFolder (pathName, newFileName, fn){

    var entity = entityLookup[pathName];

    var newPath = entity.href + "/" + newFileName;

    request({ method: 'put', url : newPath}, function (err, response){

      fn (err, newFileName);

    });

  };

  system.renameFolder = function renameFolder (path, newName, fn){

    var entity = entityLookup[pathName];

    var newPath = entity.href.replace(entity.name + "/", newName);
    var oldPath = entity.relPath;

    request({ method : 'POST', url : newPath, json : {renameFrom : oldPath}}, function (err, response, body){
      fn (err, newName, entity.name);
    });
/*
  var uri = currentPath.replace(oldFolderName, newFolderName);

  var oldUri = currentPath.replace(vfsRoot, '');

  request({ method: 'POST', url: uri, json : { renameFrom : oldUri}}, function (err, response, body){
    loadDirectory(activeDirectory);
  });
*/

  };

  system.deleteFolder = function deleteFolder (pathName, fn){

    var entity = entityLookup[pathName];

    request({ method : 'delete', url : entity.href}, function (err, response){

      fn(err);

    });

  };

  system.getAll = function getAll(fn){

    function getContents (node, contents){

      for (var folder in node.children){
        if (node.children.hasOwnProperty(folder)){
          var folderObject = {
            type : 'folder',
            name : node.children[folder].name,
            path : node.children[folder].relPath,
            contents : []
          } 
          contents.push(folderObject);
          getContents(node.children[folder], folderObject.contents);
        }
      }

      for (var i = 0; i < node.entities.length; i++){

        contents.push({
          type : 'file',
          name : node.entities[i].name,
          path : node.entities[i].href.replace(vfsRoot, ''),
          mime : node.entities[i].mime,
          mtime : node.entities[i].mtime,
          size : node.entities[i].size,
          parent : node.relPath
        });

      }

    }

    var tree = [];

    getContents(data, tree);

    fn(tree);

  };

  // however we're doing to load the entire file system in now.

  function loadFileSystem (pathName, fn){

    request(pathName, function (err, response, body){

      if (!err){

        if (response.getResponseHeader('Content-Type') === "application/json"){
          body = JSON.parse(body);
        }

        //directoryCache[activeDirectory] = body;

        updateFileSystem(pathName, body);
  
        var pointer = getDirectoryReference(pathName);

        var gatherer = new Gather();

        var childCount = 0;

        for (var child in pointer.children){
          if (pointer.children.hasOwnProperty(child)){
            childCount ++;
            gatherer.task((function (href){

              return function (done, error){

                loadFileSystem(href, function (err){

                  if (!err){

                    done();

                  } else {

                    error(err);

                  }

                });

              };

            })(pointer.children[child].href));

          }
        }

        if (childCount > 0){
          gatherer.run(function (err){
            if (err){
              fn(err);
            } else {
              fn(false);
            }

          });
        } else {
          fn (false);
        }

        //renderCurrentDirectory(reference);

      } else {
        fn (err);
      }

    });
  };

  loadFileSystem(data.children.root.href, function (err){

    if (!err){

      console.log('Remote file system synchronised');

      app.emit('sync', data.children.root.relPath);

    } else {

      app.emit('sync-error', 'Unable to synchronise with remote file system', err);

    }

  });

  function getDirectoryReference (pathName){
      // pop off the first and last

    pathName = pathName.replace(vfsRoot, '');

    var pathChunks = pathName.split('/');
    var pointer = data;

    pathChunks.shift(); 
    pathChunks.pop();
    pathChunks.unshift('root');

    pathChunks.forEach(function (chunk){
      if (pointer.children[chunk]){
        pointer.children[chunk].parent = pointer;
        pointer = pointer.children[chunk];
      } else {
        throw new Error('omg');
      }
    });

    return pointer;

  }

  function updateFileSystem(pathName, entities){

    // Okay the objective here is to get all the changes...

    var pointer = getDirectoryReference(pathName);

    var currentEntities = pointer.entities.splice(0, pointer.entities.length);

    currentEntities.forEach(function (entity){

      delete entityLookup[entity.relPath];

    });

    entities.forEach(function (entity){
      if (entity.mime === "inode/directory"){
        if (!pointer.children[entity.name] && entity.name.substr(0, 1) !== "."){
          pointer.children[entity.name] = {
            name : entity.name,
            href : entity.href,
            relPath : entity.href.replace(vfsRoot, ''),
            entities : [],
            children : {}
          }
          // create a lookup by path...
          entityLookup[pointer.children[entity.name].relPath] = pointer.children[entity.name];
        }
      } else if (entity.name.substr(0,1) !== ".") {

        // create a relpath..
        entity.relPath = entity.href.replace(vfsRoot, '');
        entity.parent = pathName.replace(vfsRoot, '');
        // create a lookup by relpath.. 
        entityLookup[entity.relPath] = entity;

        // add it as an entity
        pointer.entities.push(entity);

      }
      
    });


    // check for any folders that have been removed..
    for (var child in pointer.children){
      if (pointer.children.hasOwnProperty(child)){
        var exists = false;
        entities.forEach(function (entity){
          if (entity.name === child){
            exists = true;
          }
        });
        if (!exists){
          delete pointer.children[child];
        }
      }
    }

    entityLookup['/'] = data.children.root;
  }

  return system;

}



/*

  - Status one: Nothing is loaded.
  - Status two: 

*/