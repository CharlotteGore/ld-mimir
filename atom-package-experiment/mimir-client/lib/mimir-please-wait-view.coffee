module.exports =
class MimirPleaseWaitView
  constructor: (serializedState) ->
    # Create root element
    @element = document.createElement('div')
    @element.classList.add('mimir-client')

    # Create message element
    @message = document.createElement('div')
    @message.textContent = "Please wait..."
    @message.classList.add('message')
    @element.appendChild(@message)

  # Returns an object that can be retrieved when package is activated
  serialize: ->

  # Tear down any state and detach
  destroy: ->
    @element.remove()

  pleaseWait: -> 
    @message.textContent = "Please wait..."

  showMessage: (message) ->
    @message.textContent = message

  getElement: ->
    @element