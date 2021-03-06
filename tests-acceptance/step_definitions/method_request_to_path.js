const world = require('../support/world');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const nock = require('nock');
const request = require('request');
const assert = require('assert');

const NOTIFICATION_SERVICE_URL = config.externalServices.notifications.base;
const NOTIFICATION_EMAIL_SERVICE_PATH = config.externalServices.notifications.pathEmail;

module.exports = function () {
	this.When(/^the client makes a (.*) request to (.*)$/, function (METHOD, PATH, callback) {

		const path = PATH.replace(':email', world.getUser().username.toUpperCase()); //Upper to check the lower email validation
		const options = {
			url: `http://localhost:${config.public_port}${path}`,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				Origin: `http://localhost:${config.public_port}`,
				Referer: `http://localhost:${config.public_port}`,
				[config.version.header]: world.versionHeader
			},
			method: METHOD
		};

		nock(NOTIFICATION_SERVICE_URL)
			.post(NOTIFICATION_EMAIL_SERVICE_PATH)
			.reply(204);

		request(options, function (err, res) {
			assert.equal(err, null);
			world.getResponse().statusCode = res.statusCode;
			world.getResponse().headers = res.headers;
			return callback();
		});
	});

	this.When(/^the client makes a request with valid origin and headers "(.*)"$/, function (customHeaders, callback) {
		const options = {
			url: `http://localhost:${config.public_port}/testCors`,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				Origin: this.accessControlAllow.origins[0],
				Referer: this.accessControlAllow.origins[0],
				[config.version.header]: world.versionHeader
			},
			method: 'OPTIONS'
		};

		customHeaders.split(',').forEach(function (customHeader) {
			options.headers[customHeader] = customHeader;
		});

		request(options, function (err, res) {
			assert.equal(err, null);
			world.getResponse().statusCode = res.statusCode;
			world.getResponse().headers = res.headers;

			return callback();
		});
	});

	this.When(/^the client makes a request with invalid origin$/, function (callback) {
		const options = {
			url: `http://localhost:${config.public_port}/testCors`,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				Origin: 'http://invalid.origin.com',
				Referer: 'http://invalid.origin.com',
				[config.version.header]: world.versionHeader
			},
			method: 'OPTIONS'
		};

		request(options, function (err, res) {
			assert.equal(err, null);
			world.getResponse().statusCode = res.statusCode;
			world.getResponse().headers = res.headers;
			return callback();
		});
	});
};
