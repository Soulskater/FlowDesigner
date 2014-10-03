/**
 * Created by MCG on 2014.09.09..
 */
angular.module('Common.Directive', [])
    .directive('ngMousewheel', [function () {
        return{
            restrict: 'A',
            require: '?ngModel',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                element.mousewheel(function (event) {
                    $scope.$apply(function () {
                        $scope.$eval(attrs.ngMousewheel, {event: event});
                    });
                });
            }
        };
    }]);
/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("connectorCtrl", ['$scope', 'types', 'direction', function ($scope, $types, $direction) {
        $scope.$direction = $direction;
        $scope.newReference = null;
        $scope.selectedReference = null;
        $scope.hasReference = function () {
            if ($scope.property.Direction === $direction.input) {
                return $scope.property.Reference !== null;
            } else {
                return $scope.property.References.length !== 0;
            }
        };
        $scope.setStyle = function () {
            return {
                string: $scope.property.PropertyValueType === $types.string,
                bool: $scope.property.PropertyValueType === $types.bool,
                number: $scope.property.PropertyValueType === $types.int,
                'no-value': !$scope.hasReference() && (!$scope.property.Value || $scope.property.Value === "")
            };
        };

        $scope.selectReference = function (reference) {
            $scope.selectedReference = reference;
        };

        //region Dragging new reference

        $scope.drag = function ($event) {
            setNewReferencePosition($event.clientX, $event.clientY);
            $event.stopPropagation();
        };
        $scope.dragStart = function ($event) {
            setNewReferencePosition($event.clientX, $event.clientY);
            $event.stopPropagation();
        };
        $scope.dragEnd = function ($event) {
            var itemId = $($event.target)[0].getAttribute('data-item-id');
            var propertyName = $($event.target)[0].getAttribute('data-property-name');
            if (!itemId || !propertyName) {
                $scope.newReference = null;
                return;
            }
            var refItem = $scope.designer.getItem(itemId);
            var refProp = $scope.designer.getProperty(refItem, propertyName);
            addReferences($scope.property, refProp, refItem);
            $scope.newReference = null;
            $event.stopPropagation();
        };

        //endregion Dragging new reference

        //region Private functions

        var addReferences = function (sourceProperty, targetProperty, targetItem) {
            if (sourceProperty.Direction === $direction.input) {
                sourceProperty.Reference = {
                    TaskId: targetItem.Id,
                    ReferencedProperty: targetProperty.PropertyName
                };
                targetProperty.References.push({
                    TaskId: $scope.itemData.Id,
                    ReferencedProperty: $scope.property.PropertyName
                });
            }
            else {
                targetProperty.Reference = {
                    TaskId: $scope.itemData.Id,
                    ReferencedProperty: $scope.property.PropertyName
                };
                sourceProperty.References.push({
                    TaskId: targetItem.Id,
                    ReferencedProperty: targetProperty.PropertyName
                });
            }
        };
        var setNewReferencePosition = function (x, y) {
            $scope.newReference = {
                x: (x - $scope.designer.getOffset().x) * (1 / $scope.designer.getScale().x) + $scope.designer.getViewBox().x - 1,
                y: (y - $scope.designer.getOffset().y) * (1 / $scope.designer.getScale().y) + $scope.designer.getViewBox().y - 1
            };
        };

        //endregion Private functions

        //
        //Disposing
        $scope.$on('$destroy', function () {
        });
    }])
