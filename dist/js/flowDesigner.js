/**
 * Created by gmeszaros on 8/5/2014.
 */
angular.module('FlowDesigner', ['Svg.Directive', 'Touch.Directive', 'Common.Directive'])
    .constant("types", {
        text: 'Text',
        bool: 'Bool',
        number: 'Number'
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
    .directive('designer', ["$timeout", "FlowDesigner.PathService", function ($timeout, $path) {
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
                return $scope.property.References !== null && $scope.property.References.length !== 0;
            }
        };
        $scope.setStyle = function () {
            return {
                string: $scope.property.PropertyValueType === $types.string,
                bool: $scope.property.PropertyValueType === $types.bool,
                number: $scope.property.PropertyValueType === $types.number,
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
    .directive('connector', ['types', 'direction', 'FlowDesigner.PathService', function ($types, $direction, $path) {
        return{
            restrict: "AE",
            replace: true,
            require: '^designer',
            templateUrl: $path.templatesBaseUrl + 'connector.tmpl.html',
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
    .directive('designerItem', [ 'types', 'status', 'FlowDesigner.PathService', function ($types, $status, $path) {
        return{
            restrict: "AE",
            require: '^designer',
            replace: true,
            templateUrl: $path.templatesBaseUrl + 'item.tmpl.html',
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
var scripts = document.getElementsByTagName("script");
var currentScriptPath = scripts[scripts.length - 1].src;
var flowDesignerRootPath = currentScriptPath.split("js/")[0];

angular.module('FlowDesigner')
    .service("FlowDesigner.PathService", [ function () {
        return{
            templatesBaseUrl: flowDesignerRootPath + "templates/"
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlc2lnbmVyRGlyZWN0aXZlLmpzIiwiY29tbW9uRGlyZWN0aXZlLmpzIiwiY29ubmVjdG9yQ3RybC5qcyIsImNvbm5lY3RvckRpcmVjdGl2ZS5qcyIsImRlc2lnbmVyQ3RybC5qcyIsIml0ZW1EaXJlY3RpdmUuanMiLCJyZXNvdXJjZVBhdGhTZXJ2aWNlLmpzIiwic3ZnRGlyZWN0aXZlLmpzIiwidG91Y2hEaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJmbG93RGVzaWduZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOC81LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJywgWydTdmcuRGlyZWN0aXZlJywgJ1RvdWNoLkRpcmVjdGl2ZScsICdDb21tb24uRGlyZWN0aXZlJ10pXHJcbiAgICAuY29uc3RhbnQoXCJ0eXBlc1wiLCB7XHJcbiAgICAgICAgdGV4dDogJ1RleHQnLFxyXG4gICAgICAgIGJvb2w6ICdCb29sJyxcclxuICAgICAgICBudW1iZXI6ICdOdW1iZXInXHJcbiAgICB9KVxyXG4gICAgLmNvbnN0YW50KFwic3RhdHVzXCIsIHtcclxuICAgICAgICBub3RydW46ICdub3RydW4nLFxyXG4gICAgICAgIHJ1bm5pbmc6ICdydW5uaW5nJyxcclxuICAgICAgICBmYWlsZWQ6ICdmYWlsZWQnLFxyXG4gICAgICAgIHN1Y2NlZWRlZDogJ3N1Y2NlZWRlZCdcclxuICAgIH0pXHJcbiAgICAuY29uc3RhbnQoXCJkaXJlY3Rpb25cIiwge1xyXG4gICAgICAgIGlucHV0OiAnaW5wdXQnLFxyXG4gICAgICAgIG91dHB1dDogJ291dHB1dCdcclxuICAgIH0pXHJcbiAgICAuZGlyZWN0aXZlKCdkZXNpZ25lcicsIFtcIiR0aW1lb3V0XCIsIFwiRmxvd0Rlc2lnbmVyLlBhdGhTZXJ2aWNlXCIsIGZ1bmN0aW9uICgkdGltZW91dCwgJHBhdGgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IGZhbHNlLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJHBhdGgudGVtcGxhdGVzQmFzZVVybCArICdkZXNpZ25lci50bXBsLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgYXV0b1NpemU6ICc9JyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiAnPScsXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZENoYW5nZWQ6ICcmJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZGVzaWduZXJDdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50LmhlaWdodCgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm9mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBlbGVtZW50Lm9mZnNldCgpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZWxlbWVudC5vZmZzZXQoKS50b3BcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IE1DRyBvbiAyMDE0LjA5LjA5Li5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdDb21tb24uRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCduZ01vdXNld2hlZWwnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVxdWlyZTogJz9uZ01vZGVsJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5tb3VzZXdoZWVsKGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMubmdNb3VzZXdoZWVsLCB7ZXZlbnQ6IGV2ZW50fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuY29udHJvbGxlcihcImNvbm5lY3RvckN0cmxcIiwgWyckc2NvcGUnLCAndHlwZXMnLCAnZGlyZWN0aW9uJywgZnVuY3Rpb24gKCRzY29wZSwgJHR5cGVzLCAkZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgJHNjb3BlLiRkaXJlY3Rpb24gPSAkZGlyZWN0aW9uO1xyXG4gICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5zZWxlY3RlZFJlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgJHNjb3BlLmhhc1JlZmVyZW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlICE9PSBudWxsO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzICE9PSBudWxsICYmICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzLmxlbmd0aCAhPT0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnNldFN0eWxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RyaW5nOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5zdHJpbmcsXHJcbiAgICAgICAgICAgICAgICBib29sOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5ib29sLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyOiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlWYWx1ZVR5cGUgPT09ICR0eXBlcy5udW1iZXIsXHJcbiAgICAgICAgICAgICAgICAnbm8tdmFsdWUnOiAhJHNjb3BlLmhhc1JlZmVyZW5jZSgpICYmICghJHNjb3BlLnByb3BlcnR5LlZhbHVlIHx8ICRzY29wZS5wcm9wZXJ0eS5WYWx1ZSA9PT0gXCJcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuc2VsZWN0UmVmZXJlbmNlID0gZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSZWZlcmVuY2UgPSByZWZlcmVuY2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9yZWdpb24gRHJhZ2dpbmcgbmV3IHJlZmVyZW5jZVxyXG5cclxuICAgICAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24oJGV2ZW50LmNsaWVudFgsICRldmVudC5jbGllbnRZKTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24oJGV2ZW50LmNsaWVudFgsICRldmVudC5jbGllbnRZKTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdFbmQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtSWQgPSAkKCRldmVudC50YXJnZXQpWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1pdGVtLWlkJyk7XHJcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSAkKCRldmVudC50YXJnZXQpWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1wcm9wZXJ0eS1uYW1lJyk7XHJcbiAgICAgICAgICAgIGlmICghaXRlbUlkIHx8ICFwcm9wZXJ0eU5hbWUpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciByZWZJdGVtID0gJHNjb3BlLmRlc2lnbmVyLmdldEl0ZW0oaXRlbUlkKTtcclxuICAgICAgICAgICAgdmFyIHJlZlByb3AgPSAkc2NvcGUuZGVzaWduZXIuZ2V0UHJvcGVydHkocmVmSXRlbSwgcHJvcGVydHlOYW1lKTtcclxuICAgICAgICAgICAgaWYocmVmUHJvcC5EaXJlY3Rpb24gPT09ICRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gfHwgaXRlbUlkID09PSAkc2NvcGUuaXRlbURhdGEuSWQpe1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWRkUmVmZXJlbmNlcygkc2NvcGUucHJvcGVydHksIHJlZlByb3AsIHJlZkl0ZW0pO1xyXG4gICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIERyYWdnaW5nIG5ldyByZWZlcmVuY2VcclxuXHJcbiAgICAgICAgLy9yZWdpb24gUHJpdmF0ZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgdmFyIGFkZFJlZmVyZW5jZXMgPSBmdW5jdGlvbiAoc291cmNlUHJvcGVydHksIHRhcmdldFByb3BlcnR5LCB0YXJnZXRJdGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VQcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5LlJlZmVyZW5jZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6IHRhcmdldEl0ZW0uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiB0YXJnZXRQcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eS5SZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIFRhc2tJZDogJHNjb3BlLml0ZW1EYXRhLklkLFxyXG4gICAgICAgICAgICAgICAgICAgIFJlZmVyZW5jZWRQcm9wZXJ0eTogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5TmFtZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eS5SZWZlcmVuY2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgVGFza0lkOiAkc2NvcGUuaXRlbURhdGEuSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiAkc2NvcGUucHJvcGVydHkuUHJvcGVydHlOYW1lXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc291cmNlUHJvcGVydHkuUmVmZXJlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6IHRhcmdldEl0ZW0uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgUmVmZXJlbmNlZFByb3BlcnR5OiB0YXJnZXRQcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgc2V0TmV3UmVmZXJlbmNlUG9zaXRpb24gPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0ge1xyXG4gICAgICAgICAgICAgICAgeDogKHggLSAkc2NvcGUuZGVzaWduZXIuZ2V0T2Zmc2V0KCkueCkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLngpICsgJHNjb3BlLmRlc2lnbmVyLmdldFZpZXdCb3goKS54IC0gMSxcclxuICAgICAgICAgICAgICAgIHk6ICh5IC0gJHNjb3BlLmRlc2lnbmVyLmdldE9mZnNldCgpLnkpICogKDEgLyAkc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS55KSArICRzY29wZS5kZXNpZ25lci5nZXRWaWV3Qm94KCkueSAtIDFcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBQcml2YXRlIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSlcclxuOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmRpcmVjdGl2ZSgnY29ubmVjdG9yJywgWyd0eXBlcycsICdkaXJlY3Rpb24nLCAnRmxvd0Rlc2lnbmVyLlBhdGhTZXJ2aWNlJywgZnVuY3Rpb24gKCR0eXBlcywgJGRpcmVjdGlvbiwgJHBhdGgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6ICdeZGVzaWduZXInLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJHBhdGgudGVtcGxhdGVzQmFzZVVybCArICdjb25uZWN0b3IudG1wbC5odG1sJyxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2Nvbm5lY3RvckN0cmwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgaXRlbURhdGE6ICc9JyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiAnPScsXHJcbiAgICAgICAgICAgICAgICBpbmRleDogJz0nLFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0OiAnPSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMsIGRlc2lnbmVyQ3RybCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlc2lnbmVyID0gZGVzaWduZXJDdHJsO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vcmVnaW9uIEFkZCBmdW5jdGlvbnMgdG8gcHJvcGVydHkgb2JqZWN0XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb3BlcnR5LmNhbGN1bGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wcyA9ICRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQgPyAkc2NvcGUuaXRlbURhdGEuSW5wdXRQcm9wZXJ0aWVzIDogJHNjb3BlLml0ZW1EYXRhLk91dHB1dFByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiAkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0ID8gJHNjb3BlLml0ZW1EYXRhLlBvc2l0aW9uLlggOiAkc2NvcGUuaXRlbURhdGEuUG9zaXRpb24uWCArIDI1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogJHNjb3BlLml0ZW1EYXRhLlBvc2l0aW9uLlkgKyAkc2NvcGUub2Zmc2V0ICsgKCgxNzAgLSAkc2NvcGUub2Zmc2V0KSAvIChwcm9wcy5sZW5ndGggKyAxKSkgKiAoJHNjb3BlLmluZGV4ICsgMSlcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eS5yZW1vdmVSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaXRlbUlkLCByZWZlcmVuY2VkUHJvcGVydHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVmSXRlbSA9ICRzY29wZS5kZXNpZ25lci5nZXRJdGVtKGl0ZW1JZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZlByb3AgPSAkc2NvcGUuZGVzaWduZXIuZ2V0UHJvcGVydHkocmVmSXRlbSwgcmVmZXJlbmNlZFByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbnEoJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZXMpLnJlbW92ZShmdW5jdGlvbiAocmVmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVmLlRhc2tJZCA9PT0gaXRlbUlkICYmIHJlZi5SZWZlcmVuY2VkUHJvcGVydHkgPT09IHJlZmVyZW5jZWRQcm9wZXJ0eTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJlZlByb3AucmVtb3ZlUmVmZXJlbmNlKCRzY29wZS5pdGVtRGF0YS5JZCwgJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5TmFtZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vZW5kcmVnaW9uIEFkZCBmdW5jdGlvbnMgdG8gcHJvcGVydHkgb2JqZWN0XHJcblxyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vSXQgbmVlZHMgZm9yIGFuZ3VsYXIsIHJlbW92ZXMgc3ZnIHdyYXBwZXJcclxuICAgICAgICAgICAgICAgIHZhciBlID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnQuY2hpbGRyZW4oKSk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlcGxhY2VXaXRoKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOS85LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJylcclxuICAgIC5jb250cm9sbGVyKFwiZGVzaWduZXJDdHJsXCIsIFsnJHNjb3BlJywgJ2RpcmVjdGlvbicsIGZ1bmN0aW9uICgkc2NvcGUsICRkaXJlY3Rpb24pIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgICAgaGVpZ2h0OiAwXHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuc2NhbGUgPSB7XHJcbiAgICAgICAgICAgIHg6IDEsXHJcbiAgICAgICAgICAgIHk6IDFcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS52aWV3Qm94ID0ge1xyXG4gICAgICAgICAgICB4OiAwLFxyXG4gICAgICAgICAgICB5OiAwLFxyXG4gICAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgICAgaGVpZ2h0OiAwXHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUubW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vcmVnaW9uIENvbnRyb2xsZXIgZnVuY3Rpb25zXHJcblxyXG4gICAgICAgIHRoaXMuZ2V0U2NhbGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2NhbGU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRPZmZzZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHg6ICRzY29wZS5vZmZzZXQueCwgeTogJHNjb3BlLm9mZnNldC55fTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldFZpZXdCb3ggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUudmlld0JveDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldEl0ZW0gPSBmdW5jdGlvbiAoaXRlbUlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsaW5xKCRzY29wZS5pdGVtcykuZmlyc3QoZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLklkID09PSBpdGVtSWQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0UHJvcGVydHkgPSBmdW5jdGlvbiAoaXRlbSwgcHJvcGVydHlOYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9wID0gbGlucShpdGVtLklucHV0UHJvcGVydGllcykuZmlyc3RPckRlZmF1bHQoZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkuUHJvcGVydHlOYW1lID09PSBwcm9wZXJ0eU5hbWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAocHJvcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBsaW5xKGl0ZW0uT3V0cHV0UHJvcGVydGllcykuZmlyc3RPckRlZmF1bHQoZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkuUHJvcGVydHlOYW1lID09PSBwcm9wZXJ0eU5hbWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlZFByb3BlcnR5ID0gZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IHNlbGYuZ2V0SXRlbShyZWZlcmVuY2UuVGFza0lkKTtcclxuICAgICAgICAgICAgdmFyIHByb3AgPSBzZWxmLmdldFByb3BlcnR5KGl0ZW0sIHJlZmVyZW5jZS5SZWZlcmVuY2VkUHJvcGVydHkpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHByb3A7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gQ29udHJvbGxlciBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgLy9yZWdpb24gRGVzaWduZXIgaXRlbSBoYW5kbGluZ1xyXG5cclxuICAgICAgICB0aGlzLnNlbGVjdEl0ZW0gPSBmdW5jdGlvbiAoc2VsZWN0ZWRJdGVtKSB7XHJcbiAgICAgICAgICAgIGxpbnEoJHNjb3BlLml0ZW1zKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNlbGVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW0uc2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDaGFuZ2VkKHtpdGVtOiBzZWxlY3RlZEl0ZW19KTtcclxuXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5yZW1vdmVJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgbGlucShpdGVtLklucHV0UHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHByb3AuUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcC5yZW1vdmVSZWZlcmVuY2UocHJvcC5SZWZlcmVuY2UuVGFza0lkLCBwcm9wLlJlZmVyZW5jZS5SZWZlcmVuY2VkUHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxpbnEoaXRlbS5PdXRwdXRQcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5xKHByb3AuUmVmZXJlbmNlcykuZm9yRWFjaChmdW5jdGlvbiAocmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcC5yZW1vdmVSZWZlcmVuY2UocmVmZXJlbmNlLlRhc2tJZCwgcmVmZXJlbmNlLlJlZmVyZW5jZWRQcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsaW5xKCRzY29wZS5pdGVtcykucmVtb3ZlKGl0ZW0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIERlc2lnbmVyIGl0ZW0gaGFuZGxpbmdcclxuXHJcbiAgICAgICAgLy9yZWdpb24gWm9vbWluZ1xyXG5cclxuICAgICAgICAkc2NvcGUub25Nb3VzZVdoZWVsID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBzdGVwID0gMC4xO1xyXG5cclxuICAgICAgICAgICAgaWYgKGV2ZW50LmRlbHRhWSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuc2NhbGUueCAtIHN0ZXAgPD0gMCB8fCAkc2NvcGUuc2NhbGUueSAtIHN0ZXAgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICRzY29wZS5zY2FsZS54IC09IHN0ZXA7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueSAtPSBzdGVwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChldmVudC5kZWx0YVkgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zY2FsZS54ICs9IHN0ZXA7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueSArPSBzdGVwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gX3VwZGF0ZVZpZXdCb3hTaXplKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUudmlld0JveC53aWR0aCA9ICRzY29wZS5zaXplLndpZHRoIC8gJHNjb3BlLnNjYWxlLng7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LmhlaWdodCA9ICRzY29wZS5zaXplLmhlaWdodCAvICRzY29wZS5zY2FsZS55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHNpemVXYXRjaGVyID0gJHNjb3BlLiR3YXRjaCgnc2l6ZScsIF91cGRhdGVWaWV3Qm94U2l6ZSwgdHJ1ZSk7XHJcbiAgICAgICAgdmFyIHNjYWxlV2F0Y2hlciA9ICRzY29wZS4kd2F0Y2goJ3NjYWxlJywgX3VwZGF0ZVZpZXdCb3hTaXplLCB0cnVlKTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gWm9vbWluZ1xyXG5cclxuICAgICAgICAvLyByZWdpb24gVmlld2JveCBtb3ZpbmdcclxuXHJcbiAgICAgICAgdmFyIG1vdmVYLCBtb3ZlWSA9IDA7XHJcbiAgICAgICAgJHNjb3BlLm1vdmVTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgbW92ZVggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgbW92ZVkgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJHNjb3BlLm1vdmluZyA9IHRydWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLm1vdmUgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gJGV2ZW50LmNsaWVudFg7XHJcbiAgICAgICAgICAgIHZhciB5ID0gJGV2ZW50LmNsaWVudFk7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LnggLT0gKHggLSBtb3ZlWCkgKiAoMSAvICRzY29wZS5zY2FsZS54KTtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3gueSAtPSAoeSAtIG1vdmVZKSAqICgxIC8gJHNjb3BlLnNjYWxlLnkpO1xyXG4gICAgICAgICAgICBtb3ZlWCA9IHg7XHJcbiAgICAgICAgICAgIG1vdmVZID0geTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUubW92ZUVuZCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm1vdmluZyA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIFZpZXdib3ggbW92aW5nXHJcblxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2l6ZVdhdGNoZXIoKTtcclxuICAgICAgICAgICAgc2NhbGVXYXRjaGVyKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSlcclxuOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmNvbnRyb2xsZXIoXCJpdGVtQ3RybFwiLCBbJyRzY29wZScsICd0eXBlcycsICdzdGF0dXMnLCBmdW5jdGlvbiAoJHNjb3BlLCAkdHlwZXMsICRzdGF0dXMpIHtcclxuICAgICAgICAkc2NvcGUuJHN0YXR1cyA9ICRzdGF0dXM7XHJcbiAgICAgICAgJHNjb3BlLiR0eXBlcyA9ICR0eXBlcztcclxuICAgICAgICAkc2NvcGUud2lkdGggPSAyNTA7XHJcbiAgICAgICAgJHNjb3BlLmhlaWdodCA9IDE3MDtcclxuICAgICAgICAkc2NvcGUuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB2YXIgZHJhZ1gsIGRyYWdZID0gMDtcclxuICAgICAgICAkc2NvcGUuZHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICBkcmFnWCA9ICRldmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICBkcmFnWSA9ICRldmVudC5jbGllbnRZO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgdmFyIHggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgdmFyIHkgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJHNjb3BlLmRhdGEuUG9zaXRpb24uWCArPSAoeCAtIGRyYWdYKSAqICgxIC8gJHNjb3BlLmRlc2lnbmVyLmdldFNjYWxlKCkueCk7XHJcbiAgICAgICAgICAgICRzY29wZS5kYXRhLlBvc2l0aW9uLlkgKz0gKHkgLSBkcmFnWSkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLnkpO1xyXG4gICAgICAgICAgICBkcmFnWCA9IHg7XHJcbiAgICAgICAgICAgIGRyYWdZID0geTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWdFbmQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgICRzY29wZS5kcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5vbkl0ZW1DbGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRlc2lnbmVyLnNlbGVjdEl0ZW0oJHNjb3BlLmRhdGEpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2Rlc2lnbmVySXRlbScsIFsgJ3R5cGVzJywgJ3N0YXR1cycsICdGbG93RGVzaWduZXIuUGF0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJHR5cGVzLCAkc3RhdHVzLCAkcGF0aCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgcmVxdWlyZTogJ15kZXNpZ25lcicsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAkcGF0aC50ZW1wbGF0ZXNCYXNlVXJsICsgJ2l0ZW0udG1wbC5odG1sJyxcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIGRhdGE6ICc9JyxcclxuICAgICAgICAgICAgICAgIG9mZnNldFg6ICc9JyxcclxuICAgICAgICAgICAgICAgIG9mZnNldFk6ICc9J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnaXRlbUN0cmwnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycywgZGVzaWduZXJDdHJsKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YS5TdGF0dXMgPSAkc3RhdHVzLm5vdHJ1bjtcclxuICAgICAgICAgICAgICAgICRzY29wZS5kZXNpZ25lciA9IGRlc2lnbmVyQ3RybDtcclxuICAgICAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgICAgICAvL0l0IG5lZWRzIGZvciBhbmd1bGFyLCByZW1vdmVzIHN2ZyB3cmFwcGVyXHJcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LmNoaWxkcmVuKCkpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2l0ZW1UaXRsZScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImZvbnQtbSBib3gtaGVhZGVyXCIgbmctdHJhbnNjbHVkZT48L2Rpdj4nLFxyXG4gICAgICAgICAgICB0cmFuc2NsdWRlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnaXRlbURlc2NyaXB0aW9uJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImZvbnQteHNcIiBuZy10cmFuc2NsdWRlPjwvZGl2PicsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pIiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDEwLzYvMjAxNC5cclxuICovXHJcbnZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIik7XHJcbnZhciBjdXJyZW50U2NyaXB0UGF0aCA9IHNjcmlwdHNbc2NyaXB0cy5sZW5ndGggLSAxXS5zcmM7XHJcbnZhciBmbG93RGVzaWduZXJSb290UGF0aCA9IGN1cnJlbnRTY3JpcHRQYXRoLnNwbGl0KFwianMvXCIpWzBdO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuc2VydmljZShcIkZsb3dEZXNpZ25lci5QYXRoU2VydmljZVwiLCBbIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHRlbXBsYXRlc0Jhc2VVcmw6IGZsb3dEZXNpZ25lclJvb3RQYXRoICsgXCJ0ZW1wbGF0ZXMvXCJcclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzUvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdTdmcuRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1dpZHRoJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdXaWR0aCwgZnVuY3Rpb24gKHdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ0hlaWdodCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nSGVpZ2h0LCBmdW5jdGlvbiAoaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWCcsIFsnJGNvbXBpbGUnLCBmdW5jdGlvbiAoJGNvbXBpbGUpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWCwgZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ4XCIsIHgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1knLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1ksIGZ1bmN0aW9uICh5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieVwiLCB5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdDeCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nQ3gsIGZ1bmN0aW9uIChjeCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImN4XCIsIGN4KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdDeScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nQ3ksIGZ1bmN0aW9uIChjeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImN5XCIsIGN5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYMScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWDEsIGZ1bmN0aW9uICh4MSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIngxXCIsIHgxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYMicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWDIsIGZ1bmN0aW9uICh4Mikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIngyXCIsIHgyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZMScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWTEsIGZ1bmN0aW9uICh5MSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInkxXCIsIHkxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZMicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWTIsIGZ1bmN0aW9uICh5Mikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInkyXCIsIHkyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnYXV0b1NpemUnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnQud2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogZWxlbWVudC5oZWlnaHQoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1ZpZXdib3gnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1ZpZXdib3gsIGZ1bmN0aW9uICh2aWV3Ym94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2aWV3Ym94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdmlld2JveC54ICsgXCIgXCIgKyB2aWV3Ym94LnkgKyBcIiBcIiArIHZpZXdib3gud2lkdGggKyBcIiBcIiArIHZpZXdib3guaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0uc2V0QXR0cmlidXRlKFwidmlld0JveFwiLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ3RleHRFbGxpcHNpcycsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWF4V2lkdGggPSBwYXJzZUZsb2F0KGF0dHJzLm1heFdpZHRoKTtcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS4kZXZhbChhdHRycy50ZXh0RWxsaXBzaXMpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LndpZHRoKCkgPiBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChlbGVtZW50LndpZHRoKCkgPiBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5sZW5ndGggLSAxKSArICcuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzE1LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnVG91Y2guRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCd0YXAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0aW1lU3RhbXA7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVTdGFtcCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGUgLSB0aW1lU3RhbXAgPD0gMjAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnRhcCwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZWRvd24nKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnVuYmluZCgnbW91c2V1cCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSkuZGlyZWN0aXZlKCdkb3VibGVUYXAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuaGFtbWVyKHtcclxuICAgICAgICAgICAgICAgICAgICB0YXBzOiAyXHJcbiAgICAgICAgICAgICAgICB9KS5iaW5kKCd0YXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZ2VzdHVyZS50YXBDb3VudCA9PT0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5kb3VibGVUYXAsIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmhhbW1lcigpLnVuYmluZCgndGFwJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KS5kaXJlY3RpdmUoJ3BhbicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5iaW5kKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5wYW5CZWdpbiwgeyAkZXZlbnQ6IGV2ZW50fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb3VzZU1vdmVIYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMucGFuLCB7ICRldmVudDogZXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkuYmluZCgnbW91c2Vtb3ZlJywgbW91c2VNb3ZlSGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb3VzZVVwSGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnBhblJlbGVhc2UsIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS51bmJpbmQoJ21vdXNlbW92ZScsIG1vdXNlTW92ZUhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnVuYmluZCgnbW91c2V1cCcsIG1vdXNlVXBIYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5iaW5kKCdtb3VzZXVwJywgbW91c2VVcEhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZWRvd24nKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==