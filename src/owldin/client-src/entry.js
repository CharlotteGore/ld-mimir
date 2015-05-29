// probably want to move this to a config file at some point..
var vfsRoot = window.location.protocol + "//" + window.location.host + "/vfs";
var artifactVFSRoot = window.location.protocol + "//" + window.location.host + "/artifacts";
var sockRoot = window.location.protocol + "//" + window.location.host + "/comms"

// application level broker... 
var app = new (require('events')).EventEmitter();

// layout manages the screen
var layout = app.layout = require('./components/layout.js')();

// set up the socket communications with the server for terminals/file updates
var remote = require('./lib/remote.js')(app, sockRoot);
// get the virtual file system working...
app.vfs = require('./lib/file-system').initialiseFileSystem(app, vfsRoot, artifactVFSRoot);
// initialise the entity selector. This MUST happen before the first vfs:sync event.
var entitySelector = require('./components/entity-selector.js')(app, layout.nav);


var topMenu = require('./components/top-menu.js')(app, layout.menu);

var sessionHandlers = {
  ace : require('./components/editors/ace.js')(app, layout.editor),
  info : require('./components/editors/info.js')(app, layout.editor),
  preview : require('./components/editors/previewer.js')(app, layout.editor),
  terminals : require('./components/editors/terminals.js')(app, layout.editor),
  newFolder : require('./components/editors/new-folder.js')(app, layout.editor),
  newDocument : require('./components/editors/new-document.js')(app, layout.editor),
  commands : require('./components/editors/command.js')(app, layout.editor),
  commit : require('./components/editors/commit.js')(app, layout.editor),
  push : require('./components/editors/push.js')(app, layout.editor),
  build : require('./components/editors/build.js')(app, layout.editor)
}

var sessions = require('./components/sessions.js')(app, sessionHandlers, layout.tabs);

// system wide save event
window.onkeydown = function (e){
  if((e.ctrlKey || e.metaKey)){
    if (e.which == 83) {
      e.preventDefault();
      app.emit('save-entity');
    }
  }
}