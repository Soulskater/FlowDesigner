/**
 * Created by gmeszaros on 9/8/2014.
 */
angular.module('TestModule', ['FlowDesigner'])
    .controller("TestCtrl", ['$scope', function ($scope) {
        $scope.tasks=[
            {
                Id: "e4931215-708e-419a-8810-06447e4a23b8",
                UserGivenDisplayName: null,
                Position: {
                    X: 39,
                    Y: 147
                },
                DisplayText: "Register User",
                Groups: [
                    "LogMeIn.User"
                ],
                DotNetType: "Automation.LogMeInTasks.User.RegisterUser",
                ContainerAssembly: "Automation.LogMeInTasks, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null",
                InputProperties: [],
                OutputProperties: [],
                HelpText: "Registers a new LogMeIn user"
            }
        ];
    }]);