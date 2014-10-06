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
            if(refProp.Direction === $scope.property.Direction || itemId === $scope.itemData.Id){
                $scope.newReference = null;
                return;
            }
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
 * Created by gmeszaros on 9/9/2014.
 */
angular.module('FlowDesigner')
    .controller("itemCtrl", ['$scope', 'types', 'status', function ($scope, $types, $status) {
        $scope.$status = $status;
        $scope.$types = $types;
        $scope.width = 250;
        $scope.height = 170;
        $scope.dragging = false;
        var dragX, dragY = 0;
        $scope.dragStart = function ($event) {
            dragX = $event.clientX;
            dragY = $event.clientY;
            $event.stopPropagation();
        };
        $scope.drag = function ($event) {
            $scope.dragging = true;
            var x = $event.clientX;
            var y = $event.clientY;
            $scope.data.Position.X += (x - dragX) * (1 / $scope.designer.getScale().x);
            $scope.data.Position.Y += (y - dragY) * (1 / $scope.designer.getScale().y);
            dragX = x;
            dragY = y;
            $event.stopPropagation();
        };
        $scope.dragEnd = function ($event) {
            $scope.dragging = false;
        };

        $scope.onItemClick = function () {
            $scope.designer.selectItem($scope.data);
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
/**
 * Created by gmeszaros on 8/15/2014.
 */
angular.module('Touch.Directive', [])
    .directive('tap', function () {
        return {
            restrict: 'A',
            replace: true,
            link: function ($scope, element, attrs) {
                var timeStamp;
                element.bind('mousedown', function (event) {
                    timeStamp = new Date();
                });

                element.bind('mouseup', function (event) {
                    var date = new Date();
                    if (date - timeStamp <= 200) {
                        $scope.$apply(function () {
                            $scope.$eval(attrs.tap, { $event: event });
                        });
                    }
                });

                //
                //Disposing
                $scope.$on('$destroy', function () {
                    element.unbind('mousedown');
                    element.unbind('mouseup');
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
                        var mouseMoveHandler = function (event) {
                            $scope.$apply(function () {
                                $scope.$eval(attrs.pan, { $event: event });
                            });
                        };
                        $(document).bind('mousemove', mouseMoveHandler);
                        var mouseUpHandler = function (event) {
                            $scope.$apply(function () {
                                $scope.$eval(attrs.panRelease, { $event: event });
                                $(document).unbind('mousemove', mouseMoveHandler);
                                $(document).unbind('mouseup', mouseUpHandler);
                            });
                        };
                        $(document).bind('mouseup', mouseUpHandler);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlc2lnbmVyRGlyZWN0aXZlLmpzIiwiY29tbW9uRGlyZWN0aXZlLmpzIiwiY29ubmVjdG9yQ3RybC5qcyIsImNvbm5lY3RvckRpcmVjdGl2ZS5qcyIsImRlc2lnbmVyQ3RybC5qcyIsIml0ZW1EaXJlY3RpdmUuanMiLCJzdmdEaXJlY3RpdmUuanMiLCJ0b3VjaERpcmVjdGl2ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJmbG93RGVzaWduZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOC81LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJywgWydTdmcuRGlyZWN0aXZlJywgJ1RvdWNoLkRpcmVjdGl2ZScsICdDb21tb24uRGlyZWN0aXZlJ10pXHJcbiAgICAuY29uc3RhbnQoXCJ0eXBlc1wiLCB7XHJcbiAgICAgICAgdGV4dDogJ1RleHQnLFxyXG4gICAgICAgIGJvb2w6ICdCb29sJyxcclxuICAgICAgICBpbnQ6ICdOdW1iZXInXHJcbiAgICB9KVxyXG4gICAgLmNvbnN0YW50KFwic3RhdHVzXCIsIHtcclxuICAgICAgICBub3RydW46ICdub3RydW4nLFxyXG4gICAgICAgIHJ1bm5pbmc6ICdydW5uaW5nJyxcclxuICAgICAgICBmYWlsZWQ6ICdmYWlsZWQnLFxyXG4gICAgICAgIHN1Y2NlZWRlZDogJ3N1Y2NlZWRlZCdcclxuICAgIH0pXHJcbiAgICAuY29uc3RhbnQoXCJkaXJlY3Rpb25cIiwge1xyXG4gICAgICAgIGlucHV0OiAnaW5wdXQnLFxyXG4gICAgICAgIG91dHB1dDogJ291dHB1dCdcclxuICAgIH0pXHJcbiAgICAuZGlyZWN0aXZlKCdkZXNpZ25lcicsIFtcIiR0aW1lb3V0XCIsIGZ1bmN0aW9uICgkdGltZW91dCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogZmFsc2UsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3JjL3RlbXBsYXRlcy9kZXNpZ25lci50bXBsLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgYXV0b1NpemU6ICc9JyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiAnPScsXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZENoYW5nZWQ6ICcmJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZGVzaWduZXJDdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50LmhlaWdodCgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm9mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBlbGVtZW50Lm9mZnNldCgpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZWxlbWVudC5vZmZzZXQoKS50b3BcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IE1DRyBvbiAyMDE0LjA5LjA5Li5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdDb21tb24uRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCduZ01vdXNld2hlZWwnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVxdWlyZTogJz9uZ01vZGVsJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5tb3VzZXdoZWVsKGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMubmdNb3VzZXdoZWVsLCB7ZXZlbnQ6IGV2ZW50fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuY29udHJvbGxlcihcImNvbm5lY3RvckN0cmxcIiwgWyckc2NvcGUnLCAndHlwZXMnLCAnZGlyZWN0aW9uJywgZnVuY3Rpb24gKCRzY29wZSwgJHR5cGVzLCAkZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgJHNjb3BlLiRkaXJlY3Rpb24gPSAkZGlyZWN0aW9uO1xyXG4gICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5zZWxlY3RlZFJlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgJHNjb3BlLmhhc1JlZmVyZW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlICE9PSBudWxsO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzLmxlbmd0aCAhPT0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnNldFN0eWxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RyaW5nOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5zdHJpbmcsXHJcbiAgICAgICAgICAgICAgICBib29sOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5ib29sLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5pbnQsXHJcbiAgICAgICAgICAgICAgICAnbm8tdmFsdWUnOiAhJHNjb3BlLmhhc1JlZmVyZW5jZSgpICYmICghJHNjb3BlLnByb3BlcnR5LlZhbHVlIHx8ICRzY29wZS5wcm9wZXJ0eS5WYWx1ZSA9PT0gXCJcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuc2VsZWN0UmVmZXJlbmNlID0gZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSZWZlcmVuY2UgPSByZWZlcmVuY2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9yZWdpb24gRHJhZ2dpbmcgbmV3IHJlZmVyZW5jZVxyXG5cclxuICAgICAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24oJGV2ZW50LmNsaWVudFgsICRldmVudC5jbGllbnRZKTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24oJGV2ZW50LmNsaWVudFgsICRldmVudC5jbGllbnRZKTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdFbmQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtSWQgPSAkKCRldmVudC50YXJnZXQpWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1pdGVtLWlkJyk7XHJcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSAkKCRldmVudC50YXJnZXQpWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1wcm9wZXJ0eS1uYW1lJyk7XHJcbiAgICAgICAgICAgIGlmICghaXRlbUlkIHx8ICFwcm9wZXJ0eU5hbWUpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciByZWZJdGVtID0gJHNjb3BlLmRlc2lnbmVyLmdldEl0ZW0oaXRlbUlkKTtcclxuICAgICAgICAgICAgdmFyIHJlZlByb3AgPSAkc2NvcGUuZGVzaWduZXIuZ2V0UHJvcGVydHkocmVmSXRlbSwgcHJvcGVydHlOYW1lKTtcclxuICAgICAgICAgICAgaWYocmVmUHJvcC5EaXJlY3Rpb24gPT09ICRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gfHwgaXRlbUlkID09PSAkc2NvcGUuaXRlbURhdGEuSWQpe1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWRkUmVmZXJlbmNlcygkc2NvcGUucHJvcGVydHksIHJlZlByb3AsIHJlZkl0ZW0pO1xyXG4gICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIERyYWdnaW5nIG5ldyByZWZlcmVuY2VcclxuXHJcbiAgICAgICAgLy9yZWdpb24gUHJpdmF0ZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgdmFyIGFkZFJlZmVyZW5jZXMgPSBmdW5jdGlvbiAoc291cmNlUHJvcGVydHksIHRhcmdldFByb3BlcnR5LCB0YXJnZXRJdGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VQcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5LlJlZmVyZW5jZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6IHRhcmdldEl0ZW0uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiB0YXJnZXRQcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eS5SZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIFRhc2tJZDogJHNjb3BlLml0ZW1EYXRhLklkLFxyXG4gICAgICAgICAgICAgICAgICAgIFJlZmVyZW5jZWRQcm9wZXJ0eTogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5TmFtZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eS5SZWZlcmVuY2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgVGFza0lkOiAkc2NvcGUuaXRlbURhdGEuSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlOYW1lXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc291cmNlUHJvcGVydHkuUmVmZXJlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6IHRhcmdldEl0ZW0uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiB0YXJnZXRQcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24gPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0ge1xyXG4gICAgICAgICAgICAgICAgeDogKHggLSAkc2NvcGUuZGVzaWduZXIuZ2V0T2Zmc2V0KCkueCkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLngpICsgJHNjb3BlLmRlc2lnbmVyLmdldFZpZXdCb3goKS54IC0gMSxcclxuICAgICAgICAgICAgICAgIHk6ICh5IC0gJHNjb3BlLmRlc2lnbmVyLmdldE9mZnNldCgpLnkpICogKDEgLyAkc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS55KSArICRzY29wZS5kZXNpZ25lci5nZXRWaWV3Qm94KCkueSAtIDFcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBQcml2YXRlIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSlcclxuOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmRpcmVjdGl2ZSgnY29ubmVjdG9yJywgWyd0eXBlcycsICdkaXJlY3Rpb24nLCBmdW5jdGlvbiAoJHR5cGVzLCAkZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJBRVwiLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICByZXF1aXJlOiAnXmRlc2lnbmVyJyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdzcmMvdGVtcGxhdGVzL2Nvbm5lY3Rvci50bXBsLmh0bWwnLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnY29ubmVjdG9yQ3RybCcsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtRGF0YTogJz0nLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydHk6ICc9JyxcclxuICAgICAgICAgICAgICAgIGluZGV4OiAnPScsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6ICc9J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycywgZGVzaWduZXJDdHJsKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGVzaWduZXIgPSBkZXNpZ25lckN0cmw7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9yZWdpb24gQWRkIGZ1bmN0aW9ucyB0byBwcm9wZXJ0eSBvYmplY3RcclxuXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHkuY2FsY3VsYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BzID0gJHNjb3BlLnByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCA/ICRzY29wZS5pdGVtRGF0YS5JbnB1dFByb3BlcnRpZXMgOiAkc2NvcGUuaXRlbURhdGEuT3V0cHV0UHJvcGVydGllcztcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6ICRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQgPyAkc2NvcGUuaXRlbURhdGEuUG9zaXRpb24uWCA6ICRzY29wZS5pdGVtRGF0YS5Qb3NpdGlvbi5YICsgMjUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiAkc2NvcGUuaXRlbURhdGEuUG9zaXRpb24uWSArICRzY29wZS5vZmZzZXQgKyAoKDE3MCAtICRzY29wZS5vZmZzZXQpIC8gKHByb3BzLmxlbmd0aCArIDEpKSAqICgkc2NvcGUuaW5kZXggKyAxKVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb3BlcnR5LnJlbW92ZVJlZmVyZW5jZSA9IGZ1bmN0aW9uIChpdGVtSWQsIHJlZmVyZW5jZWRQcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZJdGVtID0gJHNjb3BlLmRlc2lnbmVyLmdldEl0ZW0oaXRlbUlkKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVmUHJvcCA9ICRzY29wZS5kZXNpZ25lci5nZXRQcm9wZXJ0eShyZWZJdGVtLCByZWZlcmVuY2VkUHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGlucSgkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlcykucmVtb3ZlKGZ1bmN0aW9uIChyZWYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWYuVGFza0lkID09PSBpdGVtSWQgJiYgcmVmLlJlZmVyZW5jZWRQcm9wZXJ0eSA9PT0gcmVmZXJlbmNlZFByb3BlcnR5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVmUHJvcC5yZW1vdmVSZWZlcmVuY2UoJHNjb3BlLml0ZW1EYXRhLklkLCAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlOYW1lKTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgLy9lbmRyZWdpb24gQWRkIGZ1bmN0aW9ucyB0byBwcm9wZXJ0eSBvYmplY3RcclxuXHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9JdCBuZWVkcyBmb3IgYW5ndWxhciwgcmVtb3ZlcyBzdmcgd3JhcHBlclxyXG4gICAgICAgICAgICAgICAgdmFyIGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudC5jaGlsZHJlbigpKTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVwbGFjZVdpdGgoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmNvbnRyb2xsZXIoXCJkZXNpZ25lckN0cmxcIiwgWyckc2NvcGUnLCAnZGlyZWN0aW9uJywgZnVuY3Rpb24gKCRzY29wZSwgJGRpcmVjdGlvbikge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgJHNjb3BlLnNpemUgPSB7XHJcbiAgICAgICAgICAgIHdpZHRoOiAwLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDBcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5zY2FsZSA9IHtcclxuICAgICAgICAgICAgeDogMSxcclxuICAgICAgICAgICAgeTogMVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnZpZXdCb3ggPSB7XHJcbiAgICAgICAgICAgIHg6IDAsXHJcbiAgICAgICAgICAgIHk6IDAsXHJcbiAgICAgICAgICAgIHdpZHRoOiAwLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDBcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5tb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy9yZWdpb24gQ29udHJvbGxlciBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgdGhpcy5nZXRTY2FsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zY2FsZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldE9mZnNldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgeDogJHNjb3BlLm9mZnNldC54LCB5OiAkc2NvcGUub2Zmc2V0Lnl9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0Vmlld0JveCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICRzY29wZS52aWV3Qm94O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0SXRlbSA9IGZ1bmN0aW9uIChpdGVtSWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxpbnEoJHNjb3BlLml0ZW1zKS5maXJzdChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uSWQgPT09IGl0ZW1JZDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRQcm9wZXJ0eSA9IGZ1bmN0aW9uIChpdGVtLCBwcm9wZXJ0eU5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIHByb3AgPSBsaW5xKGl0ZW0uSW5wdXRQcm9wZXJ0aWVzKS5maXJzdE9yRGVmYXVsdChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eS5Qcm9wZXJ0eU5hbWUgPT09IHByb3BlcnR5TmFtZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmIChwcm9wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGxpbnEoaXRlbS5PdXRwdXRQcm9wZXJ0aWVzKS5maXJzdE9yRGVmYXVsdChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eS5Qcm9wZXJ0eU5hbWUgPT09IHByb3BlcnR5TmFtZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRSZWZlcmVuY2VkUHJvcGVydHkgPSBmdW5jdGlvbiAocmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtID0gc2VsZi5nZXRJdGVtKHJlZmVyZW5jZS5UYXNrSWQpO1xyXG4gICAgICAgICAgICB2YXIgcHJvcCA9IHNlbGYuZ2V0UHJvcGVydHkoaXRlbSwgcmVmZXJlbmNlLlJlZmVyZW5jZWRQcm9wZXJ0eSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcHJvcDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBDb250cm9sbGVyIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICAvL3JlZ2lvbiBEZXNpZ25lciBpdGVtIGhhbmRsaW5nXHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0SXRlbSA9IGZ1bmN0aW9uIChzZWxlY3RlZEl0ZW0pIHtcclxuICAgICAgICAgICAgbGlucSgkc2NvcGUuaXRlbXMpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc2VsZWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbS5zZWxlY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZENoYW5nZWQoe2l0ZW06IHNlbGVjdGVkSXRlbX0pO1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnJlbW92ZUl0ZW0gPSBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICBsaW5xKGl0ZW0uSW5wdXRQcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvcC5SZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9wLnJlbW92ZVJlZmVyZW5jZShwcm9wLlJlZmVyZW5jZS5UYXNrSWQsIHByb3AuUmVmZXJlbmNlLlJlZmVyZW5jZWRQcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgbGlucShpdGVtLk91dHB1dFByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcclxuICAgICAgICAgICAgICAgIGxpbnEocHJvcC5SZWZlcmVuY2VzKS5mb3JFYWNoKGZ1bmN0aW9uIChyZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9wLnJlbW92ZVJlZmVyZW5jZShyZWZlcmVuY2UuVGFza0lkLCByZWZlcmVuY2UuUmVmZXJlbmNlZFByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxpbnEoJHNjb3BlLml0ZW1zKS5yZW1vdmUoaXRlbSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gRGVzaWduZXIgaXRlbSBoYW5kbGluZ1xyXG5cclxuICAgICAgICAvL3JlZ2lvbiBab29taW5nXHJcblxyXG4gICAgICAgICRzY29wZS5vbk1vdXNlV2hlZWwgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIHN0ZXAgPSAwLjE7XHJcblxyXG4gICAgICAgICAgICBpZiAoZXZlbnQuZGVsdGFZID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5zY2FsZS54IC0gc3RlcCA8PSAwIHx8ICRzY29wZS5zY2FsZS55IC0gc3RlcCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNjYWxlLnggLT0gc3RlcDtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zY2FsZS55IC09IHN0ZXA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGV2ZW50LmRlbHRhWSA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNjYWxlLnggKz0gc3RlcDtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zY2FsZS55ICs9IHN0ZXA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBfdXBkYXRlVmlld0JveFNpemUoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LndpZHRoID0gJHNjb3BlLnNpemUud2lkdGggLyAkc2NvcGUuc2NhbGUueDtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3guaGVpZ2h0ID0gJHNjb3BlLnNpemUuaGVpZ2h0IC8gJHNjb3BlLnNjYWxlLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgc2l6ZVdhdGNoZXIgPSAkc2NvcGUuJHdhdGNoKCdzaXplJywgX3VwZGF0ZVZpZXdCb3hTaXplLCB0cnVlKTtcclxuICAgICAgICB2YXIgc2NhbGVXYXRjaGVyID0gJHNjb3BlLiR3YXRjaCgnc2NhbGUnLCBfdXBkYXRlVmlld0JveFNpemUsIHRydWUpO1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBab29taW5nXHJcblxyXG4gICAgICAgIC8vIHJlZ2lvbiBWaWV3Ym94IG1vdmluZ1xyXG5cclxuICAgICAgICB2YXIgbW92ZVgsIG1vdmVZID0gMDtcclxuICAgICAgICAkc2NvcGUubW92ZVN0YXJ0ID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICBtb3ZlWCA9ICRldmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICBtb3ZlWSA9ICRldmVudC5jbGllbnRZO1xyXG4gICAgICAgICAgICAkc2NvcGUubW92aW5nID0gdHJ1ZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUubW92ZSA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIHggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgdmFyIHkgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3gueCAtPSAoeCAtIG1vdmVYKSAqICgxIC8gJHNjb3BlLnNjYWxlLngpO1xyXG4gICAgICAgICAgICAkc2NvcGUudmlld0JveC55IC09ICh5IC0gbW92ZVkpICogKDEgLyAkc2NvcGUuc2NhbGUueSk7XHJcbiAgICAgICAgICAgIG1vdmVYID0geDtcclxuICAgICAgICAgICAgbW92ZVkgPSB5O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5tb3ZlRW5kID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICAkc2NvcGUubW92aW5nID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gVmlld2JveCBtb3ZpbmdcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL0Rpc3Bvc2luZ1xyXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzaXplV2F0Y2hlcigpO1xyXG4gICAgICAgICAgICBzY2FsZVdhdGNoZXIoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1dKVxyXG47IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuY29udHJvbGxlcihcIml0ZW1DdHJsXCIsIFsnJHNjb3BlJywgJ3R5cGVzJywgJ3N0YXR1cycsIGZ1bmN0aW9uICgkc2NvcGUsICR0eXBlcywgJHN0YXR1cykge1xyXG4gICAgICAgICRzY29wZS4kc3RhdHVzID0gJHN0YXR1cztcclxuICAgICAgICAkc2NvcGUuJHR5cGVzID0gJHR5cGVzO1xyXG4gICAgICAgICRzY29wZS53aWR0aCA9IDI1MDtcclxuICAgICAgICAkc2NvcGUuaGVpZ2h0ID0gMTcwO1xyXG4gICAgICAgICRzY29wZS5kcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgIHZhciBkcmFnWCwgZHJhZ1kgPSAwO1xyXG4gICAgICAgICRzY29wZS5kcmFnU3RhcnQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGRyYWdYID0gJGV2ZW50LmNsaWVudFg7XHJcbiAgICAgICAgICAgIGRyYWdZID0gJGV2ZW50LmNsaWVudFk7XHJcbiAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZHJhZ2dpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB2YXIgeCA9ICRldmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICB2YXIgeSA9ICRldmVudC5jbGllbnRZO1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YS5Qb3NpdGlvbi5YICs9ICh4IC0gZHJhZ1gpICogKDEgLyAkc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS54KTtcclxuICAgICAgICAgICAgJHNjb3BlLmRhdGEuUG9zaXRpb24uWSArPSAoeSAtIGRyYWdZKSAqICgxIC8gJHNjb3BlLmRlc2lnbmVyLmdldFNjYWxlKCkueSk7XHJcbiAgICAgICAgICAgIGRyYWdYID0geDtcclxuICAgICAgICAgICAgZHJhZ1kgPSB5O1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuZHJhZ0VuZCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLm9uSXRlbUNsaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZGVzaWduZXIuc2VsZWN0SXRlbSgkc2NvcGUuZGF0YSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnZGVzaWduZXJJdGVtJywgWyAndHlwZXMnLCAnc3RhdHVzJywgZnVuY3Rpb24gKCR0eXBlcywgJHN0YXR1cykge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgcmVxdWlyZTogJ15kZXNpZ25lcicsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3JjL3RlbXBsYXRlcy9pdGVtLnRtcGwuaHRtbCcsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiAnPScsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXRYOiAnPScsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXRZOiAnPSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2l0ZW1DdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMsIGRlc2lnbmVyQ3RybCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGEuU3RhdHVzID0gJHN0YXR1cy5ub3RydW47XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGVzaWduZXIgPSBkZXNpZ25lckN0cmw7XHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9JdCBuZWVkcyBmb3IgYW5ndWxhciwgcmVtb3ZlcyBzdmcgd3JhcHBlclxyXG4gICAgICAgICAgICAgICAgdmFyIGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudC5jaGlsZHJlbigpKTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVwbGFjZVdpdGgoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCdpdGVtVGl0bGUnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJmb250LW0gYm94LWhlYWRlclwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+JyxcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2l0ZW1EZXNjcmlwdGlvbicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJBRVwiLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJmb250LXhzXCIgbmctdHJhbnNjbHVkZT48L2Rpdj4nLFxyXG4gICAgICAgICAgICB0cmFuc2NsdWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKSIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzUvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdTdmcuRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1dpZHRoJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdXaWR0aCwgZnVuY3Rpb24gKHdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ0hlaWdodCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nSGVpZ2h0LCBmdW5jdGlvbiAoaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWCcsIFsnJGNvbXBpbGUnLCBmdW5jdGlvbiAoJGNvbXBpbGUpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWCwgZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ4XCIsIHgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1knLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1ksIGZ1bmN0aW9uICh5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieVwiLCB5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdDeCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nQ3gsIGZ1bmN0aW9uIChjeCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImN4XCIsIGN4KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdDeScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nQ3ksIGZ1bmN0aW9uIChjeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImN5XCIsIGN5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYMScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWDEsIGZ1bmN0aW9uICh4MSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIngxXCIsIHgxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYMicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWDIsIGZ1bmN0aW9uICh4Mikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIngyXCIsIHgyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZMScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWTEsIGZ1bmN0aW9uICh5MSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInkxXCIsIHkxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZMicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWTIsIGZ1bmN0aW9uICh5Mikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInkyXCIsIHkyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnYXV0b1NpemUnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnQud2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogZWxlbWVudC5oZWlnaHQoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1ZpZXdib3gnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1ZpZXdib3gsIGZ1bmN0aW9uICh2aWV3Ym94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2aWV3Ym94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdmlld2JveC54ICsgXCIgXCIgKyB2aWV3Ym94LnkgKyBcIiBcIiArIHZpZXdib3gud2lkdGggKyBcIiBcIiArIHZpZXdib3guaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0uc2V0QXR0cmlidXRlKFwidmlld0JveFwiLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ3RleHRFbGxpcHNpcycsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWF4V2lkdGggPSBwYXJzZUZsb2F0KGF0dHJzLm1heFdpZHRoKTtcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS4kZXZhbChhdHRycy50ZXh0RWxsaXBzaXMpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LndpZHRoKCkgPiBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChlbGVtZW50LndpZHRoKCkgPiBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5sZW5ndGggLSAxKSArICcuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzE1LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnVG91Y2guRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCd0YXAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0aW1lU3RhbXA7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVTdGFtcCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGUgLSB0aW1lU3RhbXAgPD0gMjAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnRhcCwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZWRvd24nKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnVuYmluZCgnbW91c2V1cCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSkuZGlyZWN0aXZlKCdkb3VibGVUYXAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuaGFtbWVyKHtcclxuICAgICAgICAgICAgICAgICAgICB0YXBzOiAyXHJcbiAgICAgICAgICAgICAgICB9KS5iaW5kKCd0YXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZ2VzdHVyZS50YXBDb3VudCA9PT0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5kb3VibGVUYXAsIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmhhbW1lcigpLnVuYmluZCgndGFwJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KS5kaXJlY3RpdmUoJ3BhbicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5iaW5kKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5wYW5CZWdpbiwgeyAkZXZlbnQ6IGV2ZW50fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb3VzZU1vdmVIYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMucGFuLCB7ICRldmVudDogZXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkuYmluZCgnbW91c2Vtb3ZlJywgbW91c2VNb3ZlSGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb3VzZVVwSGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnBhblJlbGVhc2UsIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS51bmJpbmQoJ21vdXNlbW92ZScsIG1vdXNlTW92ZUhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnVuYmluZCgnbW91c2V1cCcsIG1vdXNlVXBIYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5iaW5kKCdtb3VzZXVwJywgbW91c2VVcEhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZWRvd24nKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==