var expect = require('chai').expect;
var mocha = require('mocha');
var sinon = require('sinon');
var assert = require('assert');
var async = require('asyncawait/async');
var db = require('../../server/db_one_table');
var app = require('../../server/app');

describe('Database', function () {
  describe('getKanban', function () {
    var test_db = require('../test_db');
    var mock_db = new db.Database(test_db);
    mock_db.getKanban(1, function (something) {});
    it('calls query once when calling', function () {

      assert(test_db.query.calledOnce);
    });
    it('Calls correct query', function () {

      assert(test_db.query.calledWith('SELECT DISTINCT project_name, column_id, column_position FROM ' +
          'project WHERE project_id = $1::int ORDER BY column_position ASC'));
    });
  });
});

describe('Adapter', function () {
  describe('Handle Request', function () {
    var adapter = require('../test_db_adapter');
    var db = new adapter.Database();
    var mock_app = new app.App(db);
    var test = {type:'tickets'};

    mock_app.handleRequest(test, function (something) {});

    it('Calls ticket once', function () {
      assert(db.getTickets.calledOnce)
    });
  });
});

//TODO: Write server request tests
describe('Request', function() {
  describe('#handleRequest()', function() {

  });

  describe('#handleStore()', function () {

  });

  describe('#handleUpdate()', function () {

  });
});