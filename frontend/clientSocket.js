var socket = null;

function initiateConnection() {
  //Set listener events
  socket = io();
  socket.on('connect', function () {
    setOnEvents()
  });
}

function setOnEvents() {
  socket.on('disconnect', function(){
    alert("Disconnected");
  });

  socket.on('requestreply', function(reply) {
    requestHandler(JSON.parse(reply));
  });

  socket.on('updatereply', function(reply){
    updateHandler(JSON.parse(reply));
  });

  socket.on('storereply', function(reply){
    storeHandler(JSON.parse(reply));
  });

  printSocketStatus();
  if (isSocketConnected()) {
    sendKanbanRequest(0/*pid*/);
  }
}

function printSocketStatus(){
  if (!socket.connected) {
    console.log("Not connected");
  } else {
    console.log("Client has successfully connected");
  }
}

//check socket status
function isSocketConnected() {
  return socket.connected;
}

function sendKanbanRequest(pid) {
  var ticketObj = {type : "kanban", pid : pid};
  socket.emit("request", JSON.stringify(ticketObj));
}

function sendTicketsRequest(pid) {
  var ticketObj = {type : "tickets", pid : pid};
  socket.emit("request", JSON.stringify(ticketObj));
}

function sendTicketUpdateMoved(ticket, pid, to, from) {
  var jsonString = {type: 'ticket_moved', ticket: ticket, pid : pid,
    to : to, from : from};
  socket.emit("update", JSON.stringify(jsonString));
}

function sendTicketUpdateInfo(ticket, pid, desc) {
  var jsonString = {type: "ticket_info", ticket: ticket, pid : pid, new_description : desc};
  socket.emit("update", JSON.stringify(jsonString));
}

function sendStoreTicket(type, pid, col_id) {
  var jsonString = {type:type, pid : pid, column_id: col_id};
  socket.emit("store", JSON.stringify(jsonString));
}

function sendTicketDelete(pid, ticket_id) {
  var jsonString = {type:'ticket_delete', pid : pid, ticket_id: ticket_id};
  socket.emit("update", JSON.stringify(jsonString));
}

function requestHandler(reply) {
  var type = reply.type;
  var request_data = reply.object;
  switch (type) {
    case "tickets" : {
      generateTickets(request_data);
      break;
    }
    case "kanban" : {
      generate_kanban(request_data);

      //Send for tickets, once received kanban.
      sendTicketsRequest(0/*pid*/);
      break;
    }
  }
}

function updateHandler(reply) {
  let type = reply.type;
  switch (type) {
    case "ticket_moved" : {
      move_tickets(reply.to_col, reply.from_col, reply.ticket_id);
      break;
    }
    case "ticket_info" : {
      let ticket = scope.project.columns[reply.col].tickets[reply.ticket_id];
      ticket.setDesc(reply.desc);
      ticket.setDeadline(7);
      break;
    }
    case 'ticket_delete' : {
      let ticket_id = reply.ticket_id;
      let project_id = reply.project_id;
      if (project_id == scope.pid) {
        delete_ticket(ticket_id);
      } else {
        console.error("Getting deletion info for different project.")
      }
      break;
    }
  }
}

function storeHandler(reply) {
  let type = reply.type;
  switch (type) {
    case "tickets": {//"newticket" : {
      //TODO: Right when new ticket is created we request the server makes the ticket, and it sends all the tickets
      // in the project back, like the getTickets request (hence type="tickets"). We only want the ticket that's been
      // created to be sent back.
      requestHandler(reply);
      break;
    }
  }
}
