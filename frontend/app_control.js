/**
 * Created by yianni on 06/06/17.
 */

let app = angular.module('Kankan', ['ngAnimate', 'ngSanitize', 'ui.bootstrap', 'xeditable', 'ui.select', "ngRoute"]);

app.config(function($routeProvider) {
  $routeProvider
    .when('/login', {
      templateUrl: 'login.html',
      controller: 'LoginController'
    })
    .when('/kanban', {
      templateUrl: 'kanban.html',
    })
    .when('/home', {
      templateUrl: 'home.html',
      controller: 'HomeController'
    })
    .otherwise({
      redirectTo: '/login'
    });
});

app.controller('ApplicationCtrl', function($scope, $location) {
  $scope.projects = [];
  $scope.project = undefined;
  $scope.pid = undefined;

  $scope.l = $location;

  initiateConnection();
});

app.controller('HomeController', function($scope, $location) {
  if (get_kanban_scope().username === undefined) {
    $location.path('/login');
  } else {
    $scope.username = get_kanban_scope().username;

    getUserProjects($scope.username);
    $scope.a_k = get_kanban_scope();

    $scope.chooseProject = function(proj_id) {
      get_kanban_scope().pid = proj_id;
      $location.path('/kanban');
    };

    $scope.deleteProject = function(proj_id) {
      removeProject(proj_id)
    }

    $scope.logOut = function() {
      $location.path('/login')
      //$scope.a_k = get_kanban_scope();
    }
  }
});

app.controller('NewProjectPopoverCtrl', function($scope, $sce) {
  $scope.dynamicPopover = {
    templateUrl: 'NewProjectPopover.html'
  };
  $scope.newProject = function(project_name, url) {
    $scope.isOpen = false;
    sendStoreProject(project_name, url);
  }
});

app.controller('ProjectDropdownCtrl', function ($scope, $sce) {

});

app.controller('LoginController', function($scope, $location) {
  $scope.a_k = get_kanban_scope();

  $scope.login = function(name) {
    get_kanban_scope().username = name;
    sendUsernameCheck(name);
  };

  $scope.newUser = function(username) {
    get_kanban_scope().username = username;
    storeNewUser(username);
  }
});

app.controller('KanbanCtrl', function($scope, $location) {
  if (get_kanban_scope().pid === undefined) {
    $location.path('/login');
  } else {

    //Enable popovers
    $('[data-toggle="popover"]').popover();

    sendKanbanRequest(get_kanban_scope().pid);

    $scope.sendKanbanRequest = function(pid) {
      sendKanbanRequest(pid);
    };
  }


  $scope.goHome = function () {
    $location.path('/home');
  };

  $scope.getBorderColour = function(timeLeft, deadlineActive) {
    let css;

    if (deadlineActive) {
      if (timeLeft > 5) {
        css = {
          'border': '2px solid #26292e'

        };
      } else if(timeLeft > 2) {
        css = {
          'border': '2px solid #0000ff'
        };

      }else if(timeLeft > 1){
        css = {
          'border': '2px solid #ff9902'
        };

      }else if(timeLeft > 0.5){
        css = {
          'border': '2px solid #ff3300'
        };

      }else if(timeLeft > 0){
        css = {
          'border': '2px solid #ff0000'
        };
      }else{
        css = {
          'border': '2px solid #26292e'

        };

      }
    } else {
      css = {
        'border': '2px solid #26292e'

      };
    }
    return css;

  }
});

