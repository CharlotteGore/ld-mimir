
var extend = require('extend-object');
var each = require('foreach');

module.exports = function (server, broker){

  var sockjs = require('sockjs');
  var sock = sockjs.createServer();
  var uuid = require('node-uuid');

  var plugins = {
    git : require('./client-server-systems/git.js')(),
    shell : require('./client-server-systems/shell.js')(),
    terminal : require('./client-server-systems/terminal.js')(),
    skos : require('./client-server-systems/skos.js')()
  }

  var socketConnections = [];

  var handlers = {};

  each(plugins, function (plugin){

    extend(handlers, plugin.handlers);

  });

  sock.on('connection', function (conn){

    conn.terminals = [];

    socketConnections.push(conn);

    conn.on('data', function (message){

      var msg = JSON.parse(message);
      for (var i in msg){
        if (msg.hasOwnProperty(i) && handlers[i]){
          handlers[i](msg[i], conn)
        }
      }

    });

    conn.on('close', function (){

      each(plugins, function (plugin){

        extend(handlers, plugin.close(conn));

      });
            // remove the socket from the list
      socketConnections.splice(socketConnections.indexOf(conn), 1);

    });

  });

  // file system signal propagators... 

  broker.on('create', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({
          'remote-entity-create': msg
      }));
    })
  });
  broker.on('rename', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({
          'remote-entity-create': msg
      }));
    })
  });
  broker.on('update', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({
          'remote-entity-update': msg
      }));
    });
  });
  broker.on('delete', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({
          'remote-entity-delete': msg
      }));
    });
  });

  sock.installHandlers(server, {
      prefix: '/comms'
  });

}