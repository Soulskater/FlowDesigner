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
                        "Reference": null,
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
                        "Reference": null,
                        "Direction": 'input'
                    },
                    {
                        "PropertyName": "Number3",
                        "LabelText": "Number 2",
                        "HintText": "The second number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": null,
                        "Direction": 'input'
                    },
                    {
                        "PropertyName": "Number4",
                        "LabelText": "Number 2",
                        "HintText": "The second number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": null,
                        "Direction": 'input'
                    },
                    {
                        "PropertyName": "Number5",
                        "LabelText": "Number 2",
                        "HintText": "The second number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": null,
                        "Direction": 'input'
                    },
                    {
                        "PropertyName": "Number6",
                        "LabelText": "Number 2",
                        "HintText": "The second number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": null,
                        "Direction": 'input'
                    },
                    {
                        "PropertyName": "Number7",
                        "LabelText": "Number 2",
                        "HintText": "The second number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference": null,
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
                        "References": [],
                        /*"References": [
                            {
                                TaskId: "1bef54f6-1f30-4422-a5ec-a14ec946e2ce",
                                ReferencedProperty: "Number1"
                            }
                        ],*/
                        "Direction": 'output'
                    }
                ],
                HelpText: "Add numbers"
            },
            {
                Id: "1bef54f6-1f30-4422-a5ec-a14ec946e2ce",
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
                InputProperties: [
                    {
                        "PropertyName": "Number1",
                        "LabelText": "Number 1",
                        "HintText": "The first number to add",
                        "Required": true,
                        "DefaultValue": "10",
                        "PropertyValueType": "Number",
                        "Value": null,
                        "Reference":null,
                       /* "Reference": {
                            TaskId: "e4931215-708e-419a-8810-06447e4a23b8",
                            ReferencedProperty: "Result"
                        },*/
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
                        "Value": "test",
                        "References": [],
                        "Direction": 'output'
                    }
                ],
                HelpText: ""
            },
            {
                Id: "1caf54f6-1f30-4422-a5ec-a14ec946e2ce",
                UserGivenDisplayName: null,
                Position: {
                    X: 809,
                    Y: 147
                },
                DisplayText: "Create Hosts2",
                Groups: [
                    "LogMeIn.User"
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
                        "Reference":null,
                        /* "Reference": {
                         TaskId: "e4931215-708e-419a-8810-06447e4a23b8",
                         ReferencedProperty: "Result"
                         },*/
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
                        "References": [],
                        "Direction": 'output'
                    }
                ],
                HelpText: ""
            }
        ];
    }]);