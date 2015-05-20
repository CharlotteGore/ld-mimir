var dom = require('green-mesa-dom');
var keycode = require('keycode');
var each = require('foreach')

module.exports = function (app){

  var active, mode, currentEditor, currentTerm, terms, lastTerm, termIndex = 0;

  /*
  app.remoteSend('run-command', {
    id : entity._sessionId,
    cmd : command
  });
  */

  // create the element. 
  var input = dom('<input placeholder="Search" class="autocomplete-input" type="text"></input>');
  dom('body').append(input);
  input.css({
    display : 'none'
  });

  var suggestions = dom('<div class="ld-result"><ul></ul></div>');
  var suggestionsList = suggestions.find('ul');
  suggestions.css({
    display: 'none',
    position: 'absolute'
  });

  dom('body').append(suggestions);

  input.on('keydown', function (e){

    var code = keycode(e);

    if (code === "tab" || code === "enter"){
      e.preventDefault();
      e.stopPropagation();
      currentEditor.insert(terms[termIndex -1].name);
      suggestions.css({
        display : 'none'
      });
      input.css({
        display: 'none'
      })
      currentEditor.focus();
      
    } else if (code === "down"){
      e.stopPropagation();
      termIndex++;
      if (termIndex === terms.length + 1){
        termIndex = 1;
      }

      highlightTerm();

    } else if (code === "up"){
      e.stopPropagation();
      termIndex--;
      if (termIndex === 0){
        termIndex = terms.length;
      }

      highlightTerm();

    }

  })

  input.on('keyup', function (e){

    if (keycode(e) === "esc"){
      suggestions.css({
        display : 'none'
      });
      input.css({
        display: 'none'
      })
      editor.focus();
    }

    currentTerm = dom(this).val();

    if (currentTerm !== "" && currentTerm !== lastTerm){
      app.remoteSend('skos-complete', {
        id : 'skos',
        mode : mode,
        term : currentTerm
      });
      lastTerm = currentTerm;
    }



  });

  app.on('skos-complete', function (o){

    if (active){
      // do something with the results...
      suggestionsList.empty();

      terms = o.packet;

      each(terms, function (suggestion){

        suggestionsList.append(dom('<li><strong>' + currentTerm + '</strong>' + suggestion.name.substr(currentTerm.length) +'</li>'))

      });

      termIndex = 1;
      highlightTerm();

      var box = input.els[0].getBoundingClientRect();

      suggestions.css({
        display: '',
        left : box.left + "px",
        top : box.bottom + "px"
      });

    }

  });

  function highlightTerm (){

    suggestionsList.find('li.selected').removeClass('selected');
    suggestionsList.find('li:nth-child('+ termIndex +')').addClass('selected');

  }

  return {
    activate : function (){

      active = true;
    },
    deactivate : function (){

      input.css({
        display : 'none'
      });
      active = false;

    },
    change : function (editor){

      currentEditor = editor;

      var currentLine = editor.getSelectionRange().start.row;
      var wholeLineText = editor.session.getLine(currentLine);
      var currentCharacter = editor.getSelectionRange().start.column;

      var doSearch = false;
      var qs = false;
      var qsc = false

      if (currentCharacter === (wholeLineText.length -1) && (/qs:$/.test(wholeLineText))){

        doSearch = true;
        qs = true;
        mode = 'qs';

      } else if (currentCharacter === (wholeLineText.length -1) && (/qsc:$/.test(wholeLineText))){

        doSearch = true;
        qsc = true;
        mode = 'qsc';

      }

      if (doSearch){

        var offset = editor.renderer.scroller.getBoundingClientRect();
        var padding = editor.renderer.$padding;
        var cur = editor.getCursorPositionScreen();

        var x = Math.ceil((cur.column + 1) * editor.renderer.characterWidth) + offset.left + padding;
        var y = Math.ceil(cur.row * editor.renderer.lineHeight) + offset.top - editor.renderer.scrollTop;

        //var input = dom('<input placeholder="Search" class="autocomplete-input" type="text"></input>');
        input.css({
          left : x  + "px",
          top : y + "px",
          position: "absolute",
          display : ''
        });
        input.val("");

        input.els[0].focus();

      }
    }
  }

}