;
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
/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("designerCtrl", ['$scope', 'direction', function ($scope, $direction) {
        var self = this;

        $scope.size = {
            width: 0,
            height: 0
        };
        $scope.scale = {
            x: 1,
            y: 1
        };
        $scope.viewBox = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        $scope.moving = false;

        //region Controller functions

        this.getScale = function () {
            return $scope.scale;
        };

        this.getOffset = function () {
            return { x: $scope.offset.x, y: $scope.offset.y};
        };

        this.getViewBox = function () {
            return $scope.viewBox;
        };

        this.getItem = function (itemId) {
            return linq($scope.items).first(function (item) {
                return item.Id === itemId;
            });
        };

        this.getProperty = function (item, propertyName) {
            var prop = linq(item.InputProperties).firstOrDefault(function (property) {
                return property.PropertyName === propertyName;
            });
            if (prop) {
                return prop;
            }

            return linq(item.OutputProperties).firstOrDefault(function (property) {
                return property.PropertyName === propertyName;
            });
        };

        this.getReferencedProperty = function (reference) {
            var item = self.getItem(reference.TaskId);
            var prop = self.getProperty(item, reference.ReferencedProperty);

            return prop;
        };

        //endregion Controller functions

        //region Designer item handling

        this.selectItem = function (selectedItem) {
            linq($scope.items).forEach(function (item) {
                item.selected = false;
            });
            selectedItem.selected = true;
            $scope.selectedChanged({item: selectedItem});

        };

        this.removeItem = function (item) {
            linq(item.InputProperties).forEach(function (prop) {
                if (prop.Reference) {
                    debugger;
                    prop.removeReference(prop.Reference.TaskId, prop.Reference.ReferencedProperty);
                }
            });

            linq(item.OutputProperties).forEach(function (prop) {
                linq(prop.References).forEach(function (reference) {
                    prop.removeReference(reference.TaskId, reference.ReferencedProperty);
                });
            });

            linq($scope.items).remove(item);
        };

        //endregion Designer item handling

        //region Zooming

        $scope.onMouseWheel = function (event) {
            var step = 0.1;

            if (event.deltaY === -1) {
                if ($scope.scale.x - step <= 0 || $scope.scale.y - step <= 0) {
                    return;
                }
                $scope.scale.x -= step;
                $scope.scale.y -= step;
            }
            if (event.deltaY === 1) {
                $scope.scale.x += step;
                $scope.scale.y += step;

                //$scope.viewBox.x += event.clientX - ($scope.viewBox.width / 2);
                //$scope.viewBox.y += event.clientY - ($scope.viewBox.height / 2);
            }
            event.preventDefault();
        };

        function _updateViewBoxSize() {
            $scope.viewBox.width = $scope.size.width / $scope.scale.x;
            $scope.viewBox.height = $scope.size.height / $scope.scale.y;
        }

        var sizeWatcher = $scope.$watch('size', _updateViewBoxSize, true);
        var scaleWatcher = $scope.$watch('scale', _updateViewBoxSize, true);

        //endregion Zooming

        // region Viewbox moving

        var moveX, moveY = 0;
        $scope.moveStart = function ($event) {
            moveX = $event.clientX;
            moveY = $event.clientY;
            $scope.moving = true;
        };

        $scope.move = function ($event) {
            var x = $event.clientX;
            var y = $event.clientY;
            debugger;
            $scope.viewBox.x -= (x - moveX) * (1 / $scope.scale.x);
            $scope.viewBox.y -= (y - moveY) * (1 / $scope.scale.y);
            moveX = x;
            moveY = y;
        };

        $scope.moveEnd = function ($event) {
            $scope.moving = false;
        };

        //endregion Viewbox moving

        //
        //Disposing
        $scope.$on('$destroy', function () {
            sizeWatcher();
            scaleWatcher();
        });
    }])
;
/**
 * Created by gmeszaros on 8/5/2014.
 */
angular.module('FlowDesigner', ['Svg.Directive', 'Hammer.Directive', 'Common.Directive'])
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
    .directive('designer', ["$timeout", function ($timeout) {
        return{
            restrict: "AE",
            transclude: false,
            replace: true,
            templateUrl: 'src/templates/designer.tmpl.html',
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
                element.bind('mousedown', function (event) {
                    if (event.button !== 0) {
                        return;
                    }
                    $scope.$apply(function () {
                        $scope.$eval(attrs.panBegin, { $event: event});
                        $(document).bind('mousemove', function (event) {
                            $scope.$apply(function () {
                                $scope.$eval(attrs.pan, { $event: event });
                            });
                        });
                        $(document).bind('mouseup', function (event) {
                            $scope.$apply(function () {
                                $scope.$eval(attrs.panRelease, { $event: event });
                                $(document).unbind('mousemove');
                                $(document).unbind('mouseup');
                            });
                        });
                    });
                });
                //
                //Disposing
                $scope.$on('$destroy', function () {
                    element.unbind('mousedown');
                });
            }
        };
    });
/**
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("itemCtrl", ['$scope', 'types', 'status', function ($scope, $types, $status) {
        $scope.$status = $status;
        $scope.$types = $types;
        $scope.width = 250;
        $scope.height = 170;
        var dragX, dragY = 0;
        $scope.dragStart = function ($event) {
            dragX = $event.clientX;
            dragY = $event.clientY;
            $event.stopPropagation();
        };
        $scope.drag = function ($event) {
            var x = $event.clientX;
            var y = $event.clientY;
            $scope.data.Position.X += (x - dragX) * (1/$scope.designer.getScale().x);
            $scope.data.Position.Y += (y - dragY) * (1/$scope.designer.getScale().y);
            dragX = x;
            dragY = y;
            $event.stopPropagation();
        };
    }])
    .directive('designerItem', [ 'types', 'status', function ($types, $status) {
        return{
            restrict: "AE",
            require: '^designer',
            replace: true,
            templateUrl: 'src/templates/item.tmpl.html',
            transclude: true,
            scope: {
                data: '=',
                offsetX: '=',
                offsetY: '='
            },
            controller: 'itemCtrl',
            link: function ($scope, element, attrs, designerCtrl) {
                $scope.data.Status = $status.notrun;
                $scope.designer = designerCtrl;
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
/**
 * Created by gmeszaros on 8/5/2014.
 */