app.controller('ModalCtrl', function($compile, $scope, $uibModal, $log, $document) {
  let ctrl = this;

  ctrl.animationsEnabled = true;
  $scope.tid = -1;
  ctrl.open_ticket_editor = function(tid) {
    $scope.tid = tid;
    let modalInstance = $uibModal.open({
      animation: ctrl.animationsEnabled,
      ariaLabelledBy: 'ticket-info-title',
      ariaDescribedBy: 'ticket-info-modal-body',
      templateUrl: 'ticket-popup',
      controller: 'ModalInstanceCtrl',
      controllerAs: '$ctrl',
      windowClass: 'code-navigator-modal',
      size: 'lg',
      resolve: {

      }
    });
  };

  ctrl.open_edit_column = function() {
    let modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'edit-column-popup',
      controller: 'ModalInstanceCtrl',
      controllerAs: '$ctrl',
      size: 'lg',
      windowClass: 'edit-columns-popup',
      resolve: {

      }
    });
  };
});

var popupInstance = this;
angular.module('Kankan').controller('ModalInstanceCtrl', function($uibModalInstance) {
  let $ctrl = this;
  $ctrl.close = function() {
    $uibModalInstance.close($ctrl.selected);
  };

  $ctrl.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('editColumnCtrl', function($scope) {
  $scope.project = get_kanban_scope().project;

  $scope.addColumn = function() {
    sendStoreColumn($scope.project.project_id, "New column", Object.keys($scope.project.columns).length);
  };

  $scope.removeColumn = function(col) {
    removeColumn($scope.project.project_id, col.column_id, col.position);
  };


  $scope.updateColTitle = function(col, title) {
    updateColumnTitle(col.column_id, get_kanban_scope().pid, title);
  };
});

app.controller('DeadlineCtrl', function ($scope) {

});

app.controller('AddUsersCtrl', function ($uibModal, $log, $document) {
  var $ctrl = this;
  $ctrl.animationsEnabled = true;

  $ctrl.open = function (size, project) {
    var modalInstance = $uibModal.open({
      animation: $ctrl.animationsEnabled,
      ariaLabelledBy: 'modal-title',
      ariaDescribedBy: 'modal-body',
      templateUrl: 'AddUsersModal.html',
      controller: 'AddUsersInstanceCtrl',
      controllerAs: '$ctrl',
      size: size,
      resolve: {
        items: function () {
          return project;
        }
      }
    });
  };
});

app.controller('AddUsersInstanceCtrl', function ($uibModalInstance, items) {
  var $ctrl = this;
  $ctrl.title = items.title;

  $ctrl.ok = function () {
    $uibModalInstance.close();
  };

  $ctrl.addUser = function (username) {
    addUserToProject(username, items.project_id);
  }
});

app.controller('editTicketCtrl', function($scope) {

  $scope.dynamicPopover = {
    content: 'Hello world!',
    templateUrl: 'addUser.html',
    title: 'Title'
  };

  $scope.getProjectMembers = function() {
    return get_kanban_scope().project.members;
  };

  $scope.isMemberAddedToTicket = function (member) {
    return getTicket(getTid()).members.includes(member);
  };

  $scope.toggleMemberToTicket = function (member) {
    if ($scope.isMemberAddedToTicket(member)) {
      //remove member
      removeUserFromTicket(get_kanban_scope().pid, member, getTid());
    } else {
      //add member
      addUserToTicket(member, get_kanban_scope().pid, getTid());
    }
  };

  $scope.addUser = function (username) {
    addUserToTicket(username, get_kanban_scope().pid, $scope.tid);
  };

  function getTicket(id) {
    let k_scope = get_kanban_scope();
    return k_scope.project.tickets[id];
  }

  function getTid() {
    let sel = 'div[ng-controller="ModalCtrl as $ctrl"]';
    return angular.element(sel).scope().tid;
  }

  $scope.saveEditDeadline = function(deadline) {
    let ticket = getTicket($scope.tid);
    ticket.deadline = deadline;
    sendTicketUpdateDeadline(ticket, get_kanban_scope().pid, deadline);
    updateTicketTimes()


  };

  $scope.resetDeadline = function() {
    let ticket = getTicket($scope.tid);

    ticket.resetDeadline();
    sendTicketUpdateDeadline(ticket, get_kanban_scope().pid, ticket.deadline);
  };

  $scope.saveEditDesc = function(text) {
    let ticket = getTicket($scope.tid);
    if (ticket !== undefined) {
      sendTicketUpdateDesc(ticket, get_kanban_scope().pid, text);
    }
  };

  $scope.updateTimeLeft = function() {
    let ticket = getTicket($scope.tid);
    ticket.updateTimeLeft();
  };

  $scope.today = function() {
    $scope.dt = new Date();
  };

  $scope.clear = function() {
    $scope.dt = null;
  };

  $scope.inlineOptions = {
    customClass: getDayClass,
    minDate: new Date(),
    showWeeks: true
  };

  $scope.dateOptions = {
    formatYear: 'yy',
    minDate: new Date(),
    startingDay: 1
  };


  $scope.openCalendar = function() {
    $scope.popup.opened = true;
  };

  $scope.setDate = function(year, month, day) {
    $scope.dt.setFullYear(year, month, day);
  };

  $scope.popup = {
    opened: false
  };

  function getDayClass(data) {
    var date = data.date,
        mode = data.mode;
    if (mode === 'day') {
      var dayToCheck = new Date(date).setHours(0,0,0,0);

      for (var i = 0; i < $scope.events.length; i++) {
        var currentDay = new Date($scope.events[i].date).setHours(0,0,0,0);

        if (dayToCheck === currentDay) {
          return $scope.events[i].status;
        }
      }
    }

    return '';
  }

  $scope.toggleMode = function () {
    $scope.ismeridian = !$scope.ismeridian;
  };

  //Enables all popovers.
  $('[data-toggle="popover"]').popover();

  //Get users for this ticket.
  getTicketUsers(get_kanban_scope().pid, getTid());

  $scope.tid = getTid();
  $scope.ticket = getTicket($scope.tid);
  $scope.desc = $scope.ticket.desc;

  $scope.format = 'yyyy-MMMM-dd';
  $scope.today();
  $scope.dt = $scope.ticket.deadline;
  $scope.hstep = 1;
  $scope.mstep = 1;
  $scope.options = {
    hstep: [1, 2, 3],
    mstep: [1, 5, 10, 15, 25, 30]
  };

  $scope.ismeridian = true;
});

app.controller('deleteTicketCtrl', function($scope, $sce) {
  $scope.dynamicPopover = {
    content: 'Hello world!',
    templateUrl: 'yousurebutton.html',
    title: 'Title'
  };

  $scope.delete_ticket_button_click = function(id) {
    let info_header = $('#ticket_info_title')[0];

    //DIRTY - done to close modal.
    $scope.$parent.$parent.$close();

    removeTicket(get_kanban_scope().pid, id);
    delete_ticket(id, false);
  }
});

app.controller('DeadlineCollapseCtrl', function ($scope) {
  $scope.isCollapsed = true;
});

app.controller('CodeCtrl', function ($scope, $http) {
  $scope.wholeFile = true; //Default

  //TODO: Send request to server, for files beginning with val. Responds with filenames.
  $scope.getFile = function(file) {
    $scope.selectedFile = false;
    return $http.get('//maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: file,
        sensor: false
      }
    }).then(function(response){
      return response.data.results.map(function(item){
        return item.formatted_address;
      });
    });
  };

  $scope.selectFile = function ($item, $model, $label, $event) {
    console.log($item);
    //TODO: Select file

    $scope.selectedFile = true;
  };

  //TODO: Send request to server, for methods beginning with val. Responds with methodnames.
  $scope.getMethod = function(file, method) {
    $scope.selectedMethod = false;
    return $http.get('//maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: method,
        sensor: false
      }
    }).then(function(response){
      return response.data.results.map(function(item){
        return item.formatted_address;
      });
    });
  };

  $scope.selectMethod = function ($item, $model, $label, $event, file) {
    console.log($item);
    console.log(file);

    //TODO: Select method
    $scope.selectedMethod = true;
  };
});
