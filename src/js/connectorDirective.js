/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .directive('connector', ['types', 'direction', function ($types, $direction) {
        return{
            restrict: "AE",
            replace: true,
            require: '^designer',
            templateUrl: 'templates/connector.tmpl.html',
            scope: {
                itemData: '=',
                property: '=',
                index: '=',
                offset: '='
            },
            link: function ($scope, element, attrs, designerCtrl) {
                $scope.$direction = $direction;
                $scope.designer = designerCtrl;
                $scope.setStyle = function () {
                    return {
                        string: $scope.property.PropertyValueType === $types.string,
                        bool: $scope.property.PropertyValueType === $types.bool,
                        number: $scope.property.PropertyValueType === $types.int,
                        'no-value': !$scope.hasReference() && (!$scope.property.Value || $scope.property.Value === "")
                    };
                };
                $scope.hasReference = function () {
                    if ($scope.property.Direction === $direction.input) {
                        return $scope.property.Reference !== null;
                    } else {
                        return $scope.property.References.length !== 0;
                    }
                };
                $scope.newReference = null;
                $scope.drag = function ($event) {
                    $scope.newReference.x = ($event.clientX - 10) * (1 / $scope.designer.getScale().x);
                    $scope.newReference.y = ($event.clientY - 10) * (1 / $scope.designer.getScale().y);
                    $event.stopPropagation();
                };
                $scope.dragStart = function ($event) {
                    $scope.newReference = {
                        x: ($event.clientX - 10) * (1 / $scope.designer.getScale().x),
                        y: ($event.clientY - 10) * (1 / $scope.designer.getScale().y)
                    };
                    $event.stopPropagation();
                };
                $scope.dragEnd = function ($event) {
                    var itemId = $($event.target)[0].getAttribute('data-item-id');
                    var propertyName = $($event.target)[0].getAttribute('data-property-name');
                    if (!itemId || !propertyName) {
                        $scope.newReference = null;
                        return;
                    }
                    var refItem = $scope.designer.getItem(itemId);
                    var refProp = $scope.designer.getProperty(refItem, propertyName);
                    addReferences($scope.property, refProp, refItem);
                    $scope.newReference = null;
                    $event.stopPropagation();
                };
                $scope.property.calculatePosition = function () {
                    var props = $scope.property.Direction === $direction.input ? $scope.itemData.InputProperties : $scope.itemData.OutputProperties;
                    return{
                        x: $scope.property.Direction === $direction.input ? $scope.itemData.Position.X : $scope.itemData.Position.X + 250,
                        y: $scope.itemData.Position.Y + $scope.offset + ((170 - $scope.offset) / (props.length + 1)) * ($scope.index + 1)
                    };
                };
                $scope.property.removeReference = function (itemId, referencedProperty) {
                    var refItem = $scope.designer.getItem(itemId);
                    var refProp = $scope.designer.getProperty(refItem, referencedProperty);

                    if ($scope.property.Direction === $direction.input) {
                        $scope.property.Reference = null;
                    }
                    else {
                        linq($scope.property.References).remove(function (ref) {
                            return ref.TaskId === itemId && ref.ReferencedProperty === referencedProperty;
                        });
                    }
                    refProp.removeReference($scope.itemData.Id, $scope.property.PropertyName);
                };

                var addReferences = function (sourceProperty, targetProperty, targetItem) {
                    if (sourceProperty.Direction === $direction.input) {
                        sourceProperty.Reference = {
                            TaskId: targetItem.Id,
                            ReferencedProperty: targetProperty.PropertyName
                        };
                        targetProperty.References.push({
                            TaskId: $scope.itemData.Id,
                            ReferencedProperty: $scope.property.PropertyName
                        });
                    }
                    else {
                        targetProperty.Reference = {
                            TaskId: $scope.itemData.Id,
                            ReferencedProperty: $scope.property.PropertyName
                        };
                        sourceProperty.References.push({
                            TaskId: targetItem.Id,
                            ReferencedProperty: targetProperty.PropertyName
                        });
                    }
                };

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }]);