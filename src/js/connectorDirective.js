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

            //
            //It needs for angular, removes svg wrapper
            var e = angular.element(element.children());
            element.replaceWith(e);
        }
    };
}]);