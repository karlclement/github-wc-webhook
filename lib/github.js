'use strict'

const request = require('request')
const requestPromise = require('request-promise')

const config = require('../config.json')

module.exports.get = function (commits, path) {
  return Promise.all(commits.map(function (sha) {
    let url = `https://api.github.com/repos/${path}/commits/${sha}`
    let options = {
      json: true,
      uri: url,
      headers: {
        'Authorization': 'token ' + config.GITHUB_OATH_TOKEN,
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1'
      }
    }
    return requestPromise(options)
  }))
}
