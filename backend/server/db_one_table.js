/**
 * Created by yianni on 25/05/17.
 */

//TODO: Need to handle errors.

var locks = require('locks');
var ticket = require('./ticket');
var kanban = require('./kanban');

function Database(pool) {
  var rwlock = locks.createReadWriteLock();

  this.getTickets = function (pid, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT ticket_id, ticket_description, column_id FROM project WHERE project_id = $1::int', [pid],
          function (res) {
            var tickets = [];
            res.rows.forEach(function (row) {
              //Create ticket objects
              tickets.push(new ticket.Ticket(row["ticket_id"], row["ticket_description"], row["column_id"]));
            });
            rwlock.unlock();
            callback(tickets);
          });
    });
  };

  this.getKanban = function (pid, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT DISTINCT project_name, column_id, column_position FROM project WHERE project_id = $1::int ' +
          'ORDER BY column_position ASC', [pid], function (res) {

        var column_order = [];
        var project_name = null;
        res.rows.forEach(function (row) {
          //Get column ordering
          column_order.push(row["column_id"]);
          project_name = row["project_name"]
        });

        rwlock.unlock();
        callback(new kanban.Kanban(project_name, column_order));
      });
    });
  };

  this.newTicket = function (pid, ticket, columnName, callback) {
    rwlock.writeLock(function () {

      //Check if ticket already exists
      pool.query('SELECT project_name FROM project ' +
          'WHERE ticket_id = $1::int AND project_id = $2::int', [ticket.id, pid], function (check_ticket) {
        if (check_ticket.rows.length > 0) {
          throw new Error("Ticket already exists");
        }
      });

      //Collect information for column being moved into
      pool.query('SELECT column_id, column_position, project_name, column_title ' +
          'FROM project WHERE project_id = $1::int AND column_title = $2::text', [pid, columnName],
          function (columnInfoResponse) {

            var columnInfo = columnInfoResponse.rows;
            if (columnInfo.length === 0) throw new Error("New ticket can't be placed in a column that doesn't exist.");
            //Check all columns are the same

            for (var i = 1; i < columnInfo.length; i++) {
              if (columnInfo[i-1].column_id !== columnInfo[i].column_id)
                throw new Error("Column title has inconsistent associated values.");
            }

            columnInfo = columnInfo[0];

            try {
              pool.query('INSERT INTO project VALUES ($1::int, $2::text, $3::int, $4::text, ' +
                  '$5::int, $6::int, $7::text)', [pid, columnInfo['project_name'], ticket.column_id,
                columnInfo['column_title'], columnInfo['column_position'], ticket.id, ticket.desc],
                  function (insertion) {
                //handle dealing with insertion

                    callback(true);
                  });

            } catch (error) {
              console.error("Error creating new ticket in db.");
              console.error(error);
              throw new Error("Primary key value violated.");
            }
            rwlock.unlock();
          });
    });
  };

  this.moveTicket = function (pid, ticket, toColumnName, fromColumnName, callback) {
    rwlock.writeLock(function () {
      //Check valid current location
      pool.query('SELECT column_id FROM project WHERE' +
          ' column_name = $1::text AND ticket_id = $2::int AND project_id = $3::int', [fromColumnName, ticket.id, pid],
          function (checkCurrentColumn) {
            if (checkCurrentColumn.rows.length !== 1) throw new Error("Ticket is currently in multiple columns.");
          });

      //Get column information for toColumn
      pool.query('SELECT column_id, column_position FROM project ' +
          'WHERE project_id = $1::int AND column_title = $2::text', [pid, toColumnName],
          function (toColumnInfoResponse) {
            var toColumnInfo = toColumnInfoResponse.rows;
            if (toColumnInfo.length === 0) throw new Error("Can't move ticket to a column that doesn't exist.");

            if (!toColumnInfo.reduce(function (total, next) {
                  return total === next
                })) throw new Error("Column title has inconsistent associated values.");

            toColumnInfo = toColumnInfo[0];

            pool.query('UPDATE project SET column_id = $1::int, column_position = $2::int, column_title = $3::text ' +
                ' WHERE project_id = $4::int AND ticket_id = $5::int', [toColumnInfo["column_id"],
              toColumnInfo["column_position"], toColumnName, pid, ticket.id], function (res) {
              rwlock.unlock();
              callback(true);
            });
      });
    });
  };

  this.updateTicketDesc = function (pid, ticket, newDescription, callback) {
    rwlock.writeLock(function () {
      pool.query('UPDATE project SET ticket_description = $1::text ' +
          ' WHERE project_id = $2::int AND ticket_id = $3::int', [newDescription, pid, ticket.id], function (res) {

        rwlock.unlock();
        callback(true);
      });
    });
  };
}

module.exports.Database = Database;