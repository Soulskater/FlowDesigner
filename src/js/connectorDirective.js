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
                $scope.selectedReference = null;
                $scope.drag = function ($event) {
                    $scope.selectedReference.x = ($event.clientX - 10) * (1 / $scope.designer.getScale().x);
                    $scope.selectedReference.y = ($event.clientY - 10) * (1 / $scope.designer.getScale().y);
                    $event.stopPropagation();
                };
                $scope.dragStart = function ($event) {

                    var reference = {
                        TaskId: "1bef54f6-1f30-4422-a5ec-a14ec946e2ce",
                        ReferencedProperty: "Email",
                        x: ($event.clientX - 10) * (1 / $scope.designer.getScale().x),
                        y: ($event.clientY - 10) * (1 / $scope.designer.getScale().y)
                    };
                    $scope.designer.startReferenceAdd(reference);
                    $scope.property.References.push(reference);
                    $scope.selectedReference = reference;
                    $event.stopPropagation();
                };
                $scope.dragCancel = function ($event) {
                    if ($scope.property.Direction === $direction.input) {
                        $scope.property.Reference = null;
                    }
                    else {
                        linq($scope.property.References).remove($scope.selectedReference);
                    }
                    $scope.selectedReference = null;
                };
                $scope.dragEnd = function ($event) {
                    $scope.designer.endReferenceAdd($scope.property);
                    $scope.selectedReference = null;

                    $event.stopPropagation();
                };

                //
                //It needs for angular, removes svg wrapper
                var e = angular.element(element.children());
                element.replaceWith(e);
            }
        };
    }]);