//Constructor
function Ticket(ticket_id) {
  this.ticket_id = ticket_id;
  this.members = [];
  this.desc = "";
  this.col = -1;
  this.deadline = null;
  this.startdate = null;
  this.progress = 0;
  this.deadlineActive = false;

  this.addMembersToTicket = function(array) {
    for (let i = 0; i < array.length; i++) {
      this.members.push(array[i]);
    }
  };

  this.setDesc = function(text) {
    this.desc = text;
  };

  this.setColumn = function(n) {
    this.col = n;
  };


  //TODO:At the moment the start date updates when the deadline is made
  /*this.setDeadline = function(year, month, day, hours, minutes) {
    this.deadline = new Date(year, month - 1, day, hours, minutes);
    this.startdate = new Date();
    this.deadlineActive = true;

  };
  */

  this.setDeadline = function(deadline) {
   this.deadline = new Date(deadline);
   this.startdate = new Date();
   this.deadlineActive = true;
  };

  /*
  this.setDeadlineFlat = function(deadline) {
    if (deadline == null) {

      this.deadline = new Date();

    } else {

      let deadlineSplit = deadline.split(" ");
      this.setDeadline(deadlineSplit[0], deadlineSplit[1], deadlineSplit[2], deadlineSplit[3], deadlineSplit[4]);
    }
    this.startdate = new Date();
  };
  */

  this.resetDeadline = function() {
    this.startdate = new Date();
    this.deadline = new Date();
    this.deadlineActive = false;
    this.progress = 0;

  };


  this.updateProgress = function() {

    let endtime = this.deadline;
    let starttime = this.startdate;

    let currentDate = new Date();

    let timeWidth = endtime - starttime;

    if (timeWidth > 0) {


      let milliProgress = (currentDate.getTime() - starttime) / timeWidth
      this.progress = (milliProgress * 100);


      if (this.progress >= 100) {
        this.progress = 100;
        this.deadlineActive = false;
      }

    } else {
      this.progress = 0;
      this.deadlineActive = 0;
    }

  };
}
