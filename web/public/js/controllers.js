'use strict';

angular.module('lytup.controllers', [])
  .controller('HomeCtrl', [
    '$scope',
    '$window',
    '$location',
    '$log',
    'ngSocket',
    '$modal',
    'Restangular',
    function($scope, $window, $location, $log, ngSocket, $modal, Restangular) {
      $log.info('Home controller');
      var token = $window.localStorage.getItem('token');
      var ws = ngSocket('ws://localhost:1431/ws');
      $scope.user = {};
      $scope.folders = [];

      ws.onMessage(function(msg) {
        $log.info('message received', msg.data);
      });

      if (token) {
        Restangular.one('users').get().then(function(usr) {
          $scope.user = usr;
          $scope.user.token = token;
          $scope.folders = Restangular.all('folders').getList().$object;
        });
      }

      $scope.signupModal = function() {
        $modal.open({
          scope: $scope,
          controller: 'SignupModalCtrl',
          templateUrl: '/tpl/modals/signup.html',
          size: 'sm'
        });
      };

      $scope.signinModal = function() {
        $modal.open({
          scope: $scope,
          controller: 'SigninModalCtrl',
          templateUrl: '/tpl/modals/signin.html',
          size: 'sm'
        });
      };

      $scope.folderModal = function() {
        $modal.open({
          scope: $scope,
          controller: 'FolderModalCtrl',
          templateUrl: '/tpl/modals/folder.html',
          size: 'sm'
        });
      };

      $scope.signout = function() {
        $window.localStorage.removeItem('token');
        $scope.user = {};
        $location.path('/');
      };

      $scope.deleteFolder = function(fol) {
        fol.remove().then(function() {
          _.remove($scope.folders, {
            'id': fol.id
          });
        });
      };
    }
  ])
  .controller('FolderCtrl', [
    '$scope',
    '$routeParams',
    '$log',
    '$modal',
    'Restangular',
    '$upload',
    function($scope, $routeParams, $log, $modal, Restangular, $upload) {
      $log.info('Folder controller');
      $scope.folder = Restangular.one('folders', $routeParams.id).get().$object;

      $scope.folderModal = function() {
        $modal.open({
          scope: $scope,
          controller: 'FolderModalCtrl',
          templateUrl: '/tpl/modals/folder.html',
          size: 'sm'
        });
      };

      $scope.addFiles = function(files) {
        var fol = $scope.folder;

        _.forEach(files, function(file) {
          var f = _.pick(file, 'name', 'size', 'type');
          var i = fol.files.push(f) - 1;

          file.i = i; // Store the index for later user

          // Create file
          fol.post('files', f).then(function(f) {
            fol.files[i] = f;
            upload(file);
          });
        });
      };

      $scope.fileIcon = function(typ) {
        return /image/.test(typ) ? 'fa-file-image-o' :
          /audio/.test(typ) ? 'fa-file-audio-o' :
          /video/.test(typ) ? 'fa-file-video-o' :
          /wordprocessingml/.test(typ) ? 'fa-file-word-o' :
          /spreadsheetml/.test(typ) ? 'fa-file-excel-o' :
          /presentationml/.test(typ) ? 'fa-file-powerpoint-o' :
          /pdf/.test(typ) ? 'fa-file-pdf-o' :
          /text/.test(typ) ? 'fa-file-text-o' :
          /zip/.test(typ) ? 'fa-file-archive-o' :
          '';
      };

      $scope.deleteFile = function(id) {
        $scope.folder.one('files', id).remove().then(function() {
          _.remove($scope.folder.files, {
            'id': id
          });
        });
      };

      function upload(file) {
        var fol = $scope.folder;
        var f = fol.files[file.i];

        $upload.upload({
          url: '/u',
          file: file,
          data: {
            folId: fol.id,
            fileId: f.id
          }
        }).progress(function(evt) {
          f.loaded = Math.round(evt.loaded / evt.total * 100);
        }).success(function(file) {
          _.assign(f, _.omit(file, 'createdAt')); // https://code.google.com/p/go/issues/detail?id=5218
          // Update file
          f.patch(_.pick(f, 'loaded'));
        });
      }
    }
  ])
  .controller('FileCtrl', [
    '$scope',
    '$routeParams',
    '$log',
    'Restangular',
    function($scope, $routeParams, $log, Restangular) {
      $log.info('File controller');
      $scope.file = Restangular.one('files', $routeParams.id).get().$object;
    }
  ])
  .controller('SignupModalCtrl', [
    '$scope',
    '$window',
    '$log',
    '$modalInstance',
    'Restangular',
    function($scope, $window, $log, $modalInstance, Restangular) {
      $log.info('Signup modal controller');

      $scope.signup = function(user) {
        Restangular.all('users').post(user).then(function(usr) {
          $window.localStorage.setItem('token', usr.token);
          $scope.$parent.user = usr;
          $modalInstance.close();
        });
      };
    }
  ])
  .controller('SigninModalCtrl', [
    '$scope',
    '$window',
    '$log',
    '$modalInstance',
    'Restangular',
    function($scope, $window, $log, $modalInstance, Restangular) {
      $log.info('Signin modal controller');

      $scope.signin = function(user) {
        Restangular.all('users').all('login').post(user)
          .then(function(usr) {
            $window.localStorage.setItem('token', usr.token);
            $scope.$parent.user = usr;
            $scope.$parent.folders = Restangular.all('folders').getList().$object;
            $modalInstance.close();
          });
      };
    }
  ]).controller('FolderModalCtrl', [
    '$scope',
    '$location',
    '$log',
    '$modalInstance',
    'Restangular',
    function($scope, $location, $log, $modalInstance, Restangular) {
      $log.info('Folder modal controller');
      $scope.expiries = [{
        val: 1,
        lbl: '1 hour'
      }, {
        val: 4,
        lbl: '4 hours'
      }, {
        val: 24,
        lbl: '1 day'
      }, {
        val: 72,
        lbl: '3 days'
      }, {
        val: 168,
        lbl: '1 week'
      }];

      $scope.save = function(folder) {
        if (!folder.id) {
          // Create
          Restangular.all('folders').post(folder).then(function(fol) {
            $scope.folders.push(fol);
            $modalInstance.close();
            $location.path('/' + fol.id);
          });
        } else {
          // Update
          folder.patch(_.pick(folder, 'name', 'expiry'))
            .then(function(fol) {
              _.assign(folder, _.pick(fol, 'name', 'expiry', 'expiresAt'))
              $modalInstance.close();
              $location.path('/' + folder.id);
            });
        }
      };
    }
  ]);
