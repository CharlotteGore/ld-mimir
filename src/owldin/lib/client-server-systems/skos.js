var N3 = require('n3');
var fs = require('fs');
var path = require('path');
var TrieSearch = require('trie-search');

module.exports = function (){

  var dataLoaded = false;
  var triples = [];

  var qsTrie = new TrieSearch('name', { ignoreCase: false});
  var qscTrie = new TrieSearch('name', { ignoreCase: false});

  var qsMatches = {};
  var qscMatches = {};

  fs.readFile(path.resolve(__dirname, '../../import/schema.ttl'), 'utf8', function (err, data){

    if (err){
      console.log(err);
    }

    var parser = new N3.Parser();

    parser.parse(data, function (err, triple, prefixes){

      if (triple){

        triples.push(triple);

      } else if (!err) {
        // this should be the prefixes...
        triples.forEach(function (triple){

          if (triple.subject.indexOf(prefixes.qs) !== -1){
            var name = triple.subject.replace(prefixes.qs, '');
            if (!qsMatches[name])
            qsTrie.add({
              name : name
            });
            qsMatches[name] = true;
          } else if (triple.subject.indexOf(prefixes.qsc) !== -1){
            var name = triple.subject.replace(prefixes.qsc, '');
            if (!qscMatches[name])
            qscTrie.add({
              name : name
            });
            qscMatches[name] = true;
          }

        });

        dataLoaded = true;
        console.log('skos autocomplete service initialised');

      }

    });

  });

  return {

    close : function (){

      // there's really nothing to do here.. 

    },

    handlers : {

      'skos-complete' : function (msg, conn){

        if (dataLoaded){

          var type = msg.mode;
          var term = msg.term;
          var result;

          if (type === "qs"){
            result = qsTrie.get(term);
          } else if (type === "qsc"){
            result = qscTrie.get(term);
          }

          conn.write(JSON.stringify({
            'skos-complete' : {
              id : msg.id,
              packet : result
            }
          }));

        }

      }
    }
  }
}