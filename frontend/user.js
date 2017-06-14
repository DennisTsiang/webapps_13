function User(username, image) {

  this.username = username;
  this.image = image;

  //List of projects by pid
  this.projects = [];

  this.setImage = function(image) {

    this.image = image;

  };

  this.setProjects = function(projects) {

    this.projects = projects;

  };

  this.addProject = function(project_id) {

    this.projects.push(project_id);

  };

}
