var dom = require('green-mesa-dom');
var each = require('foreach');

module.exports = function (app, contentView){

  var $element = dom('<div></div>');

  var staging = function (){

    return [
      '<div class ="output">',
      '<form>',
        '<table>',
          '<thead>',
            '<tr>',
              '<th>Commit?</th>',
              '<th>File</th>',
              '<th>Change</th>',
            '</tr>',
          '</thead>',
          '<tbody>',
          '</tbody>',
        '</table>',
        '<ul>',
        '<li><label>Commit message</label></li>',
        '<li><textarea name="commit-message"></textarea></li>',
        '<li><button>Commit</button></li>',
        '</ul>',
      '</form>',
      '</div>'
    ].join('\n')

  }

  var entityT = function (file, status){

    var state = "Added";

    /*
      ' ' = unmodified

      M = modified

      A = added

      D = deleted

      R = renamed

      C = copied

      U = updated but unmerged
    */

    if (typeof status.type != "undefined"){

      switch (status.type){

        case " ":
          state = "Unmodified";
          break;
        case "M":
          state = "Modified";
          break;
        case "A":
          state = "Added";
          break;
        case "R":
          state = "Renamed";
          break;
        case "C":
          state = "Copied";
          break;
        case "U":
          state = "Updated but unmerged"
          break;
      }

    }

    return [
      '<tr>',
      '<td><input type="checkbox" name="files" value="' + file.replace('"','').trim() +' " checked="checked"></input></td>',
      '<td>' + file + '</td>',
      '<td>' + state + '</td>',
      '</tr>'
    ].join('\n');

  }


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

  //term.open($element.els[0]);

  app.on('git-status', function (o){

    if (sessions[o.id]){

      var status = o.packet;

      sessions[o.id].status = status;

      each(status, function (status, file){

        sessions[o.id].$el.find('tbody').append(dom(entityT(file, status)));

      });

    }

  });

  app.on('git-commit', function (o){

    if (sessions[o.id]){

      var status = o.packet;

      sessions[o.id].$el.html('<pre>' + o.packet +  '</pre>');

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
    session.$el = dom(staging());
    $element.append(session.$el);

    session.$el.find('form').on('submit', function (e){

      e.preventDefault();

      var form = dom(e.target);
      var list = [];

      var msg = form.find('textarea[name="commit-message"]').val().trim();

      if (msg !== ""){

        each(e.target.elements, function (el){

          el = dom(el);

          if (el.attr('name') === "files"){
            list.push(el.val().trim());
          }

        });

      }

      app.remoteSend('git-commit', {
        id : entity._sessionId,
        msg : msg,
        stage : list
      });


    });

    app.remoteSend('git-status', {
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