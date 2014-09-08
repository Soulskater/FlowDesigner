/**
 * Created by gmeszaros on 8/5/2014.
 */
angular.module('TaskRunner.Directive.Editor', ['TaskRunner.Directive'])
    .constant("types", {
        string: 'Text',
        bool: 'Bool',
        int: 'Number'
    })
    .controller("editorController", ['$scope', function ($scope) {

        var dragProperty = null;

        var getReferencedProperty = function (property, reference) {
            for (var i = 0; i < $scope.items.length; i++) {
                if ($scope.items[i].Id === reference.TaskId) {
                    var item = $scope.items[i];
                    var props = property.Direction === "input" ? item.OutputProperties : item.InputProperties;
                    for (var j = 0; j < props.length; j++) {
                        var prop = props[j];
                        if (reference.ReferencedProperty === prop.PropertyName) {
                            return prop;
                        }
                    }
                }
            }
            return null;
        };

        this.getReferencedItem = function (property, reference) {
            for (var i = 0; i < $scope.items.length; i++) {
                if ($scope.items[i].Id === reference.TaskId) {
                    var item = $scope.items[i];
                    var props = property.Direction === "input" ? item.OutputProperties : item.InputProperties;
                    for (var j = 0; j < props.length; j++) {
                        var prop = props[j];
                        if (reference.ReferencedProperty === prop.PropertyName) {
                            return {
                                x: item.Position.X,
                                y: item.Position.Y + 40 + (130 / (props.length + 1)) * (j + 1),
                                property: prop
                            };
                        }
                    }
                }
            }
            return null;
        };

        this.removeItem = function (item) {

            removeInputReferences(item);
            removeOutputReferences(item);
            $scope.items.splice($scope.items.indexOf(item), 1);
        };

        this.removeReference = function (property, reference) {
            if (!property || !property.References) {
                return;
            }
            property.References.splice(property.References.indexOf(reference), 1);
            var prop = getReferencedProperty(property, reference);
            prop.Reference = null;
        };

        this.propertyDragStart = function (itemId, property) {
            dragProperty = { itemId: itemId, property: property};
        };

        this.propertyDragEnd = function (itemId, property) {
            if (!dragProperty || !property) {
                return;
            }
            if (dragProperty.property.Direction === property.Direction) {
                dragProperty = null;
                return;
            }
            if (dragProperty.itemId === itemId) {
                dragProperty = null;
                return;
            }

            if (dragProperty.property.Direction === "input") {
                updateProperties(
                    { itemId: itemId, property: property }, dragProperty);
            }
            else {
                updateProperties(
                    dragProperty, { itemId: itemId, property: property });
            }
        };

        this.translatePosition = function (x, y) {
            return {
                x: x - $scope.offset.left,
                y: y - $scope.offset.top
            };
        };

        function removeInputReferences(item) {
            for (var i = 0; i < item.InputProperties.length; i++) {
                var inputProp = item.InputProperties[i];
                if (!inputProp.Reference) {
                    continue;
                }

                var referencedItem = $scope.items.filter(function (refItem) {
                    return refItem.Id === inputProp.Reference.TaskId;
                })[0];

                referencedItem.OutputProperties.forEach(function (outProp) {
                    var outReference = outProp.References.filter(function (outRef) {
                        return outRef.ReferencedProperty === inputProp.PropertyName;
                    });
                    if (outReference.length > 0) {
                        outProp.References.splice(outProp.References.indexOf(outReference[0]), 1);
                    }
                });
            }
        }

        function removeOutputReferences(item) {
            for (var i = 0; i < item.OutputProperties.length; i++) {
                var outputProp = item.OutputProperties[i];
                if (!outputProp.References || outputProp.References.length === 0) {
                    continue;
                }

                outputProp.References.forEach(function (outRefrerence) {
                    var referencedItem = $scope.items.filter(function (refItem) {
                        return refItem.Id === outRefrerence.TaskId;
                    })[0];

                    referencedItem.InputProperties.forEach(function (inputProp) {
                        if (outRefrerence.ReferencedProperty === inputProp.PropertyName) {
                            inputProp.Reference = null;
                        }
                    });
                });
            }
        }

        function updateProperties(outputProp, inputProp) {
            if (!outputProp.property.References) {
                outputProp.property.References = [];
            }
            for (var i = 0; i < outputProp.property.References.length; i++) {
                if (outputProp.property.References[i].TaskId === inputProp.itemId &&
                    outputProp.property.References[i].ReferenceProperty) {
                    return;
                }
            }
            outputProp.property.References.push({
                TaskId: inputProp.itemId,
                ReferencedProperty: inputProp.property.PropertyName
            });
            inputProp.property.Reference = {
                TaskId: outputProp.itemId,
                ReferencedProperty: outputProp.property.PropertyName
            };

        }
    }])
    .
    directive('editor', ["$timeout", function ($timeout) {
        return{
            restrict: "AE",
            transclude: false,
            replace: true,
            templateUrl: 'js/directives/editor/templates/editor.tmpl.html',
            scope: {
                autoSize: '=',
                items: '=',
                selectedChanged: '&'
            },
            controller: 'editorController',
            link: function ($scope, element, attrs) {
                if (!$scope.items) {
                    $scope.items = [];
                }
                $scope.offset = element.parent().offset();
                $scope.$on('itemAdded', function (event, sampleItem, mouseEvent) {
                    $scope.$apply(function () {
                        var newItem = angular.copy(sampleItem);
                        newItem.Position.X = mouseEvent.gesture.center.x - element.parent().offset().left;
                        newItem.Position.Y = mouseEvent.gesture.center.y - element.parent().offset().top;
                        $scope.items.push(newItem);
                        $scope.selectItem(newItem);
                    });
                });
                var prevX = 0;
                var prevY = 0;
                $scope.onDragStartItem = function (item, event) {
                    prevX = event.clientX - element.parent().offset().left;
                    prevY = event.clientY - element.parent().offset().top;
                };
                $scope.selectItem = function (item) {
                    for (var i = 0; i < $scope.items.length; i++) {
                        $scope.items[i].selected = false;
                    }
                    item.selected = true;
                    $scope.selectedChanged({task: item});
                };
                $scope.onDragItem = function (item, event) {
                    $scope.$apply(function () {
                        var x = event.gesture.center.x - element.parent().offset().left;
                        var y = event.gesture.center.y - element.parent().offset().top;
                        item.Position.X += x - prevX;
                        item.Position.Y += y - prevY;
                        prevX = x;
                        prevY = y;
                    });
                };
            }
        };
    }])
    .controller("itemController", ['$scope', function ($scope) {
    }])
    .directive('item', [ 'types', 'progressType', function ($types, $progressType) {
        return{
            restrict: "AE",
            require: '^editor',
            replace: true,
            templateUrl: 'js/directives/editor/templates/item.tmpl.html',
            transclude: true,
            scope: {
                width: "=",
                height: "=",
                data: '=',
                dragStartItem: '&',
                dragItem: '&',
                itemClick: '&'
            },
            controller: 'itemController',
            link: function ($scope, element, attrs, editorCtrl) {
                $scope.$progressType = $progressType;
                $scope.data.Status = $progressType.notrun;
                $scope.getReferencedItem = editorCtrl.getReferencedItem;
                $scope.selectReference = function (reference, property) {
                    /*$(document).click(function () {
                     if ($scope.selectedPropertyReference) {
                     $scope.selectedPropertyReference = null;
                     $(document).off('click');
                     }
                     });*/
                    if ($scope.selectedPropertyReference && property === $scope.selectedPropertyReference.property && reference === $scope.selectedPropertyReference.reference) {
                        $scope.selectedPropertyReference = null;
                    } else {
                        $scope.selectedPropertyReference = {reference: reference, property: property};
                    }
                };
                $scope.deleteReference = function () {
                    if (!$scope.selectedPropertyReference) {
                        return;
                    }
                    $scope.$apply(function () {
                        editorCtrl.removeReference($scope.selectedPropertyReference.property, $scope.selectedPropertyReference.reference);
                    });
                };

                $scope.onDragStartItem = function (event) {
                    $scope.dragStartItem({item: $scope.data, event: event});
                };
                $scope.onDragItem = function (event) {
                    $scope.dragItem({item: $scope.data, event: event});
                };
                $scope.removeItem = function () {
                    editorCtrl.removeItem($scope.data);
                };
                $scope.setReferenceStyle = function (property, reference) {
                    return{
                        string: property.PropertyValueType === $types.string,
                        bool: property.PropertyValueType === $types.bool,
                        number: property.PropertyValueType === $types.int,
                        selected: $scope.selectedPropertyReference && property === $scope.selectedPropertyReference.property && reference === $scope.selectedPropertyReference.reference
                    };
                };

                $(document).keydown(function (event) {
                    //
                    //Del button
                    if (event.keyCode === 46) {
                        $scope.deleteReference();
                    }
                });

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }])
    .directive('itemTitle', [function () {
        return{
            restrict: "E",
            replace: true,
            template: '<div class="font-m box-header" ng-transclude></div>',
            transclude: true,
            link: function ($scope, element, attrs) {
            }
        };
    }])
    .directive('itemDescription', [function () {
        return{
            restrict: "AE",
            replace: true,
            template: '<div class="font-xs" ng-transclude></div>',
            transclude: true,
            link: function ($scope, element, attrs, ctrl) {
            }
        };
    }])
    .directive('connector', ["types", function ($types) {
        return{
            restrict: "AE",
            replace: true,
            require: '^editor',
            templateUrl: 'js/directives/editor/templates/connector.tmpl.html',
            scope: {
                itemId: '=',
                property: '=',
                x: '=px',
                y: '=py'
            },
            link: function ($scope, element, attrs, editorCtrl) {
                var noReferences = $scope.property.Direction === "input" ? $scope.property.Reference === null : $scope.property.References === null;

                $scope.setStyle = function () {
                    return {
                        string: $scope.property.PropertyValueType === $types.string,
                        bool: $scope.property.PropertyValueType === $types.bool,
                        number: $scope.property.PropertyValueType === $types.int,
                        'no-value': noReferences && (!$scope.property.Value || $scope.property.Value === "")
                    };
                };
                $scope.dragging = false;
                $scope.currentPosition = {};

                $scope.startDrag = function () {
                    editorCtrl.propertyDragStart($scope.itemId, $scope.property);
                };
                $scope.onDrag = function (event) {
                    $scope.$apply(function () {
                        $scope.dragging = true;
                        $scope.currentPosition = editorCtrl.translatePosition(event.gesture.center.x - 2, event.gesture.center.y - 2);
                    });
                };

                /* $(document).mousemove(function (event) {
                 if (!$scope.dragging) {
                 return;
                 }
                 $scope.$apply(function () {
                 $scope.currentPosition = editorCtrl.translatePosition(event.clientX - 2, event.clientY - 2);
                 });
                 });*/
                $(document).mouseup(function (event) {
                    $scope.$apply(function () {
                        $scope.dragging = false;
                    });
                });

                //$scope.onDrag =
                $scope.endDrag = function () {
                    editorCtrl.propertyDragEnd($scope.itemId, $scope.property);
                };

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }]);