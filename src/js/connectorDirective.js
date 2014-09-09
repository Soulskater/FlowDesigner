/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
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