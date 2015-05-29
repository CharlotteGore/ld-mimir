var marked = require('marked');
var crypto = require('crypto');

var dom = require('green-mesa-dom');

var path = require('path');
var svgPanZoom = require('svg-pan-zoom');

module.exports = function (app, contentView){

  var emitter = new (require('events')).EventEmitter();

  var $element = dom('<div></div>');


  $element.addClass('preview');
  $element.css({
    display : 'none',
    'width' : contentView.size().x + 'px',
    'height' : contentView.size().y + 'px',
    position : 'absolute',
    overflow : 'scroll',
    top : 0,
    left : 0
  });

  $element.appendTo(contentView.element);

  app.layout.on('resize', function (width, height){

    $element.css({
      'width' : contentView.size().x + 'px',
      'height' : contentView.size().y + 'px'
    });

  });

  var previewSessions = {};
  var currentSession = false;

  app.on('command-stdout', function (o){

    if (o.id.indexOf && o.id.indexOf('-preview') !== -1){

      var id = o.id.replace('-preview', '');

      // actually this is 
      if (previewSessions[id]){

        previewSessions[id].converted += o.packet;
      }

    }

  });

  app.on('command-stderr', function (o){

    if (o.id.indexOf && o.id.indexOf('-preview') !== -1){

      var id = o.id.replace('-preview', '');

      // actually this is 
      if (previewSessions[id]){
        // what should we do with errors? Probably just stop and display "sorry!";
        // let's actually get the session synchronised anyway...
        app.emit('session-synchronised', id);
      }

    }

  });

  app.on('command-close', function (o){

    if (o.id.indexOf && o.id.indexOf('-preview') !== -1){

      var id = o.id.replace('-preview', '');

      // actually this is 
      if (previewSessions[id]){

        previewSessions[id].body = previewSessions[id].converted;
        previewSessions[id].complete = true;

        // only if the session is teh current session...
        app.emit('session-synchronised', id);

        if (previewSessions[id] === currentSession){
          $element.html(previewSessions[id].body);
          //$element.css({ display : ''});
          svgPanZoom($element.find('svg').els[0], { minZoom: 0.1});
          $element.find('svg').attr('width', parseFloat($element.find('svg').attr('width'), 10) / 2 + "pt");
          $element.find('svg').attr('height', parseFloat($element.find('svg').attr('height'), 10) / 2 + "pt");
        }

      }

    }

  });

  emitter.create = function createPreviewSession (entity, callback){
    var session = previewSessions[entity._sessionId] = {
      entity : entity,
      body : {}
    };

    var fileExt = path.extname(entity.name);

    if (fileExt === ".md" || fileExt === ".txt" || fileExt === "" || fileExt === ".html"){

      app.vfs.readFile(entity.path, function (err, response, body){

        if (err){
          callback (false, err);
          return;
        }

        session.body = body;

        app.emit('session-synchronised', entity._sessionId);

        callback(true);

      });

    } else if (fileExt === ".png" || fileExt === ".jpg" || fileExt === ".gif") {

      app.vfs.readFileAsBase64(entity.path, function (err, response, body){

        if (err){
          callback (false, err);
          return
        }

        session.body = body;

        app.emit('session-synchronised', entity._sessionId);

        callback(true);

      });

    } else if (fileExt === ".ttl") {

      session.converted = "";
      session.complete = false;

      app.remoteSend('run-command', {
        id : entity._sessionId + '-preview',
        cmd : 'rapper -i turtle ' + path.join('.', entity.path) + ' -o dot | dot -Tsvg'
      });

      app.emit('session-synchronised', entity._sessionId);

      callback(true);

    } else {
      // no load...
      session.body = ""
      app.emit('session-synchronised', entity._sessionId);
      callback(true);

    }


  }

  emitter.resume = function resumePreviewSession (entity){

    currentSession = previewSessions[entity._sessionId];

    if (!currentSession){
      return false;
    }

    if (currentSession.entity.mime === "text/x-markdown"){

      var shasum = crypto.createHash('sha256');
      shasum.update(path.relative('/', currentSession.entity.path))
      var hash = (shasum.digest('hex')).toUpperCase();
      $element.html(downloadLinks(hash) + '<div class="md-preview-content">' + marked(currentSession.body) + '</div>');

    } else if (currentSession.entity.mime === "application/json"){
      $element.html('<div class="md-preview-content">' + marked('~~~json\n' + JSON.stringify(JSON.parse(currentSession.body), false, 4) + '~~~\n') + '</div>');

    } else {

      var fileExt = path.extname(entity.name);

      if (fileExt === ".png" || fileExt === ".gif" || fileExt === ".jpg"){

        $element.html('<img></img>');
        $element.find('img').attr('src', currentSession.body);

      } else if (fileExt === ".ttl"){
        // the body should be an SVG at this point...

        // will have to look up how to render an SVG document directly in the browser, haven't done it 
        // in a while if I'm honest...
        if (currentSession.complete){

          $element.html(currentSession.body);
          $element.css({ display : ''});
          svgPanZoom($element.find('svg').els[0], { minZoom: 0.1});
          $element.find('svg').attr('width', parseFloat($element.find('svg').attr('width'), 10) / 2 + "pt");
          $element.find('svg').attr('height', parseFloat($element.find('svg').attr('height'), 10) / 2 + "pt");
        } else {
          $element.html('<div class="md-preview-content">Please wait while we convert this turtle file</div>')
        }
        
      } else if (fileExt === ".html"){

        $element.html('<div class="md-preview-content">' + currentSession.body + '</div>');  
        

      } else {

        $element.html('<div class="md-preview-content">There is no built-in viewer for this type of file. <a href="' + app.vfs.getURI(currentSession.entity.path) + '" target="blank">Download ' + currentSession.entity.name + '</a></div>');
      
      }
    }

    $element.css({ display : ''});

  }

  emitter.pause = function pausePreviewSession (entity){

    currentSession = false;
    $element.css({ display : 'none'});

  }

  emitter.destroy = function destroyPreviewSession (entity, callback){

    if (previewSessions[entity._sessionId]){
      previewSessions[entity._sessionId] = null;
      delete previewSessions[entity._sessionId];
      callback(true); // always okay to close!
    }

    $element.css({
      display : 'none'
    });


  }

  return emitter;

  function downloadLinks (hash){

    return [
      '<ul class="downloads">',
        '<li><a target="blank" href="' + app.vfs.getArtifactURI('/application/pdf/' + hash + '.pdf') + '">Download PDF preview <span class="typcn typcn-arrow-forward"></span></a></li>',
        '<li><a target="blank" href="' + app.vfs.getArtifactURI('/application/vnd.openxmlformats-officedocument.wordprocessingml.document/' + hash + '.docx') + '">Download Word preview <span class="typcn typcn-arrow-forward"></a></li>',
        '<li><a target="blank" href="' + app.vfs.getArtifactURI('/text/html/' + hash + '.html') + '">Download HTML preview <span class="typcn typcn-arrow-forward"></a></li>',
      '</ul>'
    ].join('\n');
    
  }

}