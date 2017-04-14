'use strict'

const config = require('../config.json')
const dynamodb = require('../lib/dynamodb')
const response = require('../lib/response')

module.exports.handle = (event, context, callback) => {
  if (isAuthenticated(event, callback)) {
    let params = Object.assign({}, event.queryStringParameters)
    dynamodb.search(params)
      .then(function (response) {
        response.build(callback, 200, response.Count + ' commits returned', response.Items)
      })
      .catch(function (error) {
        response.build(callback, 500, 'An error occured, check CloudWatch logs for more information')
        console.error(error)
      })
  }
}

function isAuthenticated (event, callback) {
  if (!('X-Authorization' in event.headers)) {
    response.build(callback, 401, 'Please pass a valid API Key as a X-Authorization header')
    return false
  }
  if (event.headers['X-Authorization'] !== config.API_KEY) {
    response.build(callback, 401, 'API Key not valid')
    return false
  }
  return true
}
