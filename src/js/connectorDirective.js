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
                        return $scope.property.Reference.Key !== null;
                    } else {
                        return $scope.property.References !== null;
                    }
                };
                $scope.drag = function ($event) {
                    linq($scope.property.References).forEach(function (reference) {
                        if (reference.State === 'new') {
                            reference.x = $event.clientX;
                            reference.y = $event.clientY;
                        }
                    });
                    $event.stopPropagation();
                };
                $scope.dragStart = function ($event) {
                    if (!$scope.property.References) {
                        $scope.property.References = [];
                    }
                    $scope.property.References.push({
                        Key: "referenced prop",
                        Value: "Valami",
                        State: "new"
                    });
                    $event.stopPropagation();
                };

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }]);