angular.module('Svg.Directive', [])
    .directive('ngWidth', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngWidth, function (width) {
                    element.attr("width", width);
                });
            }
        };
    }])
    .directive('ngHeight', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngHeight, function (height) {
                    element.attr("height", height);
                });
            }
        };
    }])
    .directive('ngX', ['$compile', function ($compile) {
        return{
            restrict: 'A',
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngX, function (x) {
                    element.attr("x", x);
                });
            }
        };
    }])
    .directive('ngY', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngY, function (y) {
                    element.attr("y", y);
                });
            }
        };
    }])
    .directive('ngCx', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngCx, function (cx) {
                    element.attr("cx", cx);
                });
            }
        };
    }])
    .directive('ngCy', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngCy, function (cy) {
                    element.attr("cy", cy);
                });
            }
        };
    }])
    .directive('ngX1', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngX1, function (x1) {
                    element.attr("x1", x1);
                });
            }
        };
    }])
    .directive('ngX2', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngX2, function (x2) {
                    element.attr("x2", x2);
                });
            }
        };
    }])
    .directive('ngY1', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngY1, function (y1) {
                    element.attr("y1", y1);
                });
            }
        };
    }])
    .directive('ngY2', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngY2, function (y2) {
                    element.attr("y2", y2);
                });
            }
        };
    }])
    .directive('autoSize', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $(window).resize(function () {
                    $scope.$apply(function () {
                        $scope.size = {
                            width: element.width(),
                            height: element.height()
                        };
                    });
                });
            }
        };
    }])
    .directive('ngViewbox', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                $scope.$watch(attrs.ngViewbox, function (viewbox) {
                    if (!viewbox) {
                        return;
                    }
                    var value = viewbox.x + " " + viewbox.y + " " + viewbox.width + " " + viewbox.height;
                    element[0].setAttribute("viewBox", value);
                }, true);
            }
        };
    }])
    .directive('textEllipsis', [function () {
        return{
            restrict: 'A',
            replace: true,
            scope: false,
            link: function ($scope, element, attrs) {
                var maxWidth = parseFloat(attrs.maxWidth);
                var value = $scope.$eval(attrs.textEllipsis);
                element.text(value);
                if (element.width() > maxWidth) {
                    while (element.width() > maxWidth) {
                        value = value.substring(0, value.length - 1);
                        element.text(value.substring(0, value.length - 1) + '...');
                    }
                }
            }
        };
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbkRpcmVjdGl2ZS5qcyIsImNvbm5lY3RvckN0cmwuanMiLCJjb25uZWN0b3JEaXJlY3RpdmUuanMiLCJkZXNpZ25lckN0cmwuanMiLCJkZXNpZ25lckRpcmVjdGl2ZS5qcyIsImhhbW1lckRpcmVjdGl2ZS5qcyIsIml0ZW1EaXJlY3RpdmUuanMiLCJzdmdEaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZmxvd0Rlc2lnbmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZWQgYnkgTUNHIG9uIDIwMTQuMDkuMDkuLlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0NvbW1vbi5EaXJlY3RpdmUnLCBbXSlcclxuICAgIC5kaXJlY3RpdmUoJ25nTW91c2V3aGVlbCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXF1aXJlOiAnP25nTW9kZWwnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdXNld2hlZWwoZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5uZ01vdXNld2hlZWwsIHtldmVudDogZXZlbnR9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOS85LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJylcclxuICAgIC5jb250cm9sbGVyKFwiY29ubmVjdG9yQ3RybFwiLCBbJyRzY29wZScsICd0eXBlcycsICdkaXJlY3Rpb24nLCBmdW5jdGlvbiAoJHNjb3BlLCAkdHlwZXMsICRkaXJlY3Rpb24pIHtcclxuICAgICAgICAkc2NvcGUuJGRpcmVjdGlvbiA9ICRkaXJlY3Rpb247XHJcbiAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkUmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAkc2NvcGUuaGFzUmVmZXJlbmNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2UgIT09IG51bGw7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZXMubGVuZ3RoICE9PSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuc2V0U3R5bGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdHJpbmc6ICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eVZhbHVlVHlwZSA9PT0gJHR5cGVzLnN0cmluZyxcclxuICAgICAgICAgICAgICAgIGJvb2w6ICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eVZhbHVlVHlwZSA9PT0gJHR5cGVzLmJvb2wsXHJcbiAgICAgICAgICAgICAgICBudW1iZXI6ICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eVZhbHVlVHlwZSA9PT0gJHR5cGVzLmludCxcclxuICAgICAgICAgICAgICAgICduby12YWx1ZSc6ICEkc2NvcGUuaGFzUmVmZXJlbmNlKCkgJiYgKCEkc2NvcGUucHJvcGVydHkuVmFsdWUgfHwgJHNjb3BlLnByb3BlcnR5LlZhbHVlID09PSBcIlwiKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5zZWxlY3RSZWZlcmVuY2UgPSBmdW5jdGlvbiAocmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJlZmVyZW5jZSA9IHJlZmVyZW5jZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL3JlZ2lvbiBEcmFnZ2luZyBuZXcgcmVmZXJlbmNlXHJcblxyXG4gICAgICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICBzZXROZXdSZWZlcmVuY2VQb3NpdGlvbigkZXZlbnQuY2xpZW50WCwgJGV2ZW50LmNsaWVudFkpO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuZHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICBzZXROZXdSZWZlcmVuY2VQb3NpdGlvbigkZXZlbnQuY2xpZW50WCwgJGV2ZW50LmNsaWVudFkpO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuZHJhZ0VuZCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGl0ZW1JZCA9ICQoJGV2ZW50LnRhcmdldClbMF0uZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0taWQnKTtcclxuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9ICQoJGV2ZW50LnRhcmdldClbMF0uZ2V0QXR0cmlidXRlKCdkYXRhLXByb3BlcnR5LW5hbWUnKTtcclxuICAgICAgICAgICAgaWYgKCFpdGVtSWQgfHwgIXByb3BlcnR5TmFtZSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHJlZkl0ZW0gPSAkc2NvcGUuZGVzaWduZXIuZ2V0SXRlbShpdGVtSWQpO1xyXG4gICAgICAgICAgICB2YXIgcmVmUHJvcCA9ICRzY29wZS5kZXNpZ25lci5nZXRQcm9wZXJ0eShyZWZJdGVtLCBwcm9wZXJ0eU5hbWUpO1xyXG4gICAgICAgICAgICBhZGRSZWZlcmVuY2VzKCRzY29wZS5wcm9wZXJ0eSwgcmVmUHJvcCwgcmVmSXRlbSk7XHJcbiAgICAgICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gRHJhZ2dpbmcgbmV3IHJlZmVyZW5jZVxyXG5cclxuICAgICAgICAvL3JlZ2lvbiBQcml2YXRlIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICB2YXIgYWRkUmVmZXJlbmNlcyA9IGZ1bmN0aW9uIChzb3VyY2VQcm9wZXJ0eSwgdGFyZ2V0UHJvcGVydHksIHRhcmdldEl0ZW0pIHtcclxuICAgICAgICAgICAgaWYgKHNvdXJjZVByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgc291cmNlUHJvcGVydHkuUmVmZXJlbmNlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIFRhc2tJZDogdGFyZ2V0SXRlbS5JZCxcclxuICAgICAgICAgICAgICAgICAgICBSZWZlcmVuY2VkUHJvcGVydHk6IHRhcmdldFByb3BlcnR5LlByb3BlcnR5TmFtZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHRhcmdldFByb3BlcnR5LlJlZmVyZW5jZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgVGFza0lkOiAkc2NvcGUuaXRlbURhdGEuSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlOYW1lXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldFByb3BlcnR5LlJlZmVyZW5jZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6ICRzY29wZS5pdGVtRGF0YS5JZCxcclxuICAgICAgICAgICAgICAgICAgICBSZWZlcmVuY2VkUHJvcGVydHk6ICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VQcm9wZXJ0eS5SZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIFRhc2tJZDogdGFyZ2V0SXRlbS5JZCxcclxuICAgICAgICAgICAgICAgICAgICBSZWZlcmVuY2VkUHJvcGVydHk6IHRhcmdldFByb3BlcnR5LlByb3BlcnR5TmFtZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHZhciBzZXROZXdSZWZlcmVuY2VQb3NpdGlvbiA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICAgICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiAoeCAtICRzY29wZS5kZXNpZ25lci5nZXRPZmZzZXQoKS54KSAqICgxIC8gJHNjb3BlLmRlc2lnbmVyLmdldFNjYWxlKCkueCkgKyAkc2NvcGUuZGVzaWduZXIuZ2V0Vmlld0JveCgpLnggLSAxLFxyXG4gICAgICAgICAgICAgICAgeTogKHkgLSAkc2NvcGUuZGVzaWduZXIuZ2V0T2Zmc2V0KCkueSkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLnkpICsgJHNjb3BlLmRlc2lnbmVyLmdldFZpZXdCb3goKS55IC0gMVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIFByaXZhdGUgZnVuY3Rpb25zXHJcblxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB9KTtcclxuICAgIH1dKVxyXG47IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuZGlyZWN0aXZlKCdjb25uZWN0b3InLCBbJ3R5cGVzJywgJ2RpcmVjdGlvbicsIGZ1bmN0aW9uICgkdHlwZXMsICRkaXJlY3Rpb24pIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6ICdeZGVzaWduZXInLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3NyYy90ZW1wbGF0ZXMvY29ubmVjdG9yLnRtcGwuaHRtbCcsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb25uZWN0b3JDdHJsJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIGl0ZW1EYXRhOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogJz0nLFxyXG4gICAgICAgICAgICAgICAgaW5kZXg6ICc9JyxcclxuICAgICAgICAgICAgICAgIG9mZnNldDogJz0nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBkZXNpZ25lckN0cmwpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5kZXNpZ25lciA9IGRlc2lnbmVyQ3RybDtcclxuXHJcbiAgICAgICAgICAgICAgICAvL3JlZ2lvbiBBZGQgZnVuY3Rpb25zIHRvIHByb3BlcnR5IG9iamVjdFxyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eS5jYWxjdWxhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSAkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0ID8gJHNjb3BlLml0ZW1EYXRhLklucHV0UHJvcGVydGllcyA6ICRzY29wZS5pdGVtRGF0YS5PdXRwdXRQcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogJHNjb3BlLnByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCA/ICRzY29wZS5pdGVtRGF0YS5Qb3NpdGlvbi5YIDogJHNjb3BlLml0ZW1EYXRhLlBvc2l0aW9uLlggKyAyNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6ICRzY29wZS5pdGVtRGF0YS5Qb3NpdGlvbi5ZICsgJHNjb3BlLm9mZnNldCArICgoMTcwIC0gJHNjb3BlLm9mZnNldCkgLyAocHJvcHMubGVuZ3RoICsgMSkpICogKCRzY29wZS5pbmRleCArIDEpXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHkucmVtb3ZlUmVmZXJlbmNlID0gZnVuY3Rpb24gKGl0ZW1JZCwgcmVmZXJlbmNlZFByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZkl0ZW0gPSAkc2NvcGUuZGVzaWduZXIuZ2V0SXRlbShpdGVtSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZQcm9wID0gJHNjb3BlLmRlc2lnbmVyLmdldFByb3BlcnR5KHJlZkl0ZW0sIHJlZmVyZW5jZWRQcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2UgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5xKCRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzKS5yZW1vdmUoZnVuY3Rpb24gKHJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlZi5UYXNrSWQgPT09IGl0ZW1JZCAmJiByZWYuUmVmZXJlbmNlZFByb3BlcnR5ID09PSByZWZlcmVuY2VkUHJvcGVydHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZWZQcm9wLnJlbW92ZVJlZmVyZW5jZSgkc2NvcGUuaXRlbURhdGEuSWQsICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eU5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL2VuZHJlZ2lvbiBBZGQgZnVuY3Rpb25zIHRvIHByb3BlcnR5IG9iamVjdFxyXG5cclxuICAgICAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgICAgICAvL0l0IG5lZWRzIGZvciBhbmd1bGFyLCByZW1vdmVzIHN2ZyB3cmFwcGVyXHJcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LmNoaWxkcmVuKCkpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuY29udHJvbGxlcihcImRlc2lnbmVyQ3RybFwiLCBbJyRzY29wZScsICdkaXJlY3Rpb24nLCBmdW5jdGlvbiAoJHNjb3BlLCAkZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAkc2NvcGUuc2l6ZSA9IHtcclxuICAgICAgICAgICAgd2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnNjYWxlID0ge1xyXG4gICAgICAgICAgICB4OiAxLFxyXG4gICAgICAgICAgICB5OiAxXHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUudmlld0JveCA9IHtcclxuICAgICAgICAgICAgeDogMCxcclxuICAgICAgICAgICAgeTogMCxcclxuICAgICAgICAgICAgd2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLm1vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvL3JlZ2lvbiBDb250cm9sbGVyIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICB0aGlzLmdldFNjYWxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNjYWxlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0T2Zmc2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyB4OiAkc2NvcGUub2Zmc2V0LngsIHk6ICRzY29wZS5vZmZzZXQueX07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRWaWV3Qm94ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnZpZXdCb3g7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRJdGVtID0gZnVuY3Rpb24gKGl0ZW1JZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbGlucSgkc2NvcGUuaXRlbXMpLmZpcnN0KGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5JZCA9PT0gaXRlbUlkO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldFByb3BlcnR5ID0gZnVuY3Rpb24gKGl0ZW0sIHByb3BlcnR5TmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgcHJvcCA9IGxpbnEoaXRlbS5JbnB1dFByb3BlcnRpZXMpLmZpcnN0T3JEZWZhdWx0KGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5LlByb3BlcnR5TmFtZSA9PT0gcHJvcGVydHlOYW1lO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKHByb3ApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbGlucShpdGVtLk91dHB1dFByb3BlcnRpZXMpLmZpcnN0T3JEZWZhdWx0KGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5LlByb3BlcnR5TmFtZSA9PT0gcHJvcGVydHlOYW1lO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldFJlZmVyZW5jZWRQcm9wZXJ0eSA9IGZ1bmN0aW9uIChyZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgdmFyIGl0ZW0gPSBzZWxmLmdldEl0ZW0ocmVmZXJlbmNlLlRhc2tJZCk7XHJcbiAgICAgICAgICAgIHZhciBwcm9wID0gc2VsZi5nZXRQcm9wZXJ0eShpdGVtLCByZWZlcmVuY2UuUmVmZXJlbmNlZFByb3BlcnR5KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIENvbnRyb2xsZXIgZnVuY3Rpb25zXHJcblxyXG4gICAgICAgIC8vcmVnaW9uIERlc2lnbmVyIGl0ZW0gaGFuZGxpbmdcclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RJdGVtID0gZnVuY3Rpb24gKHNlbGVjdGVkSXRlbSkge1xyXG4gICAgICAgICAgICBsaW5xKCRzY29wZS5pdGVtcykuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zZWxlY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ2hhbmdlZCh7aXRlbTogc2VsZWN0ZWRJdGVtfSk7XHJcblxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMucmVtb3ZlSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgIGxpbnEoaXRlbS5JbnB1dFByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcm9wLlJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3AucmVtb3ZlUmVmZXJlbmNlKHByb3AuUmVmZXJlbmNlLlRhc2tJZCwgcHJvcC5SZWZlcmVuY2UuUmVmZXJlbmNlZFByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsaW5xKGl0ZW0uT3V0cHV0UHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xyXG4gICAgICAgICAgICAgICAgbGlucShwcm9wLlJlZmVyZW5jZXMpLmZvckVhY2goZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3AucmVtb3ZlUmVmZXJlbmNlKHJlZmVyZW5jZS5UYXNrSWQsIHJlZmVyZW5jZS5SZWZlcmVuY2VkUHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgbGlucSgkc2NvcGUuaXRlbXMpLnJlbW92ZShpdGVtKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBEZXNpZ25lciBpdGVtIGhhbmRsaW5nXHJcblxyXG4gICAgICAgIC8vcmVnaW9uIFpvb21pbmdcclxuXHJcbiAgICAgICAgJHNjb3BlLm9uTW91c2VXaGVlbCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgc3RlcCA9IDAuMTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldmVudC5kZWx0YVkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnNjYWxlLnggLSBzdGVwIDw9IDAgfHwgJHNjb3BlLnNjYWxlLnkgLSBzdGVwIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueCAtPSBzdGVwO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNjYWxlLnkgLT0gc3RlcDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZXZlbnQuZGVsdGFZID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueCArPSBzdGVwO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNjYWxlLnkgKz0gc3RlcDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyRzY29wZS52aWV3Qm94LnggKz0gZXZlbnQuY2xpZW50WCAtICgkc2NvcGUudmlld0JveC53aWR0aCAvIDIpO1xyXG4gICAgICAgICAgICAgICAgLy8kc2NvcGUudmlld0JveC55ICs9IGV2ZW50LmNsaWVudFkgLSAoJHNjb3BlLnZpZXdCb3guaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBfdXBkYXRlVmlld0JveFNpemUoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LndpZHRoID0gJHNjb3BlLnNpemUud2lkdGggLyAkc2NvcGUuc2NhbGUueDtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3guaGVpZ2h0ID0gJHNjb3BlLnNpemUuaGVpZ2h0IC8gJHNjb3BlLnNjYWxlLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgc2l6ZVdhdGNoZXIgPSAkc2NvcGUuJHdhdGNoKCdzaXplJywgX3VwZGF0ZVZpZXdCb3hTaXplLCB0cnVlKTtcclxuICAgICAgICB2YXIgc2NhbGVXYXRjaGVyID0gJHNjb3BlLiR3YXRjaCgnc2NhbGUnLCBfdXBkYXRlVmlld0JveFNpemUsIHRydWUpO1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBab29taW5nXHJcblxyXG4gICAgICAgIC8vIHJlZ2lvbiBWaWV3Ym94IG1vdmluZ1xyXG5cclxuICAgICAgICB2YXIgbW92ZVgsIG1vdmVZID0gMDtcclxuICAgICAgICAkc2NvcGUubW92ZVN0YXJ0ID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICBtb3ZlWCA9ICRldmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICBtb3ZlWSA9ICRldmVudC5jbGllbnRZO1xyXG4gICAgICAgICAgICAkc2NvcGUubW92aW5nID0gdHJ1ZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUubW92ZSA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIHggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgdmFyIHkgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LnggLT0gKHggLSBtb3ZlWCkgKiAoMSAvICRzY29wZS5zY2FsZS54KTtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3gueSAtPSAoeSAtIG1vdmVZKSAqICgxIC8gJHNjb3BlLnNjYWxlLnkpO1xyXG4gICAgICAgICAgICBtb3ZlWCA9IHg7XHJcbiAgICAgICAgICAgIG1vdmVZID0geTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUubW92ZUVuZCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm1vdmluZyA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIFZpZXdib3ggbW92aW5nXHJcblxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2l6ZVdhdGNoZXIoKTtcclxuICAgICAgICAgICAgc2NhbGVXYXRjaGVyKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSlcclxuOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzUvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInLCBbJ1N2Zy5EaXJlY3RpdmUnLCAnSGFtbWVyLkRpcmVjdGl2ZScsICdDb21tb24uRGlyZWN0aXZlJ10pXHJcbiAgICAuY29uc3RhbnQoXCJ0eXBlc1wiLCB7XHJcbiAgICAgICAgdGV4dDogJ1RleHQnLFxyXG4gICAgICAgIGJvb2w6ICdCb29sJyxcclxuICAgICAgICBpbnQ6ICdOdW1iZXInXHJcbiAgICB9KVxyXG4gICAgLmNvbnN0YW50KFwic3RhdHVzXCIsIHtcclxuICAgICAgICBub3RydW46ICdub3RydW4nLFxyXG4gICAgICAgIHJ1bm5pbmc6ICdydW5uaW5nJyxcclxuICAgICAgICBmYWlsZWQ6ICdmYWlsZWQnLFxyXG4gICAgICAgIHN1Y2NlZWRlZDogJ3N1Y2NlZWRlZCdcclxuICAgIH0pXHJcbiAgICAuY29uc3RhbnQoXCJkaXJlY3Rpb25cIiwge1xyXG4gICAgICAgIGlucHV0OiAnaW5wdXQnLFxyXG4gICAgICAgIG91dHB1dDogJ291dHB1dCdcclxuICAgIH0pXHJcbiAgICAuZGlyZWN0aXZlKCdkZXNpZ25lcicsIFtcIiR0aW1lb3V0XCIsIGZ1bmN0aW9uICgkdGltZW91dCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogZmFsc2UsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3JjL3RlbXBsYXRlcy9kZXNpZ25lci50bXBsLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgYXV0b1NpemU6ICc9JyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiAnPScsXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZENoYW5nZWQ6ICcmJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZGVzaWduZXJDdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50LmhlaWdodCgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm9mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBlbGVtZW50Lm9mZnNldCgpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZWxlbWVudC5vZmZzZXQoKS50b3BcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzE1LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnSGFtbWVyLkRpcmVjdGl2ZScsIFtdKVxyXG4gICAgLmRpcmVjdGl2ZSgndGFwJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmhhbW1lcih7XHJcbiAgICAgICAgICAgICAgICB9KS5iaW5kKCd0YXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnRhcCwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmhhbW1lcigpLnVuYmluZCgndGFwJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KS5kaXJlY3RpdmUoJ2RvdWJsZVRhcCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5oYW1tZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcHM6IDJcclxuICAgICAgICAgICAgICAgIH0pLmJpbmQoJ3RhcCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5nZXN0dXJlLnRhcENvdW50ID09PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLmRvdWJsZVRhcCwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaGFtbWVyKCkudW5iaW5kKCd0YXAnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pLmRpcmVjdGl2ZSgncGFuJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5idXR0b24gIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnBhbkJlZ2luLCB7ICRldmVudDogZXZlbnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkuYmluZCgnbW91c2Vtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMucGFuLCB7ICRldmVudDogZXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLmJpbmQoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5wYW5SZWxlYXNlLCB7ICRldmVudDogZXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudW5iaW5kKCdtb3VzZW1vdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS51bmJpbmQoJ21vdXNldXAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnVuYmluZCgnbW91c2Vkb3duJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOS85LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJylcclxuICAgIC5jb250cm9sbGVyKFwiaXRlbUN0cmxcIiwgWyckc2NvcGUnLCAndHlwZXMnLCAnc3RhdHVzJywgZnVuY3Rpb24gKCRzY29wZSwgJHR5cGVzLCAkc3RhdHVzKSB7XHJcbiAgICAgICAgJHNjb3BlLiRzdGF0dXMgPSAkc3RhdHVzO1xyXG4gICAgICAgICRzY29wZS4kdHlwZXMgPSAkdHlwZXM7XHJcbiAgICAgICAgJHNjb3BlLndpZHRoID0gMjUwO1xyXG4gICAgICAgICRzY29wZS5oZWlnaHQgPSAxNzA7XHJcbiAgICAgICAgdmFyIGRyYWdYLCBkcmFnWSA9IDA7XHJcbiAgICAgICAgJHNjb3BlLmRyYWdTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgZHJhZ1ggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgZHJhZ1kgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWcgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gJGV2ZW50LmNsaWVudFg7XHJcbiAgICAgICAgICAgIHZhciB5ID0gJGV2ZW50LmNsaWVudFk7XHJcbiAgICAgICAgICAgICRzY29wZS5kYXRhLlBvc2l0aW9uLlggKz0gKHggLSBkcmFnWCkgKiAoMS8kc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS54KTtcclxuICAgICAgICAgICAgJHNjb3BlLmRhdGEuUG9zaXRpb24uWSArPSAoeSAtIGRyYWdZKSAqICgxLyRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLnkpO1xyXG4gICAgICAgICAgICBkcmFnWCA9IHg7XHJcbiAgICAgICAgICAgIGRyYWdZID0geTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2Rlc2lnbmVySXRlbScsIFsgJ3R5cGVzJywgJ3N0YXR1cycsIGZ1bmN0aW9uICgkdHlwZXMsICRzdGF0dXMpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6ICdeZGVzaWduZXInLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3NyYy90ZW1wbGF0ZXMvaXRlbS50bXBsLmh0bWwnLFxyXG4gICAgICAgICAgICB0cmFuc2NsdWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgZGF0YTogJz0nLFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0WDogJz0nLFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0WTogJz0nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdpdGVtQ3RybCcsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBkZXNpZ25lckN0cmwpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhLlN0YXR1cyA9ICRzdGF0dXMubm90cnVuO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlc2lnbmVyID0gZGVzaWduZXJDdHJsO1xyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vSXQgbmVlZHMgZm9yIGFuZ3VsYXIsIHJlbW92ZXMgc3ZnIHdyYXBwZXJcclxuICAgICAgICAgICAgICAgIHZhciBlID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnQuY2hpbGRyZW4oKSk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlcGxhY2VXaXRoKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnaXRlbVRpdGxlJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiZm9udC1tIGJveC1oZWFkZXJcIiBuZy10cmFuc2NsdWRlPjwvZGl2PicsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCdpdGVtRGVzY3JpcHRpb24nLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiZm9udC14c1wiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+JyxcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmwpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSkiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOC81LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnU3ZnLkRpcmVjdGl2ZScsIFtdKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdXaWR0aCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nV2lkdGgsIGZ1bmN0aW9uICh3aWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIndpZHRoXCIsIHdpZHRoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdIZWlnaHQnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ0hlaWdodCwgZnVuY3Rpb24gKGhlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1gnLCBbJyRjb21waWxlJywgZnVuY3Rpb24gKCRjb21waWxlKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1gsIGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieFwiLCB4KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdZLCBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInlcIiwgeSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nQ3gnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ0N4LCBmdW5jdGlvbiAoY3gpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJjeFwiLCBjeCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nQ3knLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ0N5LCBmdW5jdGlvbiAoY3kpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJjeVwiLCBjeSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWDEnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1gxLCBmdW5jdGlvbiAoeDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ4MVwiLCB4MSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWDInLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1gyLCBmdW5jdGlvbiAoeDIpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ4MlwiLCB4Mik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWTEnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1kxLCBmdW5jdGlvbiAoeTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ5MVwiLCB5MSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWTInLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1kyLCBmdW5jdGlvbiAoeTIpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ5MlwiLCB5Mik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2F1dG9TaXplJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2l6ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGVsZW1lbnQuaGVpZ2h0KClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdWaWV3Ym94JywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdWaWV3Ym94LCBmdW5jdGlvbiAodmlld2JveCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmlld2JveCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHZpZXdib3gueCArIFwiIFwiICsgdmlld2JveC55ICsgXCIgXCIgKyB2aWV3Ym94LndpZHRoICsgXCIgXCIgKyB2aWV3Ym94LmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50WzBdLnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCd0ZXh0RWxsaXBzaXMnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgdmFyIG1heFdpZHRoID0gcGFyc2VGbG9hdChhdHRycy5tYXhXaWR0aCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSAkc2NvcGUuJGV2YWwoYXR0cnMudGV4dEVsbGlwc2lzKTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC53aWR0aCgpID4gbWF4V2lkdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoZWxlbWVudC53aWR0aCgpID4gbWF4V2lkdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHJpbmcoMCwgdmFsdWUubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dCh2YWx1ZS5zdWJzdHJpbmcoMCwgdmFsdWUubGVuZ3RoIC0gMSkgKyAnLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=