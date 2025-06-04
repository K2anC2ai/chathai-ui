describe('Simple Todo App', () => {
  before(() => {
    cy.get('button[type="submit"]')
  })

  it.skip('Loads the app and adds a todo', () => {
    cy.visit('http://localhost:3000')
    cy.get('input[name="task"]').type('Learn Cypress')
    cy.click()
    cy.contains('Learn Cypress')
  })
})
