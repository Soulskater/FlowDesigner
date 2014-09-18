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
                x: '=px',
                y: '=py'
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
                        TaskId: null,
                        ReferencedProperty: null,
                        x: ($event.clientX - 10) * (1 / $scope.designer.getScale().x),
                        y: ($event.clientY - 10) * (1 / $scope.designer.getScale().y)
                    };
                    $event.stopPropagation();
                };
                $scope.dragEnd = function ($event) {
                    var itemId = $($event.target).attr('data-item-id');
                    var propertyName = $($event.target).attr('data-property-name');
                    if (!itemId || !propertyName) {
                       removeReference($scope.newReference);
                    }
                    var refItem = $scope.designer.getItem(itemId);
                    var refProp = $scope.designer.getProperty(refItem, propertyName);
                    addTargetReference(refProp);

                    $event.stopPropagation();
                };

                var removeReference = function (reference) {
                    if ($scope.property.Direction === $direction.input) {
                        $scope.property.Reference = null;
                    }
                    else {
                        $scope.property.References.remove(reference);
                    }
                };

                var addTargetReference = function (targetProperty) {
                    if (targetProperty.Direction === $direction.input) {
                        targetProperty.Reference = {
                            TaskId: $scope.itemData.Id,
                            ReferencedProperty: $scope.property.PropertyName
                        };
                    }
                    else {
                        targetProperty.References.push({
                            TaskId: $scope.itemData.Id,
                            ReferencedProperty: $scope.property.PropertyName
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