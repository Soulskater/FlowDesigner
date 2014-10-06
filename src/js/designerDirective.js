/**
 * Created by gmeszaros on 8/5/2014.
 */
angular.module('FlowDesigner', ['Svg.Directive', 'Touch.Directive', 'Common.Directive'])
    .constant("types", {
        text: 'Text',
        bool: 'Bool',
        int: 'Number'
    })
    .constant("status", {
        notrun: 'notrun',
        running: 'running',
        failed: 'failed',
        succeeded: 'succeeded'
    })
    .constant("direction", {
        input: 'input',
        output: 'output'
    })
    .directive('designer', ["$timeout", "pathService", function ($timeout, $path) {
        return{
            restrict: "AE",
            transclude: false,
            replace: true,
            templateUrl: $path.templatesBaseUrl + 'designer.tmpl.html',
            scope: {
                autoSize: '=',
                items: '=',
                selectedChanged: '&'
            },
            controller: 'designerCtrl',
            link: function ($scope, element, attrs) {
                $scope.size = {
                    width: element.width(),
                    height: element.height()
                };
                $scope.offset = {
                    x: element.offset().left,
                    y: element.offset().top
                };
            }
        };
    }]);