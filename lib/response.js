'use strict'

module.exports.build = function (callback, statusCode, message, commits) {
  let responseBody = {message}
  if (commits) responseBody.commits = commits
  callback(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    statusCode: statusCode,
    body: JSON.stringify(responseBody)
  })
}

module.exports.error = function (statusCode, message) {
  let error = new Error(message)
  error.statusCode = statusCode
  return error
}
