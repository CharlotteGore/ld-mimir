MimirClient = require '../lib/mimir-client'

# Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
#
# To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
# or `fdescribe`). Remove the `f` to unfocus the block.

describe "MimirClient", ->
  [workspaceElement, activationPromise] = []

  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)
    activationPromise = atom.packages.activatePackage('mimir-client')

  describe "when the mimir-client:toggle event is triggered", ->
    it "hides and shows the modal panel", ->
      # Before the activation event the view is not on the DOM, and no panel
      # has been created
      expect(workspaceElement.querySelector('.mimir-client')).not.toExist()

      # This is an activation event, triggering it will cause the package to be
      # activated.
      atom.commands.dispatch workspaceElement, 'mimir-client:toggle'

      waitsForPromise ->
        activationPromise

      runs ->
        expect(workspaceElement.querySelector('.mimir-client')).toExist()

        mimirClientElement = workspaceElement.querySelector('.mimir-client')
        expect(mimirClientElement).toExist()

        mimirClientPanel = atom.workspace.panelForItem(mimirClientElement)
        expect(mimirClientPanel.isVisible()).toBe true
        atom.commands.dispatch workspaceElement, 'mimir-client:toggle'
        expect(mimirClientPanel.isVisible()).toBe false

    it "hides and shows the view", ->
      # This test shows you an integration test testing at the view level.

      # Attaching the workspaceElement to the DOM is required to allow the
      # `toBeVisible()` matchers to work. Anything testing visibility or focus
      # requires that the workspaceElement is on the DOM. Tests that attach the
      # workspaceElement to the DOM are generally slower than those off DOM.
      jasmine.attachToDOM(workspaceElement)

      expect(workspaceElement.querySelector('.mimir-client')).not.toExist()

      # This is an activation event, triggering it causes the package to be
      # activated.
      atom.commands.dispatch workspaceElement, 'mimir-client:toggle'

      waitsForPromise ->
        activationPromise

      runs ->
        # Now we can test for view visibility
        mimirClientElement = workspaceElement.querySelector('.mimir-client')
        expect(mimirClientElement).toBeVisible()
        atom.commands.dispatch workspaceElement, 'mimir-client:toggle'
        expect(mimirClientElement).not.toBeVisible()
