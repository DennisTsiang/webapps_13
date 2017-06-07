
var locks = require('locks');
var ticket = require('./ticket');
var kanban = require('./kanban');
var column = require('./column');

function Database(pool) {
  var rwlock = locks.createReadWriteLock();
  var _this = this;

  this.newProject = function (project_name, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT Max(project_id) FROM project_table', [], function (res) {
        var pid;
        if (res.rows[0].max === null) {
          pid = 0;
        } else {
          pid = res.rows[0].max + 1;
        }
        console.log("New project id is " + pid);
        pool.query('INSERT INTO project_table VALUES($1::int, $2::text)', [pid, project_name], function (insertion) {
          pool.query('CREATE TABLE columns_' + pid + ' (' +
              'project_id integer, ' +
              'column_id integer, ' +
              'column_title varchar(255) not null, ' +
              'column_position integer not null, ' +
              'column_limit integer, ' +
              'PRIMARY KEY (project_id, column_id) )',
              [], function (create) {
                pool.query('CREATE TABLE tickets_' + pid + ' (' +
                    'ticket_id integer,' +
                    'column_id integer,' +
                    'project_id integer,' +
                    'ticket_description varchar(255),' +
                    'deadline varchar(30), ' +
                    'PRIMARY KEY (project_id, ticket_id) )',
                    [], function (finishedCreate) {
                      rwlock.unlock();
                      console.log("Created new project " + project_name);
                      callback(pid);
                    });
              });
        });
      });
    });
  };

  this.newColumn = function (pid, column_name, position, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT Max(column_id) FROM columns_' + pid, [], function (res) {
        var cid;
        if (res.rows[0].max === null) {
          cid = 0;
        } else {
          cid = res.rows[0].max + 1;
        }
        console.log("New column id is " + pid);
        pool.query('INSERT INTO columns_' + pid +' VALUES($1::int, $2::int, $3::text, $4::int)',
            [pid, cid, column_name, position], function (insertion) {
          rwlock.unlock();
          console.log("Create new column " + column_name + " in project " + pid);
          callback(cid, column_name, position);
        });
      });
    });
  };

  this.deleteProject = function (pid, callback) {
    rwlock.writeLock(function () {
      pool.query('DROP TABLE columns_' + pid, [], function (err, res) {
        pool.query('DELETE FROM project_table WHERE project_id = $1::int', [pid], function (err, res2) {
          pool.query('DROP TABLE tickets_' + pid, [], function (err, res3) {
            console.log('Deleted project ' + pid);
            rwlock.unlock();
            callback(true);
          });
        });
      });
    });
  };

  this.deleteColumn = function (pid, cid, columnPos, callback) {
    rwlock.writeLock(function () {
      pool.query('DELETE FROM columns_' + pid + ' WHERE column_id = $1::int', [cid], function (res) {
        pool.query('DELETE FROM tickets_' + pid + ' WHERE column_id = $1::int', [cid], function (res2) {
          pool.query('UPDATE columns_' + pid + ' SET column_position = column_position - 1' +
              ' WHERE column_position > $1::int', [columnPos], function (res3) {
            rwlock.unlock();
            callback(true);
          });
        });
      });
    });
  };

  this.moveColumn = function (pid, cid, fromPos, toPos, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT column_position FROM columns_' + pid + ' WHERE column_id = $1::int', [cid], function (res) {
        if (res.rows[0].column_position !== fromPos) {
          rwlock.unlock();
          console.error("Error moving column. FromPos: " + fromPos +
              " But column_position: " + res.rows[0].column_position);
          callback(false);
        } else {
          pool.query('UPDATE columns_' + pid + ' SET column_position = $2::int' +
              ' WHERE column_id = $1::int', [cid, toPos], function (res2) {
            if (toPos < fromPos) {
              pool.query('UPDATE columns_' + pid + ' SET column_position = column_position + 1' +
                  ' WHERE column_id != $1::int AND column_position < $2::int AND column_position >= $3::int',
                  [cid, fromPos, toPos], function (res3) {
                    rwlock.unlock();
                    callback(true);
                  });
            } else {
              pool.query('UPDATE columns_' + pid + ' SET column_position = column_position - 1' +
                  ' WHERE column_id != $1::int AND column_position > $2::int AND column_position <= $3::int',
                  [cid, fromPos, toPos], function (res3) {
                    rwlock.unlock();
                    callback(true);
                  });
            }
          });
        }
      });
    });
  };

  this.getTickets = function (pid, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT * FROM tickets_' + pid + ' ORDER BY ticket_id ASC', [], function(res) {
        var tickets = [];
        res.rows.forEach(function (row) {
          //Create ticket objects
          tickets.push(new ticket.Ticket(row["ticket_id"], row["column_id"],
              row["ticket_description"], row["deadline"]));
        });
        rwlock.unlock();
        callback(tickets);
      });
    });
  };

  this.getKanban = function (pid, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT project_id, project_name FROM project_table WHERE project_id = $1::int', [pid], function(res) {
        if (res.rows.length === 1) {
          pool.query('SELECT column_id, column_title, column_position FROM columns_' + pid +
              ' WHERE project_id = $1::int', [pid], function (res2) {
            if (res2.rows.length > 0) {
              var columns = [];
              res2.rows.forEach(function (row) {
                //Get column ordering
                var c = new column.Column(row["column_id"], row["column_title"], row["column_position"]);
                columns.push(c);
              });

              rwlock.unlock();
              callback(new kanban.Kanban(res.rows[0].project_id, res.rows[0].project_name, columns));
            } else {
              rwlock.unlock();
              callback(new kanban.Kanban(res.rows[0].project_id, res.rows[0].project_name, []));
            }
          });
        } else {
          rwlock.unlock();
        }
      });
    });
  };

  function newTicketHelper(pid, column_id, callback) {
    pool.query('SELECT Max(ticket_id) FROM tickets_' + pid, [], function (res) {
      var tid;
      if (res.rows[0].max === null) {
        tid = 0;
      } else {
        tid = res.rows[0].max + 1;
      }
      pool.query('INSERT INTO tickets_' + pid + ' VALUES($1::int, $2::int, $3::int, \'New Ticket\', NULL)',
          [tid, column_id, pid],
          function (insertion) {
            rwlock.unlock();
            callback(tid);
          });
    });
  };

  this.newTicket = function (pid, column_id, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT column_limit FROM columns_' + pid + ' WHERE column_id = $1::int', [column_id], function (res1) {
        if (res1.rows[0].column_limit !== null) {
          var column_limit = res1.rows[0].column_limit;
          pool.query('SELECT COUNT(ticket_id) as numberOfTickets FROM tickets_' + pid, [], function (res2) {
            if (res2.rows[0].numberoftickets >= column_limit) {
              rwlock.unlock();
              console.log("Reached maximum ticket limit for column_id: " + column_id);
              callback(-1); //-1 denotes invalid tid
            } else {
              newTicketHelper(pid, column_id, callback);
            }
          });
        } else {
          newTicketHelper(pid, column_id, callback);
        }
      });
    });
  };

  this.deleteTicket = function(pid, ticket_id, callback) {
    rwlock.writeLock(function () {
      pool.query('DELETE FROM tickets_' + pid + ' WHERE ticket_id = $1::int',
          [ticket_id], function (res) {
        rwlock.unlock();
        callback(true);
      });
    });
  };

  this.moveTicket = function (pid, ticket, toColumn, fromColumn, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT column_id FROM tickets_' + pid + ' WHERE ticket_id = $1::int',
          [ticket.ticket_id], function (checkResult) {
        if (checkResult.rows.length === 1) {
          if (checkResult.rows[0]["column_id"] == fromColumn) {
            pool.query('UPDATE tickets_' + pid + ' SET column_id = $1::int WHERE ticket_id = $2::int',
                [toColumn, ticket.ticket_id],
                function (insertion) {
                  rwlock.unlock();
                  callback(true);
                });
          } else {
            rwlock.unlock();
            console.error("The ticket that is moving is not in the given from column " + fromColumn);
            callback(false);
          }
        } else {
          rwlock.unlock();
          console.error("Error adding ticket: ticket does not exist in db.");
          callback(false);
        }
      });
    });
  };

  this.updateTicketDesc = function (pid, ticket, newDescription, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT ticket_id FROM tickets_' + pid + ' WHERE ticket_id = $1::int',
          [ticket.ticket_id], function (res) {
        if (res.rows.length === 1) {
          pool.query('UPDATE tickets_' + pid + ' SET ticket_description = $1::text WHERE ticket_id = $2::int',
              [newDescription, ticket.ticket_id],
            function (insertion) {
              rwlock.unlock();
              callback(true);
            });
        } else {
          rwlock.unlock();
          console.error("Ticket was not in database");
        }
      });
    });
  };

  this.updateColumnTitle = function (cid, pid, newTitle, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT column_id FROM columns_' + pid + ' WHERE column_id = $1::int',
          [cid], function (res) {
            if (res.rows.length === 1) {
              pool.query('UPDATE columns_' + pid + ' SET column_title = $1::text WHERE column_id = $2::int',
                  [newTitle, cid],
                  function (insertion) {
                    rwlock.unlock();
                    callback(true);
                  });
            } else {
              rwlock.unlock();
              console.error("Error: more than one column_id was returned");
            }
          });
    });
  };

   this.updateTicketDeadline = function (pid, ticket, datetime, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT ticket_id FROM tickets_' + pid + ' WHERE  ticket_id = $1::int',
          [ticket.ticket_id], function (res) {
            if (res.rows.length === 1) {
              pool.query('UPDATE tickets_' + pid + ' SET deadline = \'' + datetime +
                  '\' WHERE ticket_id = $1::int', [ticket.ticket_id], function (insertion) {
                    rwlock.unlock();
                    callback(true);
                  });
            } else {
              rwlock.unlock();
              console.error("Ticket was not in database");
            }
          });

    });
  };

  this.getUsersProjects = function (username, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT project_id, project_name FROM users NATURAL JOIN project_table ' +
          'WHERE username = $1::text', [username], function (res) {
        if (res.rows.length > 0) {
          var array = [];
          for (var row of res.rows) {
            array.push({project_id:row.project_id, title:row.project_name});
          }
          rwlock.unlock();
          callback(array);
        } else {
          rwlock.unlock();
          console.error("User does not exist in db");
        }
      });
    });
  };

  this.addUserToProject = function (username, pid, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT username FROM users WHERE username = $1::text AND project_id = $2::int',
          [username, pid], function (checkRes) {
        if (checkRes.rows.length === 0 ) {
          pool.query('INSERT INTO users VALUES($1::text, $2::int)', [username, pid], function (res) {
            rwlock.unlock();
            callback(true);
          });
        } else {
          rwlock.unlock();
          console.error("User already exists in db");
        }
      });
    })
  };

  this.addUserToTicket = function (username, tid, pid, callback) {
    rwlock.writeLock(function () {
      pool.query('SELECT username FROM user_tickets WHERE username = $1::text AND' +
          ' project_id = $2::int AND ticket_id = $3::int', [username, pid, tid], function (checkRes) {
        if (checkRes.rows.length === 0 ) {
          pool.query('INSERT INTO user_tickets VALUES($1::int, $2::int, $3::text)', [tid, pid, username],
          function (res) {
            rwlock.unlock();
            callback(true);
          });
        } else {
          rwlock.unlock();
          console.error("Mapping to ticket already exists");
        }
      });
    });
  };

  this.getUserTickets = function (username, pid, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT ticket_id FROM user_tickets WHERE username = $1::text AND ' +
          'project_id = $2::int', [username, pid], function (res) {
        if (res.rows.length > 0) {
          var array = [];
          for (var row of res.rows) {
            array.push(row.ticket_id);
          }
          rwlock.unlock();
          callback(array);
        } else {
          rwlock.unlock();
          console.error("User does not exist in db");
        }
      });
    });
  };

  this.getTicketUsers = function (pid, tid, callback) {
    rwlock.readLock(function () {
      pool.query('SELECT username FROM user_tickets WHERE ticket_id = $1::int AND ' +
          'project_id = $2::int', [tid, pid], function (res) {
        if (res.rows.length > 0) {
          var array = [];
          for (var row of res.rows) {
            array.push(row.username);
          }
          rwlock.unlock();
          callback(array);
        } else {
          rwlock.unlock();
          console.error("Ticket does not exist in db");
        }
      });
    });
  };
}

module.exports.Database = Database;
