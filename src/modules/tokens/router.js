"use strict"

const tokens = require("./controller")

// export const baseUrl = '/users'
module.exports.baseUrl = "/tokens"

module.exports.routes = [
  /*
  {
    method: 'POST',
    route: '/',
    handlers: [
      user.createUser
    ]
  },
  */
  {
    method: "GET",
    route: "/",
    handlers: [tokens.getBalance]
  },
  {
    method: "GET",
    route: "/:bchaddr",
    handlers: [
      // ensureUser,
      tokens.getTokens
    ]
  }

  /*
  {
    method: 'PUT',
    route: '/:id',
    handlers: [
      ensureUser,
      user.getUser,
      user.updateUser
    ]
  },
  {
    method: 'DELETE',
    route: '/:id',
    handlers: [
      ensureUser,
      user.getUser,
      user.deleteUser
    ]
  }
  */
]
