/*
  
  Simple wrapper around ACE. It triggers 'save' signals and can only edit one thing at once.
  Something else needs to deal with updating this.

*/

var ace = require('brace');
require('brace/mode/json');
require('brace/mode/javascript');
require('brace/mode/markdown');
require('brace/theme/monokai');

var dom = require('green-mesa-dom');

module.exports = function (app, contentView){

  var emitter = new (require('events')).EventEmitter();

  var skosser = require('./skos.js')(app);

  var $element = dom('<div></div>');

  $element.css({
    display : 'none',
    width : contentView.size().x + "px",
    height : contentView.size().y + "px",
    position: 'absolute',
    top : '0px',
    left : '0px'
  });


  contentView.addElement($element.els[0]);
  
  app.layout.on('resize', function (width, height){

    // for this to work we'll have to go through and find all the editor instances. 
    // and call resize... 
    for (var id in editSessions){
      if (editSessions.hasOwnProperty(id)){
        editSessions[id].$container.css({
          width: contentView.size().x + "px",
          height : contentView.size().y + "px"
        });
        editSessions[id].editor.resize();
      }
    }

  });

  var editSessions = {};
  // we keep a track of which session is active so that if the global 'save entity' signal comes along, 
  // we know if the editor is active and that the user wishes to save their work.
  var currentSession = false;

  function findSessions (path){
    for (var session in editSessions){
      if (editSessions.hasOwnProperty(session)){
        if (editSessions[session].entity.path === path){
          return editSessions[session];
        }
      }
    }
  }

  app.on('entity-updated', function (type, path){

    // let's attempt to match this path to a session..
    var session = findSessions(path);
    //if (currentSession){

    if (session){

      if (type === "update"){
        // let's load the file... ALTHOUGH at this point it's highly likely that the entity data is out of date...
        app.vfs.readFile(path, function (err, entity, body){

              // okay, first of all, let's see if the user has any local changes:
          if (session.bodies.user === session.bodies.persisted){
            // no. They don't have any changes. Therefore we will just automatically
            // update them to this latest version from the server.
            session.bodies.conflict = false;
            session.bodies.persisted = session.bodies.user = body;

          } else {

            session.bodies.persisted = body;
            session.bodies.conflict = (body !== session.bodies.saving);

          }

          if (session.bodies.user === session.bodies.persisted){
            app.emit('session-synchronised', session.entity._sessionId);
          } else {
            app.emit('session-desynchronised', session.entity._sessionId);
          }

          if (currentSession && currentSession.entity._sessionId === session.entity._sessionId){
            emitter.resume(session.entity);
          }


        });

      } else if (type === "delete"){

        session.bodies.persisted = "";
        if (currentSession && currentSession.entity._sessionId === session.entity._sessionId){
          emitter.resume(session.entity);
          app.emit('session-desynchronised', session.entity._sessionId);
        }

      }

    }

    //}

  });

app.on('entity-renamed', function (type, path, oldPath){

  var session = findSessions(oldPath);

  if (session){


  }

});

  app.on('save-entity', function (){

    // we only want to save if we're the active session...
    if (currentSession && !currentSession.synchronised){

      currentSession.cursor = currentSession.editor.getCursorPosition();

      app.emit('session-synchronising', currentSession.entity._sessionId);

      var saveSession = currentSession;

      currentSession.bodies.saving = currentSession.bodies.user;
      app.vfs.writeFile(currentSession.entity.path, currentSession.bodies.user, function (err, response){
        
        saveSession.bodies.persisted = saveSession.bodies.saving;
        //if (saveSession.bodies.persisted === saveSession.bodies.user){
        //  app.emit('session-synchronised', saveSession.entity._sessionId);
        //}
        // send 'new' and 'old'
        //app.emit('entity-updated', 'update', saveSession.entity.path);

      });
    }

  });



  emitter.create = function createEditSession (entity, callback){

    var session = editSessions[entity._sessionId] = {
      entity : entity,
      bodies : {},
      synchronised : false
    };

    var $container = dom('<div></div>');
    $container.css({
      position : 'absolute',
      top : '0px',
      left : '0px',
      width : contentView.size().x + "px",
      height : contentView.size().y + "px",
      display : 'none'
    });

    session.$container = $container;

    $element.append($container);

    var editor = ace.edit($container.els[0]);
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setUseWrapMode(true);
    editor.setShowPrintMargin(false);

    var lastChange = false, checking = false;

    editor.on('change', function (){

      if (currentSession){
        currentSession.bodies.user = editor.getValue();
        if (currentSession.synchronised && currentSession.bodies.user !== currentSession.bodies.persisted){
          currentSession.synchronised = false;
          app.emit('session-desynchronised', currentSession.entity._sessionId);
        } else if (!currentSession.synchronised && (currentSession.bodies.user === currentSession.bodies.persisted)){
          currentSession.synchronised = true;
          app.emit('session-synchronised', currentSession.entity._sessionId);
        }
      }

      skosser.change(editor);

    });

    session.editor = editor;

    app.emit('session-synchronising', entity._sessionId);

    app.vfs.readFile(entity.path, function (err, response, body){

      if (err){
        callback (false, err);
        return;
      }

      session.bodies.persisted = session.bodies.user =  body;
      session.bodies.saving = false;

      app.emit('session-synchronised', entity._sessionId);

      session.synchronised = true;

      callback(true);

    });

  }

  emitter.resume = function resumeEditSession (entity){

    currentSession = editSessions[entity._sessionId];

    if (!currentSession){
      return;
    }

    if (currentSession.entity.mime === "text/x-markdown"){
      currentSession.editor.getSession().setMode('ace/mode/markdown');
    } else if (currentSession.entity.mime === "application/json"){
      currentSession.editor.getSession().setMode('ace/mode/json');
    } else if (currentSession.entity.mime === "application/javascript"){
      currentSession.editor.getSession().setMode('ace/mode/javascript');
    }

    currentSession.$container.css({
      display : ''
    })

    currentSession.editor.setValue(currentSession.bodies.user, 1);
    if (currentSession.cursor){
      currentSession.editor.moveCursorToPosition(currentSession.cursor);
    }
    currentSession.editor.focus();

    $element.css({
      display : ''
    })

    skosser.activate();

  }

  emitter.pause = function pauseEditSession (entity){

    var session = editSessions[entity._sessionId];
    session.cursor = session.editor.getCursorPosition();

    session.$container.css({
      display : 'none'
    });

    currentSession = false;


    $element.css({
      display: 'none'
    });

    skosser.deactivate();


  }

  emitter.destroy = function destroyEditSession (entity, callback){

    // this is where we figure out whether it's okay to close this thing...
    var session = editSessions[entity._sessionId];


    if (!session){

      callback(true);

    } else {

      if (session.bodies.persisted !== session.bodies.user){
        var close = confirm('You have unsaved changes! Close anyway?');

        if (!close){
          callback(false);
          return;
        }
      }

      session.editor.destroy();
      session.$container.remove();

      editSessions[entity._sessionId] = null;
      delete editSessions[entity._sessionId];
      
      $element.css({
        display : 'none'
      });
      callback(true);

    }

  }

  return emitter;

}