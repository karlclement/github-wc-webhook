'use strict'

const config = require('../config.json')
const dynamodb = require('../lib/dynamodb')
const response = require('../lib/response')

module.exports.handle = (event, context, callback) => {
  authenticate(event)
    .then(function () {
      let params = Object.assign({}, event.queryStringParameters)
      return dynamodb.search(params)
    })
    .then(function (response) {
      response.build(callback, 200, response.Count + ' commits returned', response.Items)
    })
    .catch(function (error) {
      response.build(callback, error.statusCode || 500, error.message)
    })
}

function authenticate (event) {
  if (!('X-Authorization' in event.headers)) {
    return Promise.reject(response.error(401, 'Please pass a valid API Key as a X-Authorization header'))
  }
  if (event.headers['X-Authorization'] !== config.API_KEY) {
    return Promise.reject(response.error(401, 'API Key not valid'))
  }
  return Promise.resolve()
}
