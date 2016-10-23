// Dependencies
const BPromise = require('Bluebird');
const rest = require('restler');
const crypto = require('crypto')
const config = require('config')
const _ = require('lodash')

// Constants
const apiKey = config.fatsecret.consumerKey
const sharedSecret = config.fatsecret.sharedKey
const fatSecretRestUrl = 'http://platform.fatsecret.com/rest/server.api'
const encodedFSUrl = encodeURIComponent(fatSecretRestUrl)
const date = new Date();


// Note that the keys are in alphabetical order
const baseReqObj = () => {
  return {
    format: 'json',
    method: 'foods.search',
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).replace(/[^a-z]/, '').substr(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(date.getTime() / 1000),
    oauth_version: '1.0'
  }
};

const getOAuthSignature = (request, access_token='') =>
  crypto.createHmac('sha1', [sharedSecret, access_token].join('&'))
    .update(buildSigBaseStr(request)).digest('base64');

// construct a param=value& string and uriEncode
const buildSigBaseStr = request => {
  const keys = Object.keys(request).sort()
  const parameterString = _.map(keys, key => key + '=' + encodeURIComponent(request[key])).join('&')
  return `POST&${encodedFSUrl}&${encodeURIComponent(parameterString)}`;
}

const foodSearch = (expression) => new BPromise(resolve => {
  const reqObj = baseReqObj();
  reqObj.search_expression = expression
  reqObj.oauth_signature = getOAuthSignature(reqObj);

  rest.post(fatSecretRestUrl, {
    data: reqObj,
  }).on('complete', (data, response) => {
    resolve(data);
  });
});


const fatsecret = {
  food: {
    search: foodSearch
  }
}

module.exports = fatsecret;

// example
// fatsecret.food.search('hot dog').then(console.log)
