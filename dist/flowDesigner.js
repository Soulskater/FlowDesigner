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
            templateUrl: $path + 'designer.tmpl.html',
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
    .directive('connector', ['types', 'direction', 'pathService', function ($types, $direction, $path) {
        return{
            restrict: "AE",
            replace: true,
            require: '^designer',
            templateUrl: $path + 'connector.tmpl.html',
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
    .directive('designerItem', [ 'types', 'status', 'pathService', function ($types, $status, $path) {
        return{
            restrict: "AE",
            require: '^designer',
            replace: true,
            templateUrl: $path + 'item.tmpl.html',
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
 * Created by gmeszaros on 10/6/2014.
 */
angular.module('FlowDesigner', [])
    .service("pathService", [ function () {
        var _templateBaseUrl = "src/templates/";
        return{
            templatesBaseUrl: _templateBaseUrl,
            setPath: function (options) {
                _templateBaseUrl = options.templatesBaseUrl;
            }
        };
    }]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlc2lnbmVyRGlyZWN0aXZlLmpzIiwiY29tbW9uRGlyZWN0aXZlLmpzIiwiY29ubmVjdG9yQ3RybC5qcyIsImNvbm5lY3RvckRpcmVjdGl2ZS5qcyIsImRlc2lnbmVyQ3RybC5qcyIsIml0ZW1EaXJlY3RpdmUuanMiLCJyZXNvdXJjZVBhdGhTZXJ2aWNlLmpzIiwic3ZnRGlyZWN0aXZlLmpzIiwidG91Y2hEaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJmbG93RGVzaWduZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOC81LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJywgWydTdmcuRGlyZWN0aXZlJywgJ1RvdWNoLkRpcmVjdGl2ZScsICdDb21tb24uRGlyZWN0aXZlJ10pXHJcbiAgICAuY29uc3RhbnQoXCJ0eXBlc1wiLCB7XHJcbiAgICAgICAgdGV4dDogJ1RleHQnLFxyXG4gICAgICAgIGJvb2w6ICdCb29sJyxcclxuICAgICAgICBpbnQ6ICdOdW1iZXInXHJcbiAgICB9KVxyXG4gICAgLmNvbnN0YW50KFwic3RhdHVzXCIsIHtcclxuICAgICAgICBub3RydW46ICdub3RydW4nLFxyXG4gICAgICAgIHJ1bm5pbmc6ICdydW5uaW5nJyxcclxuICAgICAgICBmYWlsZWQ6ICdmYWlsZWQnLFxyXG4gICAgICAgIHN1Y2NlZWRlZDogJ3N1Y2NlZWRlZCdcclxuICAgIH0pXHJcbiAgICAuY29uc3RhbnQoXCJkaXJlY3Rpb25cIiwge1xyXG4gICAgICAgIGlucHV0OiAnaW5wdXQnLFxyXG4gICAgICAgIG91dHB1dDogJ291dHB1dCdcclxuICAgIH0pXHJcbiAgICAuZGlyZWN0aXZlKCdkZXNpZ25lcicsIFtcIiR0aW1lb3V0XCIsIFwicGF0aFNlcnZpY2VcIiwgZnVuY3Rpb24gKCR0aW1lb3V0LCAkcGF0aCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogZmFsc2UsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAkcGF0aCArICdkZXNpZ25lci50bXBsLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgYXV0b1NpemU6ICc9JyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiAnPScsXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZENoYW5nZWQ6ICcmJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZGVzaWduZXJDdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50LmhlaWdodCgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm9mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBlbGVtZW50Lm9mZnNldCgpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZWxlbWVudC5vZmZzZXQoKS50b3BcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IE1DRyBvbiAyMDE0LjA5LjA5Li5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdDb21tb24uRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCduZ01vdXNld2hlZWwnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVxdWlyZTogJz9uZ01vZGVsJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5tb3VzZXdoZWVsKGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMubmdNb3VzZXdoZWVsLCB7ZXZlbnQ6IGV2ZW50fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuY29udHJvbGxlcihcImNvbm5lY3RvckN0cmxcIiwgWyckc2NvcGUnLCAndHlwZXMnLCAnZGlyZWN0aW9uJywgZnVuY3Rpb24gKCRzY29wZSwgJHR5cGVzLCAkZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgJHNjb3BlLiRkaXJlY3Rpb24gPSAkZGlyZWN0aW9uO1xyXG4gICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5zZWxlY3RlZFJlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgJHNjb3BlLmhhc1JlZmVyZW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlICE9PSBudWxsO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzLmxlbmd0aCAhPT0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnNldFN0eWxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RyaW5nOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5zdHJpbmcsXHJcbiAgICAgICAgICAgICAgICBib29sOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5ib29sLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5pbnQsXHJcbiAgICAgICAgICAgICAgICAnbm8tdmFsdWUnOiAhJHNjb3BlLmhhc1JlZmVyZW5jZSgpICYmICghJHNjb3BlLnByb3BlcnR5LlZhbHVlIHx8ICRzY29wZS5wcm9wZXJ0eS5WYWx1ZSA9PT0gXCJcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuc2VsZWN0UmVmZXJlbmNlID0gZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSZWZlcmVuY2UgPSByZWZlcmVuY2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9yZWdpb24gRHJhZ2dpbmcgbmV3IHJlZmVyZW5jZVxyXG5cclxuICAgICAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24oJGV2ZW50LmNsaWVudFgsICRldmVudC5jbGllbnRZKTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24oJGV2ZW50LmNsaWVudFgsICRldmVudC5jbGllbnRZKTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdFbmQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtSWQgPSAkKCRldmVudC50YXJnZXQpWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1pdGVtLWlkJyk7XHJcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSAkKCRldmVudC50YXJnZXQpWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1wcm9wZXJ0eS1uYW1lJyk7XHJcbiAgICAgICAgICAgIGlmICghaXRlbUlkIHx8ICFwcm9wZXJ0eU5hbWUpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciByZWZJdGVtID0gJHNjb3BlLmRlc2lnbmVyLmdldEl0ZW0oaXRlbUlkKTtcclxuICAgICAgICAgICAgdmFyIHJlZlByb3AgPSAkc2NvcGUuZGVzaWduZXIuZ2V0UHJvcGVydHkocmVmSXRlbSwgcHJvcGVydHlOYW1lKTtcclxuICAgICAgICAgICAgaWYocmVmUHJvcC5EaXJlY3Rpb24gPT09ICRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gfHwgaXRlbUlkID09PSAkc2NvcGUuaXRlbURhdGEuSWQpe1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWRkUmVmZXJlbmNlcygkc2NvcGUucHJvcGVydHksIHJlZlByb3AsIHJlZkl0ZW0pO1xyXG4gICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIERyYWdnaW5nIG5ldyByZWZlcmVuY2VcclxuXHJcbiAgICAgICAgLy9yZWdpb24gUHJpdmF0ZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgdmFyIGFkZFJlZmVyZW5jZXMgPSBmdW5jdGlvbiAoc291cmNlUHJvcGVydHksIHRhcmdldFByb3BlcnR5LCB0YXJnZXRJdGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VQcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5LlJlZmVyZW5jZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6IHRhcmdldEl0ZW0uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiB0YXJnZXRQcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eS5SZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIFRhc2tJZDogJHNjb3BlLml0ZW1EYXRhLklkLFxyXG4gICAgICAgICAgICAgICAgICAgIFJlZmVyZW5jZWRQcm9wZXJ0eTogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5TmFtZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eS5SZWZlcmVuY2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgVGFza0lkOiAkc2NvcGUuaXRlbURhdGEuSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlOYW1lXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc291cmNlUHJvcGVydHkuUmVmZXJlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6IHRhcmdldEl0ZW0uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiB0YXJnZXRQcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24gPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0ge1xyXG4gICAgICAgICAgICAgICAgeDogKHggLSAkc2NvcGUuZGVzaWduZXIuZ2V0T2Zmc2V0KCkueCkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLngpICsgJHNjb3BlLmRlc2lnbmVyLmdldFZpZXdCb3goKS54IC0gMSxcclxuICAgICAgICAgICAgICAgIHk6ICh5IC0gJHNjb3BlLmRlc2lnbmVyLmdldE9mZnNldCgpLnkpICogKDEgLyAkc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS55KSArICRzY29wZS5kZXNpZ25lci5nZXRWaWV3Qm94KCkueSAtIDFcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBQcml2YXRlIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSlcclxuOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmRpcmVjdGl2ZSgnY29ubmVjdG9yJywgWyd0eXBlcycsICdkaXJlY3Rpb24nLCAncGF0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJHR5cGVzLCAkZGlyZWN0aW9uLCAkcGF0aCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgcmVxdWlyZTogJ15kZXNpZ25lcicsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAkcGF0aCArICdjb25uZWN0b3IudG1wbC5odG1sJyxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2Nvbm5lY3RvckN0cmwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgaXRlbURhdGE6ICc9JyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiAnPScsXHJcbiAgICAgICAgICAgICAgICBpbmRleDogJz0nLFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0OiAnPSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMsIGRlc2lnbmVyQ3RybCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlc2lnbmVyID0gZGVzaWduZXJDdHJsO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vcmVnaW9uIEFkZCBmdW5jdGlvbnMgdG8gcHJvcGVydHkgb2JqZWN0XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb3BlcnR5LmNhbGN1bGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wcyA9ICRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQgPyAkc2NvcGUuaXRlbURhdGEuSW5wdXRQcm9wZXJ0aWVzIDogJHNjb3BlLml0ZW1EYXRhLk91dHB1dFByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiAkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0ID8gJHNjb3BlLml0ZW1EYXRhLlBvc2l0aW9uLlggOiAkc2NvcGUuaXRlbURhdGEuUG9zaXRpb24uWCArIDI1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogJHNjb3BlLml0ZW1EYXRhLlBvc2l0aW9uLlkgKyAkc2NvcGUub2Zmc2V0ICsgKCgxNzAgLSAkc2NvcGUub2Zmc2V0KSAvIChwcm9wcy5sZW5ndGggKyAxKSkgKiAoJHNjb3BlLmluZGV4ICsgMSlcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eS5yZW1vdmVSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaXRlbUlkLCByZWZlcmVuY2VkUHJvcGVydHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVmSXRlbSA9ICRzY29wZS5kZXNpZ25lci5nZXRJdGVtKGl0ZW1JZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZlByb3AgPSAkc2NvcGUuZGVzaWduZXIuZ2V0UHJvcGVydHkocmVmSXRlbSwgcmVmZXJlbmNlZFByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbnEoJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZXMpLnJlbW92ZShmdW5jdGlvbiAocmVmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVmLlRhc2tJZCA9PT0gaXRlbUlkICYmIHJlZi5SZWZlcmVuY2VkUHJvcGVydHkgPT09IHJlZmVyZW5jZWRQcm9wZXJ0eTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJlZlByb3AucmVtb3ZlUmVmZXJlbmNlKCRzY29wZS5pdGVtRGF0YS5JZCwgJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5TmFtZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vZW5kcmVnaW9uIEFkZCBmdW5jdGlvbnMgdG8gcHJvcGVydHkgb2JqZWN0XHJcblxyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vSXQgbmVlZHMgZm9yIGFuZ3VsYXIsIHJlbW92ZXMgc3ZnIHdyYXBwZXJcclxuICAgICAgICAgICAgICAgIHZhciBlID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnQuY2hpbGRyZW4oKSk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlcGxhY2VXaXRoKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOS85LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJylcclxuICAgIC5jb250cm9sbGVyKFwiZGVzaWduZXJDdHJsXCIsIFsnJHNjb3BlJywgJ2RpcmVjdGlvbicsIGZ1bmN0aW9uICgkc2NvcGUsICRkaXJlY3Rpb24pIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgICAgaGVpZ2h0OiAwXHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuc2NhbGUgPSB7XHJcbiAgICAgICAgICAgIHg6IDEsXHJcbiAgICAgICAgICAgIHk6IDFcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS52aWV3Qm94ID0ge1xyXG4gICAgICAgICAgICB4OiAwLFxyXG4gICAgICAgICAgICB5OiAwLFxyXG4gICAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgICAgaGVpZ2h0OiAwXHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUubW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vcmVnaW9uIENvbnRyb2xsZXIgZnVuY3Rpb25zXHJcblxyXG4gICAgICAgIHRoaXMuZ2V0U2NhbGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2NhbGU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRPZmZzZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHg6ICRzY29wZS5vZmZzZXQueCwgeTogJHNjb3BlLm9mZnNldC55fTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldFZpZXdCb3ggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUudmlld0JveDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldEl0ZW0gPSBmdW5jdGlvbiAoaXRlbUlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsaW5xKCRzY29wZS5pdGVtcykuZmlyc3QoZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLklkID09PSBpdGVtSWQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0UHJvcGVydHkgPSBmdW5jdGlvbiAoaXRlbSwgcHJvcGVydHlOYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9wID0gbGlucShpdGVtLklucHV0UHJvcGVydGllcykuZmlyc3RPckRlZmF1bHQoZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkuUHJvcGVydHlOYW1lID09PSBwcm9wZXJ0eU5hbWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAocHJvcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBsaW5xKGl0ZW0uT3V0cHV0UHJvcGVydGllcykuZmlyc3RPckRlZmF1bHQoZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkuUHJvcGVydHlOYW1lID09PSBwcm9wZXJ0eU5hbWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlZFByb3BlcnR5ID0gZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IHNlbGYuZ2V0SXRlbShyZWZlcmVuY2UuVGFza0lkKTtcclxuICAgICAgICAgICAgdmFyIHByb3AgPSBzZWxmLmdldFByb3BlcnR5KGl0ZW0sIHJlZmVyZW5jZS5SZWZlcmVuY2VkUHJvcGVydHkpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHByb3A7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gQ29udHJvbGxlciBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgLy9yZWdpb24gRGVzaWduZXIgaXRlbSBoYW5kbGluZ1xyXG5cclxuICAgICAgICB0aGlzLnNlbGVjdEl0ZW0gPSBmdW5jdGlvbiAoc2VsZWN0ZWRJdGVtKSB7XHJcbiAgICAgICAgICAgIGxpbnEoJHNjb3BlLml0ZW1zKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNlbGVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW0uc2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDaGFuZ2VkKHtpdGVtOiBzZWxlY3RlZEl0ZW19KTtcclxuXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5yZW1vdmVJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgbGlucShpdGVtLklucHV0UHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHByb3AuUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcC5yZW1vdmVSZWZlcmVuY2UocHJvcC5SZWZlcmVuY2UuVGFza0lkLCBwcm9wLlJlZmVyZW5jZS5SZWZlcmVuY2VkUHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxpbnEoaXRlbS5PdXRwdXRQcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5xKHByb3AuUmVmZXJlbmNlcykuZm9yRWFjaChmdW5jdGlvbiAocmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcC5yZW1vdmVSZWZlcmVuY2UocmVmZXJlbmNlLlRhc2tJZCwgcmVmZXJlbmNlLlJlZmVyZW5jZWRQcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsaW5xKCRzY29wZS5pdGVtcykucmVtb3ZlKGl0ZW0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIERlc2lnbmVyIGl0ZW0gaGFuZGxpbmdcclxuXHJcbiAgICAgICAgLy9yZWdpb24gWm9vbWluZ1xyXG5cclxuICAgICAgICAkc2NvcGUub25Nb3VzZVdoZWVsID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBzdGVwID0gMC4xO1xyXG5cclxuICAgICAgICAgICAgaWYgKGV2ZW50LmRlbHRhWSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuc2NhbGUueCAtIHN0ZXAgPD0gMCB8fCAkc2NvcGUuc2NhbGUueSAtIHN0ZXAgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICRzY29wZS5zY2FsZS54IC09IHN0ZXA7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueSAtPSBzdGVwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChldmVudC5kZWx0YVkgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zY2FsZS54ICs9IHN0ZXA7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueSArPSBzdGVwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gX3VwZGF0ZVZpZXdCb3hTaXplKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUudmlld0JveC53aWR0aCA9ICRzY29wZS5zaXplLndpZHRoIC8gJHNjb3BlLnNjYWxlLng7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LmhlaWdodCA9ICRzY29wZS5zaXplLmhlaWdodCAvICRzY29wZS5zY2FsZS55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHNpemVXYXRjaGVyID0gJHNjb3BlLiR3YXRjaCgnc2l6ZScsIF91cGRhdGVWaWV3Qm94U2l6ZSwgdHJ1ZSk7XHJcbiAgICAgICAgdmFyIHNjYWxlV2F0Y2hlciA9ICRzY29wZS4kd2F0Y2goJ3NjYWxlJywgX3VwZGF0ZVZpZXdCb3hTaXplLCB0cnVlKTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gWm9vbWluZ1xyXG5cclxuICAgICAgICAvLyByZWdpb24gVmlld2JveCBtb3ZpbmdcclxuXHJcbiAgICAgICAgdmFyIG1vdmVYLCBtb3ZlWSA9IDA7XHJcbiAgICAgICAgJHNjb3BlLm1vdmVTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgbW92ZVggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgbW92ZVkgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJHNjb3BlLm1vdmluZyA9IHRydWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLm1vdmUgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gJGV2ZW50LmNsaWVudFg7XHJcbiAgICAgICAgICAgIHZhciB5ID0gJGV2ZW50LmNsaWVudFk7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LnggLT0gKHggLSBtb3ZlWCkgKiAoMSAvICRzY29wZS5zY2FsZS54KTtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3gueSAtPSAoeSAtIG1vdmVZKSAqICgxIC8gJHNjb3BlLnNjYWxlLnkpO1xyXG4gICAgICAgICAgICBtb3ZlWCA9IHg7XHJcbiAgICAgICAgICAgIG1vdmVZID0geTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUubW92ZUVuZCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm1vdmluZyA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIFZpZXdib3ggbW92aW5nXHJcblxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2l6ZVdhdGNoZXIoKTtcclxuICAgICAgICAgICAgc2NhbGVXYXRjaGVyKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSlcclxuOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmNvbnRyb2xsZXIoXCJpdGVtQ3RybFwiLCBbJyRzY29wZScsICd0eXBlcycsICdzdGF0dXMnLCBmdW5jdGlvbiAoJHNjb3BlLCAkdHlwZXMsICRzdGF0dXMpIHtcclxuICAgICAgICAkc2NvcGUuJHN0YXR1cyA9ICRzdGF0dXM7XHJcbiAgICAgICAgJHNjb3BlLiR0eXBlcyA9ICR0eXBlcztcclxuICAgICAgICAkc2NvcGUud2lkdGggPSAyNTA7XHJcbiAgICAgICAgJHNjb3BlLmhlaWdodCA9IDE3MDtcclxuICAgICAgICAkc2NvcGUuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB2YXIgZHJhZ1gsIGRyYWdZID0gMDtcclxuICAgICAgICAkc2NvcGUuZHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICBkcmFnWCA9ICRldmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICBkcmFnWSA9ICRldmVudC5jbGllbnRZO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgdmFyIHggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgdmFyIHkgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJHNjb3BlLmRhdGEuUG9zaXRpb24uWCArPSAoeCAtIGRyYWdYKSAqICgxIC8gJHNjb3BlLmRlc2lnbmVyLmdldFNjYWxlKCkueCk7XHJcbiAgICAgICAgICAgICRzY29wZS5kYXRhLlBvc2l0aW9uLlkgKz0gKHkgLSBkcmFnWSkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLnkpO1xyXG4gICAgICAgICAgICBkcmFnWCA9IHg7XHJcbiAgICAgICAgICAgIGRyYWdZID0geTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdFbmQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgICRzY29wZS5kcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5vbkl0ZW1DbGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRlc2lnbmVyLnNlbGVjdEl0ZW0oJHNjb3BlLmRhdGEpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2Rlc2lnbmVySXRlbScsIFsgJ3R5cGVzJywgJ3N0YXR1cycsICdwYXRoU2VydmljZScsIGZ1bmN0aW9uICgkdHlwZXMsICRzdGF0dXMsICRwYXRoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJBRVwiLFxyXG4gICAgICAgICAgICByZXF1aXJlOiAnXmRlc2lnbmVyJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICRwYXRoICsgJ2l0ZW0udG1wbC5odG1sJyxcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIGRhdGE6ICc9JyxcclxuICAgICAgICAgICAgICAgIG9mZnNldFg6ICc9JyxcclxuICAgICAgICAgICAgICAgIG9mZnNldFk6ICc9J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnaXRlbUN0cmwnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycywgZGVzaWduZXJDdHJsKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YS5TdGF0dXMgPSAkc3RhdHVzLm5vdHJ1bjtcclxuICAgICAgICAgICAgICAgICRzY29wZS5kZXNpZ25lciA9IGRlc2lnbmVyQ3RybDtcclxuICAgICAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgICAgICAvL0l0IG5lZWRzIGZvciBhbmd1bGFyLCByZW1vdmVzIHN2ZyB3cmFwcGVyXHJcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LmNoaWxkcmVuKCkpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2l0ZW1UaXRsZScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImZvbnQtbSBib3gtaGVhZGVyXCIgbmctdHJhbnNjbHVkZT48L2Rpdj4nLFxyXG4gICAgICAgICAgICB0cmFuc2NsdWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnaXRlbURlc2NyaXB0aW9uJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImZvbnQteHNcIiBuZy10cmFuc2NsdWRlPjwvZGl2PicsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pIiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDEwLzYvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInLCBbXSlcclxuICAgIC5zZXJ2aWNlKFwicGF0aFNlcnZpY2VcIiwgWyBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIF90ZW1wbGF0ZUJhc2VVcmwgPSBcInNyYy90ZW1wbGF0ZXMvXCI7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICB0ZW1wbGF0ZXNCYXNlVXJsOiBfdGVtcGxhdGVCYXNlVXJsLFxyXG4gICAgICAgICAgICBzZXRQYXRoOiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgX3RlbXBsYXRlQmFzZVVybCA9IG9wdGlvbnMudGVtcGxhdGVzQmFzZVVybDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDgvNS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ1N2Zy5EaXJlY3RpdmUnLCBbXSlcclxuICAgIC5kaXJlY3RpdmUoJ25nV2lkdGgnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1dpZHRoLCBmdW5jdGlvbiAod2lkdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nSGVpZ2h0JywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdIZWlnaHQsIGZ1bmN0aW9uIChoZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYJywgWyckY29tcGlsZScsIGZ1bmN0aW9uICgkY29tcGlsZSkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdYLCBmdW5jdGlvbiAoeCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInhcIiwgeCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWSwgZnVuY3Rpb24gKHkpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ5XCIsIHkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ0N4JywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdDeCwgZnVuY3Rpb24gKGN4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwiY3hcIiwgY3gpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ0N5JywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdDeSwgZnVuY3Rpb24gKGN5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwiY3lcIiwgY3kpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1gxJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdYMSwgZnVuY3Rpb24gKHgxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieDFcIiwgeDEpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1gyJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdYMiwgZnVuY3Rpb24gKHgyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieDJcIiwgeDIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1kxJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdZMSwgZnVuY3Rpb24gKHkxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieTFcIiwgeTEpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1kyJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdZMiwgZnVuY3Rpb24gKHkyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieTJcIiwgeTIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCdhdXRvU2l6ZScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNpemUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogZWxlbWVudC53aWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50LmhlaWdodCgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nVmlld2JveCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nVmlld2JveCwgZnVuY3Rpb24gKHZpZXdib3gpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZpZXdib3gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSB2aWV3Ym94LnggKyBcIiBcIiArIHZpZXdib3gueSArIFwiIFwiICsgdmlld2JveC53aWR0aCArIFwiIFwiICsgdmlld2JveC5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudFswXS5zZXRBdHRyaWJ1dGUoXCJ2aWV3Qm94XCIsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgndGV4dEVsbGlwc2lzJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIHZhciBtYXhXaWR0aCA9IHBhcnNlRmxvYXQoYXR0cnMubWF4V2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gJHNjb3BlLiRldmFsKGF0dHJzLnRleHRFbGxpcHNpcyk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnRleHQodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQud2lkdGgoKSA+IG1heFdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGVsZW1lbnQud2lkdGgoKSA+IG1heFdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKDAsIHZhbHVlLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRleHQodmFsdWUuc3Vic3RyaW5nKDAsIHZhbHVlLmxlbmd0aCAtIDEpICsgJy4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDgvMTUvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdUb3VjaC5EaXJlY3RpdmUnLCBbXSlcclxuICAgIC5kaXJlY3RpdmUoJ3RhcCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHRpbWVTdGFtcDtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYmluZCgnbW91c2Vkb3duJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZVN0YW1wID0gbmV3IERhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYmluZCgnbW91c2V1cCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0ZSAtIHRpbWVTdGFtcCA8PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMudGFwLCB7ICRldmVudDogZXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgICAgICAvL0Rpc3Bvc2luZ1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC51bmJpbmQoJ21vdXNlZG93bicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZXVwJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KS5kaXJlY3RpdmUoJ2RvdWJsZVRhcCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5oYW1tZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcHM6IDJcclxuICAgICAgICAgICAgICAgIH0pLmJpbmQoJ3RhcCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5nZXN0dXJlLnRhcENvdW50ID09PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLmRvdWJsZVRhcCwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaGFtbWVyKCkudW5iaW5kKCd0YXAnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pLmRpcmVjdGl2ZSgncGFuJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5idXR0b24gIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnBhbkJlZ2luLCB7ICRldmVudDogZXZlbnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1vdXNlTW92ZUhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5wYW4sIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5iaW5kKCdtb3VzZW1vdmUnLCBtb3VzZU1vdmVIYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1vdXNlVXBIYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMucGFuUmVsZWFzZSwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnVuYmluZCgnbW91c2Vtb3ZlJywgbW91c2VNb3ZlSGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudW5iaW5kKCdtb3VzZXVwJywgbW91c2VVcEhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLmJpbmQoJ21vdXNldXAnLCBtb3VzZVVwSGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgICAgICAvL0Rpc3Bvc2luZ1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC51bmJpbmQoJ21vdXNlZG93bicpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9