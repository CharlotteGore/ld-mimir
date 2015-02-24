var Terminal = require('term.js');
var dom = require('green-mesa-dom');

module.exports = function (contentView, layout, remote){

  /*
  var term = new Terminal({
    cols: 80,
    rows: 24,
    screenKeys: true
  });
*/

  var $element = dom('<div></div>');

  $element.addClass('terminals');
  $element.css({
    display : 'none',
    'min-width' : contentView.size().x + 'px',
    'min-height' : contentView.size().y + 'px',
    position : 'absolute',
    top : 0,
    left : 0
  });



  $element.appendTo(contentView.element);

  var userLookup = {};
  var terminals = {};

  //term.open($element.els[0]);

  remote.on('term', function (o){

    terminals[o.id].write(o.packet);

  });

  var requestId = 0;

  window.remote = remote;


  layout.on('resize', function (width, height){

   // element.style.width = contentView.size().x + "px";
    //element.style.height = contentView.size().y + "px";
    //editor.resize();
    $element.css({
      'min-width' : contentView.size().x + 'px',
      'min-height' : contentView.size().y + 'px',
    });

  });


  var t = {
    create : function (id, fn){

      $element.css({display : ''});

      var $tester = dom('<div>0</div>');
      $tester.css({
        display: 'inline-block'
      })
      $element.append($tester);
        //var $el

      var charWidth = $tester.els[0].clientWidth;
      var charHeight = $tester.els[0].clientHeight;

      $element.css({display : 'none'});
      $tester.remove();

      // round down to nearest 10
      var columns = Math.floor( ((contentView.size().x / charWidth) / 10) ) * 10;
      var rows = Math.floor(contentView.size().y / charHeight);

      remote.once('terminal-created', function (msg){

        var term = new Terminal({
          cols : columns,
          rows : rows,
          screenKeys : true
        });

        terminals[msg.id] = term;

        term.on('data', function(data) {
          remote.send('term', {
            id : msg.id,
            packet : data
          });
        });
        

        var $term = dom('<div></div>');
        $element.append($term);
        term.open($term.els[0]);

        $term.css({
          display : 'none'
        })

        userLookup[msg.requestId] = {
          termId : msg.id,
          $term : $term
        };

        fn(false);

      });


      remote.send('create-term', {
        id : id,
        rows : rows,
        cols : columns
      });

    },
    resume : function (id){

      $element.css({
        display : ''
      });

      var term = userLookup[id];

      term.$term.css({
        display : ''
      });

      $tester.remove();

    },
    pause : function (id){
      // closes all..
      $element.css({
        display : 'none',
      });

      var term = userLookup[id];

      term.$term.css({
        display : 'none'
      });

    },
    destroy : function (id){

      var term = userLookup[id];

      terminals[term.termId].destroy();

      term.$term.remove();
      //term.term.destroy();
      remote.send('kill-term', term.termId)

      terminals[term.termId] = null;
      userLookup[id] = null;

      $element.css({
        display : 'none',
      });

    }
  }

  window.t = t;

  return t;

  //remote.send('create-term', requestId);

}