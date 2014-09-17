/**
 * Created by gmeszaros on 8/15/2014.
 */
angular.module('Hammer.Directive', [])
    .directive('tap', function () {
        return {
            restrict: 'A',
            replace: true,
            link: function ($scope, element, attrs) {
                element.hammer({
                }).bind('tap', function (event) {
                    $scope.$apply(function () {
                        $scope.$eval(attrs.tap, { $event: event });
                    });
                });

                //
                //Disposing
                $scope.$on('$destroy', function () {
                    element.hammer().unbind('tap');
                });
            }
        };
    }).directive('doubleTap', function () {
        return {
            restrict: 'A',
            replace: true,
            link: function ($scope, element, attrs) {
                element.hammer({
                    taps: 2
                }).bind('tap', function (event) {
                    if (event.gesture.tapCount === 2) {
                        $scope.$apply(function () {
                            $scope.$eval(attrs.doubleTap, { $event: event });
                        });
                    }
                });

                //
                //Disposing
                $scope.$on('$destroy', function () {
                    element.hammer().unbind('tap');
                });
            }
        };
    }).directive('pan', function () {
        return {
            restrict: 'A',
            replace: true,
            link: function ($scope, element, attrs) {
                var refObj = null;
                element.hammer({
                }).bind('mousedown', function (event) {
                    if (event.button !== 0) {
                        return;
                    }
                    $scope.$apply(function () {
                        refObj = $scope.$eval(attrs.panStart, { $event: event});
                        $(document).bind('mousemove', function (event) {
                            $scope.$apply(function () {
                                $scope.$eval(attrs.pan, { $event: event, refObj: refObj});
                            });
                        });
                    });
                });
                $(document).bind('mouseup', function (event) {
                    $scope.$apply(function () {
                        $scope.$eval(attrs.panEnd, { $event: event, refObj: refObj});
                        refObj = null;
                        $(document).unbind('mousemove');
                    });
                });

                //
                //Disposing
                $scope.$on('$destroy', function () {
                    element.hammer().unbind('panmove');
                    element.hammer().unbind('panstart');
                    element.hammer().unbind('panend');
                });
            }
        };
    });