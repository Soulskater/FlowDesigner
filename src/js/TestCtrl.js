/**
 * Created by gmeszaros on 9/8/2014.
 */
angular.module('TestModule', ['FlowDesigner'])
    .controller("TestCtrl", ['$scope', function ($scope) {
        $scope.tasks = [
            {
                Id: "e4931215-708e-419a-8810-06447e4a23b8",
                UserGivenDisplayName: null,
                Position: {
                    X: 39,
                    Y: 147
                },
                DisplayText: "Add",
                Groups: [
                    "Calculator"
                ],
                DotNetType: "",
                ContainerAssembly: "",
                InputProperties: [
                    {
                        "PropertyName": "Number1",
                        "LabelText": "Number 1",
                        "HintText": "The first number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": { "Key": null, "Value": null },
                        "Direction": 'input'
                    },
                    {
                        "PropertyName": "Number2",
                        "LabelText": "Number 2",
                        "HintText": "The second number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": { "Key": null, "Value": null },
                        "Direction": 'input'
                    }
                ],
                OutputProperties: [
                    {
                        "PropertyName": "Result",
                        "LabelText": "Result",
                        "HintText": "The result number",
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": { "Key": null, "Value": null },
                        "Direction": 'output'
                    }
                ],
                HelpText: "Add numbers"
            },
            {
                Id: "e2316215-708e-419a-8810-06447e4a23b8",
                UserGivenDisplayName: null,
                Position: {
                    X: 309,
                    Y: 147
                },
                DisplayText: "Create Hosts",
                Groups: [
                    "LogMeIn.User"
                ],
                DotNetType: "",
                ContainerAssembly: "",
                InputProperties: [],
                OutputProperties: [],
                HelpText: ""
            }
        ];
    }]);