var Inotify = require('inotify').Inotify;
var inotify = new Inotify(); //persistent by default, new Inotify(false) //no persistent
var fs = require('fs');
var path = require('path');
var emitter = new (require('events')).EventEmitter();

var data = {}; //used to correlate two events

function watch (pathName){

    var wd = {
        path : pathName,
        watch_for : Inotify.IN_CREATE | Inotify.IN_DELETE | Inotify.IN_MOVED_FROM | Inotify.IN_MOVED_TO,
        callback : callback.bind(null, pathName)
    }

    console.log('Watching ' + pathName);

    inotify.addWatch(wd);

    watchAllSubdirectories(pathName);

}

function watchAllSubdirectories (pathName){

    fs.readdir(pathName, function (err, files){

        if (!err){

            files.forEach(function (file){

                if (file.indexOf(".git") === -1){

                    fs.stat(path.join(pathName, file), function (err, stats){

                        if (stats.isDirectory()) watch(path.join(pathName, file));

                    });

                }

            });

        }

    });

}

function trigger (filename, event, arg){

    if (!/~$/.test(filename) && path.basename(filename).substr(0,1) !== "."){
        emitter.emit(event, filename, arg);
    }

}

function callback(pathName, event) {
    var mask = event.mask;
    var type = mask & Inotify.IN_ISDIR ? 'directory ' : 'file ';
    //event.name ? type += ' ' + path + event.name + ' ': ' ';

    var filename = '';

    if (event.name) filename = path.join(pathName, event.name);

    //the porpuse of this hell of 'if'
    //statements is only illustrative.

    if(mask & Inotify.IN_CREATE) {
        if (Object.keys(data).length && data.filename === filename){
            trigger (filename, "update");
            data = {};
        } else {
            trigger (filename, "create");

        }
        if (mask & Inotify.IN_ISDIR){
            watch (filename);
        } 
    } else if(mask & Inotify.IN_DELETE) {
        trigger (filename, "delete");
    } else if(mask & Inotify.IN_MOVED_FROM) {
        data = event;
        data.filename = filename;
    } else if(mask & Inotify.IN_MOVED_TO) {
        if( Object.keys(data).length &&
            data.cookie === event.cookie) {
            if (/~$/.test(data.filename)){
                trigger(filename, "update");
                data = {};
            } else if (/~$/.test(filename)){
                //trigger(data.filename, "move", filename)
                // let's leave the data as is...
            } else {
                trigger (filename, "rename", data.filename);
            }
           
        }
    }
}

module.exports = function initialise (pathName){

    watch (pathName);
    return emitter;

}