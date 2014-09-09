/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("itemCtrl", ['$scope', function ($scope) {
    }])
    .directive('item', [ 'types', 'progressType', function ($types, $progressType) {
        return{
            restrict: "AE",
            require: '^editor',
            replace: true,
            templateUrl: 'js/directives/editor/templates/item.tmpl.html',
            transclude: true,
            scope: {
                width: "=",
                height: "=",
                data: '=',
                dragStartItem: '&',
                dragItem: '&',
                itemClick: '&'
            },
            controller: 'itemCtrl',
            link: function ($scope, element, attrs, editorCtrl) {
                $scope.$progressType = $progressType;
                $scope.data.Status = $progressType.notrun;
                $scope.getReferencedItem = editorCtrl.getReferencedItem;
                $scope.selectReference = function (reference, property) {
                    if ($scope.selectedPropertyReference && property === $scope.selectedPropertyReference.property && reference === $scope.selectedPropertyReference.reference) {
                        $scope.selectedPropertyReference = null;
                    } else {
                        $scope.selectedPropertyReference = {reference: reference, property: property};
                    }
                };
                $scope.deleteReference = function () {
                    if (!$scope.selectedPropertyReference) {
                        return;
                    }
                    $scope.$apply(function () {
                        editorCtrl.removeReference($scope.selectedPropertyReference.property, $scope.selectedPropertyReference.reference);
                    });
                };

                $scope.onDragStartItem = function (event) {
                    $scope.dragStartItem({item: $scope.data, event: event});
                };
                $scope.onDragItem = function (event) {
                    $scope.dragItem({item: $scope.data, event: event});
                };
                $scope.removeItem = function () {
                    editorCtrl.removeItem($scope.data);
                };
                $scope.setReferenceStyle = function (property, reference) {
                    return{
                        string: property.PropertyValueType === $types.string,
                        bool: property.PropertyValueType === $types.bool,
                        number: property.PropertyValueType === $types.int,
                        selected: $scope.selectedPropertyReference && property === $scope.selectedPropertyReference.property && reference === $scope.selectedPropertyReference.reference
                    };
                };

                $(document).keydown(function (event) {
                    //
                    //Del button
                    if (event.keyCode === 46) {
                        $scope.deleteReference();
                    }
                });

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }])
    .directive('itemTitle', [function () {
        return{
            restrict: "E",
            replace: true,
            template: '<div class="font-m box-header" ng-transclude></div>',
            transclude: true,
            link: function ($scope, element, attrs) {
            }
        };
    }])
    .directive('itemDescription', [function () {
        return{
            restrict: "AE",
            replace: true,
            template: '<div class="font-xs" ng-transclude></div>',
            transclude: true,
            link: function ($scope, element, attrs, ctrl) {
            }
        };
    }])