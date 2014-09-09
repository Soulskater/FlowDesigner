/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("designerCtrl", ['$scope', function ($scope) {
        $scope.size = {
            width: 100,
            height: 100
        };
        $scope.scale = {
            x: 0.5,
            y: 1
        };
        $scope.viewBox = null;
        $scope.$watch('size', function () {
            if ($scope.scale.x === 1 && $scope.scale.y === 1) {
                $scope.viewBox = null;
            }
            else {
                $scope.viewBox = {
                    x: 0,
                    y: 0,
                    width: $scope.size.width * $scope.scale.x,
                    height: $scope.size.height / $scope.scale.y
                };
            }
        });

    }]);