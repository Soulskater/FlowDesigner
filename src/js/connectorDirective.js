/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .directive('connector', ['types', 'direction', function ($types, $direction) {
        return{
            restrict: "AE",
            replace: true,
            require: '^designer',
            templateUrl: 'src/templates/connector.tmpl.html',
            controller: 'connectorCtrl',
            scope: {
                itemData: '=',
                property: '=',
                index: '=',
                offset: '='
            },
            link: function ($scope, element, attrs, designerCtrl) {
                $scope.designer = designerCtrl;

                //region Add functions to property object

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
                        if ($scope.property.Reference === null) {
                            return;
                        }
                        $scope.property.Reference = null;
                    }
                    else {
                        if ($scope.property.References.length === 0) {
                            return;
                        }
                        linq($scope.property.References).remove(function (ref) {
                            return ref.TaskId === itemId && ref.ReferencedProperty === referencedProperty;
                        });
                    }
                    refProp.removeReference($scope.itemData.Id, $scope.property.PropertyName);
                };

                //endregion Add functions to property object

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }]);