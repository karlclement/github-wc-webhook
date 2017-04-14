'use strict'

const aws = require('aws-sdk')

module.exports.hello = (event, context, callback) => {
  
}

function buildResponse (statusCode, message, data) {
  return {
    statusCode: statusCode,
    body: JSON.stringify({
      message: message,
      data: data
    })
  }
}
