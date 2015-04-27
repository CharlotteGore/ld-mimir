var dom = require('green-mesa-dom');
var each = require('foreach');

module.exports = function (app, contentView){

  var $element = dom('<div></div>');

  $element.addClass('commit');
  $element.css({
    display : 'none',
    'min-width' : contentView.size().x + 'px',
    'min-height' : contentView.size().y + 'px',
    position : 'absolute',
    top : 0,
    left : 0
  });

  $element.appendTo(contentView.element);

  var sessions = {};

  app.on('git-push', function (o){

    if (sessions[o.id]){

      var status = o.packet;

      sessions[o.id].$el.html('All done.<pre>' + o.packet.out +  '</pre><pre>' + o.packet.err +'</pre>');

    }

  });

  app.layout.on('resize', function (width, height){

    $element.css({
      'min-width' : contentView.size().x + 'px',
      'min-height' : contentView.size().y + 'px',
    });

  });

  var emitter = {};

  emitter.create = function createCommandSession (entity, callback){

    var session = sessions[entity._sessionId] = {
      entity : entity
    }

        //session.$el.remove();
    session.$el = dom('<div class="md-preview-content">Pushing upstream... please wait...</div>');
    $element.append(session.$el);

    app.remoteSend('git-push', {
      id : entity._sessionId
    });

    session.$el.css({ display: 'none'});

    app.emit('session-synchronised', entity._sessionId);


    callback(true);

  }

  emitter.pause = function pauseCommandSession (entity){

    var session = sessions[entity._sessionId];

    session.$el.css({
      display : 'none'
    });

    // hides the main terminals editor..
    $element.css({
      display : 'none',
    });


  }

  emitter.resume = function resumeCommandSession (entity){

    var session = sessions[entity._sessionId];

    session.$el.css({
      display : ''
    });

    $element.css({
      display : ''
    });

  }

  emitter.destroy = function destroyCommandSession (entity, callback){

    var session = sessions[entity._sessionId];

    session.$el.remove();



    sessions[entity._sessionId] = null;

    delete sessions[entity._sessionId];

    $element.css({
      display : 'none',
    });
    // callback true = okay to destroy this session...
    callback(true);

  }

  return emitter;

}