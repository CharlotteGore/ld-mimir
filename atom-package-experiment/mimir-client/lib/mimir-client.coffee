SocksJS = require './socks.js'
gitCommand = require './git-command.js'
MimirClientView = require './mimir-client-view'
MimirPleaseWaitView = require './mimir-please-wait-view.coffee'
{CompositeDisposable} = require 'atom'
fs = require 'fs'

module.exports = MimirClient =
  mimirClientView: null
  mimirPleaseWaitView: null
  modalPanel: null
  pleaseWaitPanel: null
  subscriptions: null

  activate: (state) ->

    @mimirClientView = new MimirClientView(state.mimirClientViewState)
    @mimirPleaseWaitView = new MimirPleaseWaitView(state.mimirClientViewState)

    @modalPanel = atom.workspace.addModalPanel(item: @mimirClientView.getElement(), visible: false)
    @pleaseWaitPanel = atom.workspace.addModalPanel(item: @mimirPleaseWaitView.getElement(), visible: false)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'mimir-client:toggle': => @toggle()
    @subscriptions.add atom.commands.add 'atom-workspace', 'mimir-client:add-project': => @addproject()
    @subscriptions.add atom.commands.add 'atom-workspace', 'mimir-client:build-previews': => @buildpreviews()
    @subscriptions.add atom.commands.add 'atom-workspace', 'mimir-client:bundle-commit': => @bundlecommit()

    # Set up socket stuff
    @sock = new SocksJS(atom.config.get("NICE.sock"))
    @sock.onopen = ->
      console.log 'Socket connected!'
    @sock.onmessage = (e) =>
      msg = JSON.parse e.data
      for signal, message of msg
        if signal == 'build-patch'
          @confirmResult message
        if signal == 'head-hash'
          @doBundle message
        if signal == 'apply-bundle'
          @confirmResult message


  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @mimirClientView.destroy()

  serialize: ->
    mimirClientViewState: @mimirClientView.serialize()

  confirmResult : (message) ->
    @mimirPleaseWaitView.showMessage(message.result);
    setTimeout(
      =>
        @pleaseWaitPanel.hide();
      , 4000)

  buildpreviews: ->
    @mimirPleaseWaitView.pleaseWait();
    @pleaseWaitPanel.show();
    cwd = atom.config.configDirPath + "/project"
    sock = @sock;
    gitCommand(
      'git stash', 
      cwd, 
      (err, stdout, stderr) -> 
        if !err
          gitCommand(
            'git stash show -p',
            cwd,
            (err, stdout, stderr) ->
                if !err
                  patch = stdout
                  gitCommand(
                    'git stash pop',
                    cwd,
                    (err, stdout, stderr) ->
                      # Yikes coffeescript is pretty ugly!
                      sock.send(JSON.stringify({
                        'build-patch' : patch
                      }))
                  )
          )
    )

  bundlecommit: ->
    @mimirPleaseWaitView.pleaseWait();
    @pleaseWaitPanel.show();
    @sock.send(JSON.stringify({
      'get-head-hash' : true
    }));

  doBundle: (message) ->
    rev = message.hash.substr(0, 8)
    cwd = atom.config.configDirPath + "/project"
    sock = @sock;
    gitCommand(
      'git rev-parse HEAD',
      cwd,
      (err, stdout, stderr) =>
        if !err
          # We need to know that the local repo is ahead of the remote...
          if rev != stdout.substr(0,8)
            gitCommand(
              'git bundle create ' + atom.config.configDirPath + "/commits.bundle master ^" + rev,
              cwd,
              (err, stdout, stderr) ->
                if !err
                  fs.readFile(atom.config.configDirPath + "/commits.bundle", (err, data) ->
                    sock.send(JSON.stringify({
                      'apply-bundle' : data
                    }))
                  )

            )
          else
            @confirmResult "In sync"
    )
    
  addproject: ->
    atom.project.addPath(atom.config.configDirPath + "/project")

  toggle: ->
    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()
