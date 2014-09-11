/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("designerCtrl", ['$scope', function ($scope) {
        $scope.size = {
            width: 0,
            height: 0
        };
        $scope.scale = {
            x: 1,
            y: 1
        };
        $scope.viewBox = null;
        $scope.onMouseWheel = function (event) {
            var step = 0.4;

            if (event.deltaY === -1) {
                if ($scope.scale.x - step <= 0 || $scope.scale.y - step <= 0) {
                    return;
                }
                $scope.scale = {
                    x: $scope.scale.x - step,
                    y: $scope.scale.y - step
                };
            }
            if (event.deltaY === 1) {
                $scope.scale = {
                    x: $scope.scale.x + step,
                    y: $scope.scale.y + step
                };
            }
        };
        $scope.$watchGroup(['size', 'scale'], function () {
            if ($scope.scale.x === 1 && $scope.scale.y === 1) {
                $scope.viewBox = null;
            }
            else {
                $scope.viewBox = {
                    x: 0,
                    y: 0,
                    width: $scope.size.width / $scope.scale.x,
                    height: $scope.size.height / $scope.scale.y
                };
            }
        });
    }]);