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
        return {
            restrict: "AE",
            transclude: false,
            replace: true,
            templateUrl: $path.templatesBaseUrl + 'designer.tmpl.html',
            scope: {
                autoSize: '=',
                items: '=',
                selectedChanged: '&',
                sizeChanged: '='
            },
            controller: 'designerCtrl',
            link: function ($scope, element, attrs) {
                var setSize = function () {
                    $scope.size = {
                        width: element.width(),
                        height: element.height()
                    };
                };
                var setOffset = function () {
                    $scope.offset = {
                        x: element.offset().left,
                        y: element.offset().top
                    };
                };
                setSize();
                setOffset();
                var resizer = new ResizeSensor($(element).parent().parent(), function () {
                    setSize();
                    setOffset();
                });
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
            template: '<div class="font-l box-header" ng-transclude></div>',
            transclude: true,
            link: function ($scope, element, attrs) {
            }
        };
    }])
    .directive('itemDescription', [function () {
        return{
            restrict: "AE",
            replace: true,
            template: '<div class="font-m" ng-transclude></div>',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlc2lnbmVyRGlyZWN0aXZlLmpzIiwiY29tbW9uRGlyZWN0aXZlLmpzIiwiY29ubmVjdG9yQ3RybC5qcyIsImNvbm5lY3RvckRpcmVjdGl2ZS5qcyIsImRlc2lnbmVyQ3RybC5qcyIsIml0ZW1EaXJlY3RpdmUuanMiLCJyZXNvdXJjZVBhdGhTZXJ2aWNlLmpzIiwic3ZnRGlyZWN0aXZlLmpzIiwidG91Y2hEaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZmxvd0Rlc2lnbmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDgvNS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicsIFsnU3ZnLkRpcmVjdGl2ZScsICdUb3VjaC5EaXJlY3RpdmUnLCAnQ29tbW9uLkRpcmVjdGl2ZSddKVxyXG4gICAgLmNvbnN0YW50KFwidHlwZXNcIiwge1xyXG4gICAgICAgIHRleHQ6ICdUZXh0JyxcclxuICAgICAgICBib29sOiAnQm9vbCcsXHJcbiAgICAgICAgbnVtYmVyOiAnTnVtYmVyJ1xyXG4gICAgfSlcclxuICAgIC5jb25zdGFudChcInN0YXR1c1wiLCB7XHJcbiAgICAgICAgbm90cnVuOiAnbm90cnVuJyxcclxuICAgICAgICBydW5uaW5nOiAncnVubmluZycsXHJcbiAgICAgICAgZmFpbGVkOiAnZmFpbGVkJyxcclxuICAgICAgICBzdWNjZWVkZWQ6ICdzdWNjZWVkZWQnXHJcbiAgICB9KVxyXG4gICAgLmNvbnN0YW50KFwiZGlyZWN0aW9uXCIsIHtcclxuICAgICAgICBpbnB1dDogJ2lucHV0JyxcclxuICAgICAgICBvdXRwdXQ6ICdvdXRwdXQnXHJcbiAgICB9KVxyXG4gICAgLmRpcmVjdGl2ZSgnZGVzaWduZXInLCBbXCIkdGltZW91dFwiLCBcIkZsb3dEZXNpZ25lci5QYXRoU2VydmljZVwiLCBmdW5jdGlvbiAoJHRpbWVvdXQsICRwYXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQUVcIixcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogZmFsc2UsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAkcGF0aC50ZW1wbGF0ZXNCYXNlVXJsICsgJ2Rlc2lnbmVyLnRtcGwuaHRtbCcsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBhdXRvU2l6ZTogJz0nLFxyXG4gICAgICAgICAgICAgICAgaXRlbXM6ICc9JyxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkQ2hhbmdlZDogJyYnLFxyXG4gICAgICAgICAgICAgICAgc2l6ZUNoYW5nZWQ6ICc9J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZGVzaWduZXJDdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZXRTaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogZWxlbWVudC53aWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGVsZW1lbnQuaGVpZ2h0KClcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHZhciBzZXRPZmZzZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm9mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogZWxlbWVudC5vZmZzZXQoKS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBlbGVtZW50Lm9mZnNldCgpLnRvcFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc2V0U2l6ZSgpO1xyXG4gICAgICAgICAgICAgICAgc2V0T2Zmc2V0KCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmVzaXplciA9IG5ldyBSZXNpemVTZW5zb3IoJChlbGVtZW50KS5wYXJlbnQoKS5wYXJlbnQoKSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFNpemUoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZXRPZmZzZXQoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBNQ0cgb24gMjAxNC4wOS4wOS4uXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnQ29tbW9uLkRpcmVjdGl2ZScsIFtdKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdNb3VzZXdoZWVsJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6ICc/bmdNb2RlbCcsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQubW91c2V3aGVlbChmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLm5nTW91c2V3aGVlbCwge2V2ZW50OiBldmVudH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA5LzkvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdGbG93RGVzaWduZXInKVxyXG4gICAgLmNvbnRyb2xsZXIoXCJjb25uZWN0b3JDdHJsXCIsIFsnJHNjb3BlJywgJ3R5cGVzJywgJ2RpcmVjdGlvbicsIGZ1bmN0aW9uICgkc2NvcGUsICR0eXBlcywgJGRpcmVjdGlvbikge1xyXG4gICAgICAgICRzY29wZS4kZGlyZWN0aW9uID0gJGRpcmVjdGlvbjtcclxuICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5oYXNSZWZlcmVuY2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnByb3BlcnR5LlJlZmVyZW5jZSAhPT0gbnVsbDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlcyAhPT0gbnVsbCAmJiAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlcy5sZW5ndGggIT09IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5zZXRTdHlsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0cmluZzogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5VmFsdWVUeXBlID09PSAkdHlwZXMuc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgYm9vbDogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5VmFsdWVUeXBlID09PSAkdHlwZXMuYm9vbCxcclxuICAgICAgICAgICAgICAgIG51bWJlcjogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5VmFsdWVUeXBlID09PSAkdHlwZXMubnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgJ25vLXZhbHVlJzogISRzY29wZS5oYXNSZWZlcmVuY2UoKSAmJiAoISRzY29wZS5wcm9wZXJ0eS5WYWx1ZSB8fCAkc2NvcGUucHJvcGVydHkuVmFsdWUgPT09IFwiXCIpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLnNlbGVjdFJlZmVyZW5jZSA9IGZ1bmN0aW9uIChyZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUmVmZXJlbmNlID0gcmVmZXJlbmNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vcmVnaW9uIERyYWdnaW5nIG5ldyByZWZlcmVuY2VcclxuXHJcbiAgICAgICAgJHNjb3BlLmRyYWcgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHNldE5ld1JlZmVyZW5jZVBvc2l0aW9uKCRldmVudC5jbGllbnRYLCAkZXZlbnQuY2xpZW50WSk7XHJcbiAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5kcmFnU3RhcnQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHNldE5ld1JlZmVyZW5jZVBvc2l0aW9uKCRldmVudC5jbGllbnRYLCAkZXZlbnQuY2xpZW50WSk7XHJcbiAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5kcmFnRW5kID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgaXRlbUlkID0gJCgkZXZlbnQudGFyZ2V0KVswXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS1pZCcpO1xyXG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gJCgkZXZlbnQudGFyZ2V0KVswXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcHJvcGVydHktbmFtZScpO1xyXG4gICAgICAgICAgICBpZiAoIWl0ZW1JZCB8fCAhcHJvcGVydHlOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3UmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgcmVmSXRlbSA9ICRzY29wZS5kZXNpZ25lci5nZXRJdGVtKGl0ZW1JZCk7XHJcbiAgICAgICAgICAgIHZhciByZWZQcm9wID0gJHNjb3BlLmRlc2lnbmVyLmdldFByb3BlcnR5KHJlZkl0ZW0sIHByb3BlcnR5TmFtZSk7XHJcbiAgICAgICAgICAgIGlmKHJlZlByb3AuRGlyZWN0aW9uID09PSAkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uIHx8IGl0ZW1JZCA9PT0gJHNjb3BlLml0ZW1EYXRhLklkKXtcclxuICAgICAgICAgICAgICAgICRzY29wZS5uZXdSZWZlcmVuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFkZFJlZmVyZW5jZXMoJHNjb3BlLnByb3BlcnR5LCByZWZQcm9wLCByZWZJdGVtKTtcclxuICAgICAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBEcmFnZ2luZyBuZXcgcmVmZXJlbmNlXHJcblxyXG4gICAgICAgIC8vcmVnaW9uIFByaXZhdGUgZnVuY3Rpb25zXHJcblxyXG4gICAgICAgIHZhciBhZGRSZWZlcmVuY2VzID0gZnVuY3Rpb24gKHNvdXJjZVByb3BlcnR5LCB0YXJnZXRQcm9wZXJ0eSwgdGFyZ2V0SXRlbSkge1xyXG4gICAgICAgICAgICBpZiAoc291cmNlUHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0KSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VQcm9wZXJ0eS5SZWZlcmVuY2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgVGFza0lkOiB0YXJnZXRJdGVtLklkLFxyXG4gICAgICAgICAgICAgICAgICAgIFJlZmVyZW5jZWRQcm9wZXJ0eTogdGFyZ2V0UHJvcGVydHkuUHJvcGVydHlOYW1lXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0UHJvcGVydHkuUmVmZXJlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBUYXNrSWQ6ICRzY29wZS5pdGVtRGF0YS5JZCxcclxuICAgICAgICAgICAgICAgICAgICBSZWZlcmVuY2VkUHJvcGVydHk6ICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eU5hbWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0UHJvcGVydHkuUmVmZXJlbmNlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIFRhc2tJZDogJHNjb3BlLml0ZW1EYXRhLklkLFxyXG4gICAgICAgICAgICAgICAgICAgIFJlZmVyZW5jZWRQcm9wZXJ0eTogJHNjb3BlLnByb3BlcnR5LlByb3BlcnR5TmFtZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5LlJlZmVyZW5jZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgVGFza0lkOiB0YXJnZXRJdGVtLklkLFxyXG4gICAgICAgICAgICAgICAgICAgIFJlZmVyZW5jZWRQcm9wZXJ0eTogdGFyZ2V0UHJvcGVydHkuUHJvcGVydHlOYW1lXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIHNldE5ld1JlZmVyZW5jZVBvc2l0aW9uID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm5ld1JlZmVyZW5jZSA9IHtcclxuICAgICAgICAgICAgICAgIHg6ICh4IC0gJHNjb3BlLmRlc2lnbmVyLmdldE9mZnNldCgpLngpICogKDEgLyAkc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS54KSArICRzY29wZS5kZXNpZ25lci5nZXRWaWV3Qm94KCkueCAtIDEsXHJcbiAgICAgICAgICAgICAgICB5OiAoeSAtICRzY29wZS5kZXNpZ25lci5nZXRPZmZzZXQoKS55KSAqICgxIC8gJHNjb3BlLmRlc2lnbmVyLmdldFNjYWxlKCkueSkgKyAkc2NvcGUuZGVzaWduZXIuZ2V0Vmlld0JveCgpLnkgLSAxXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9lbmRyZWdpb24gUHJpdmF0ZSBmdW5jdGlvbnNcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL0Rpc3Bvc2luZ1xyXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIH0pO1xyXG4gICAgfV0pXHJcbjsiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOS85LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJylcclxuICAgIC5kaXJlY3RpdmUoJ2Nvbm5lY3RvcicsIFsndHlwZXMnLCAnZGlyZWN0aW9uJywgJ0Zsb3dEZXNpZ25lci5QYXRoU2VydmljZScsIGZ1bmN0aW9uICgkdHlwZXMsICRkaXJlY3Rpb24sICRwYXRoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJBRVwiLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICByZXF1aXJlOiAnXmRlc2lnbmVyJyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICRwYXRoLnRlbXBsYXRlc0Jhc2VVcmwgKyAnY29ubmVjdG9yLnRtcGwuaHRtbCcsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb25uZWN0b3JDdHJsJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIGl0ZW1EYXRhOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogJz0nLFxyXG4gICAgICAgICAgICAgICAgaW5kZXg6ICc9JyxcclxuICAgICAgICAgICAgICAgIG9mZnNldDogJz0nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBkZXNpZ25lckN0cmwpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5kZXNpZ25lciA9IGRlc2lnbmVyQ3RybDtcclxuXHJcbiAgICAgICAgICAgICAgICAvL3JlZ2lvbiBBZGQgZnVuY3Rpb25zIHRvIHByb3BlcnR5IG9iamVjdFxyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9wZXJ0eS5jYWxjdWxhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSAkc2NvcGUucHJvcGVydHkuRGlyZWN0aW9uID09PSAkZGlyZWN0aW9uLmlucHV0ID8gJHNjb3BlLml0ZW1EYXRhLklucHV0UHJvcGVydGllcyA6ICRzY29wZS5pdGVtRGF0YS5PdXRwdXRQcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogJHNjb3BlLnByb3BlcnR5LkRpcmVjdGlvbiA9PT0gJGRpcmVjdGlvbi5pbnB1dCA/ICRzY29wZS5pdGVtRGF0YS5Qb3NpdGlvbi5YIDogJHNjb3BlLml0ZW1EYXRhLlBvc2l0aW9uLlggKyAyNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6ICRzY29wZS5pdGVtRGF0YS5Qb3NpdGlvbi5ZICsgJHNjb3BlLm9mZnNldCArICgoMTcwIC0gJHNjb3BlLm9mZnNldCkgLyAocHJvcHMubGVuZ3RoICsgMSkpICogKCRzY29wZS5pbmRleCArIDEpXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHkucmVtb3ZlUmVmZXJlbmNlID0gZnVuY3Rpb24gKGl0ZW1JZCwgcmVmZXJlbmNlZFByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZkl0ZW0gPSAkc2NvcGUuZGVzaWduZXIuZ2V0SXRlbShpdGVtSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZQcm9wID0gJHNjb3BlLmRlc2lnbmVyLmdldFByb3BlcnR5KHJlZkl0ZW0sIHJlZmVyZW5jZWRQcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5EaXJlY3Rpb24gPT09ICRkaXJlY3Rpb24uaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2UgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucHJvcGVydHkuUmVmZXJlbmNlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5xKCRzY29wZS5wcm9wZXJ0eS5SZWZlcmVuY2VzKS5yZW1vdmUoZnVuY3Rpb24gKHJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlZi5UYXNrSWQgPT09IGl0ZW1JZCAmJiByZWYuUmVmZXJlbmNlZFByb3BlcnR5ID09PSByZWZlcmVuY2VkUHJvcGVydHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZWZQcm9wLnJlbW92ZVJlZmVyZW5jZSgkc2NvcGUuaXRlbURhdGEuSWQsICRzY29wZS5wcm9wZXJ0eS5Qcm9wZXJ0eU5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL2VuZHJlZ2lvbiBBZGQgZnVuY3Rpb25zIHRvIHByb3BlcnR5IG9iamVjdFxyXG5cclxuICAgICAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgICAgICAvL0l0IG5lZWRzIGZvciBhbmd1bGFyLCByZW1vdmVzIHN2ZyB3cmFwcGVyXHJcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LmNoaWxkcmVuKCkpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSk7IiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDkvOS8yMDE0LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuY29udHJvbGxlcihcImRlc2lnbmVyQ3RybFwiLCBbJyRzY29wZScsICdkaXJlY3Rpb24nLCBmdW5jdGlvbiAoJHNjb3BlLCAkZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAkc2NvcGUuc2l6ZSA9IHtcclxuICAgICAgICAgICAgd2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnNjYWxlID0ge1xyXG4gICAgICAgICAgICB4OiAxLFxyXG4gICAgICAgICAgICB5OiAxXHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUudmlld0JveCA9IHtcclxuICAgICAgICAgICAgeDogMCxcclxuICAgICAgICAgICAgeTogMCxcclxuICAgICAgICAgICAgd2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLm1vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvL3JlZ2lvbiBDb250cm9sbGVyIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgICB0aGlzLmdldFNjYWxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNjYWxlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0T2Zmc2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyB4OiAkc2NvcGUub2Zmc2V0LngsIHk6ICRzY29wZS5vZmZzZXQueX07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRWaWV3Qm94ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnZpZXdCb3g7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRJdGVtID0gZnVuY3Rpb24gKGl0ZW1JZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbGlucSgkc2NvcGUuaXRlbXMpLmZpcnN0KGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5JZCA9PT0gaXRlbUlkO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldFByb3BlcnR5ID0gZnVuY3Rpb24gKGl0ZW0sIHByb3BlcnR5TmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgcHJvcCA9IGxpbnEoaXRlbS5JbnB1dFByb3BlcnRpZXMpLmZpcnN0T3JEZWZhdWx0KGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5LlByb3BlcnR5TmFtZSA9PT0gcHJvcGVydHlOYW1lO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKHByb3ApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbGlucShpdGVtLk91dHB1dFByb3BlcnRpZXMpLmZpcnN0T3JEZWZhdWx0KGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5LlByb3BlcnR5TmFtZSA9PT0gcHJvcGVydHlOYW1lO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldFJlZmVyZW5jZWRQcm9wZXJ0eSA9IGZ1bmN0aW9uIChyZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgdmFyIGl0ZW0gPSBzZWxmLmdldEl0ZW0ocmVmZXJlbmNlLlRhc2tJZCk7XHJcbiAgICAgICAgICAgIHZhciBwcm9wID0gc2VsZi5nZXRQcm9wZXJ0eShpdGVtLCByZWZlcmVuY2UuUmVmZXJlbmNlZFByb3BlcnR5KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIENvbnRyb2xsZXIgZnVuY3Rpb25zXHJcblxyXG4gICAgICAgIC8vcmVnaW9uIERlc2lnbmVyIGl0ZW0gaGFuZGxpbmdcclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RJdGVtID0gZnVuY3Rpb24gKHNlbGVjdGVkSXRlbSkge1xyXG4gICAgICAgICAgICBsaW5xKCRzY29wZS5pdGVtcykuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zZWxlY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ2hhbmdlZCh7aXRlbTogc2VsZWN0ZWRJdGVtfSk7XHJcblxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMucmVtb3ZlSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgIGxpbnEoaXRlbS5JbnB1dFByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcm9wLlJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3AucmVtb3ZlUmVmZXJlbmNlKHByb3AuUmVmZXJlbmNlLlRhc2tJZCwgcHJvcC5SZWZlcmVuY2UuUmVmZXJlbmNlZFByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsaW5xKGl0ZW0uT3V0cHV0UHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xyXG4gICAgICAgICAgICAgICAgbGlucShwcm9wLlJlZmVyZW5jZXMpLmZvckVhY2goZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3AucmVtb3ZlUmVmZXJlbmNlKHJlZmVyZW5jZS5UYXNrSWQsIHJlZmVyZW5jZS5SZWZlcmVuY2VkUHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgbGlucSgkc2NvcGUuaXRlbXMpLnJlbW92ZShpdGVtKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBEZXNpZ25lciBpdGVtIGhhbmRsaW5nXHJcblxyXG4gICAgICAgIC8vcmVnaW9uIFpvb21pbmdcclxuXHJcbiAgICAgICAgJHNjb3BlLm9uTW91c2VXaGVlbCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgc3RlcCA9IDAuMTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldmVudC5kZWx0YVkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnNjYWxlLnggLSBzdGVwIDw9IDAgfHwgJHNjb3BlLnNjYWxlLnkgLSBzdGVwIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueCAtPSBzdGVwO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNjYWxlLnkgLT0gc3RlcDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZXZlbnQuZGVsdGFZID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2NhbGUueCArPSBzdGVwO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNjYWxlLnkgKz0gc3RlcDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIF91cGRhdGVWaWV3Qm94U2l6ZSgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnZpZXdCb3gud2lkdGggPSAkc2NvcGUuc2l6ZS53aWR0aCAvICRzY29wZS5zY2FsZS54O1xyXG4gICAgICAgICAgICAkc2NvcGUudmlld0JveC5oZWlnaHQgPSAkc2NvcGUuc2l6ZS5oZWlnaHQgLyAkc2NvcGUuc2NhbGUueTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBzaXplV2F0Y2hlciA9ICRzY29wZS4kd2F0Y2goJ3NpemUnLCBfdXBkYXRlVmlld0JveFNpemUsIHRydWUpO1xyXG4gICAgICAgIHZhciBzY2FsZVdhdGNoZXIgPSAkc2NvcGUuJHdhdGNoKCdzY2FsZScsIF91cGRhdGVWaWV3Qm94U2l6ZSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIC8vZW5kcmVnaW9uIFpvb21pbmdcclxuXHJcbiAgICAgICAgLy8gcmVnaW9uIFZpZXdib3ggbW92aW5nXHJcblxyXG4gICAgICAgIHZhciBtb3ZlWCwgbW92ZVkgPSAwO1xyXG4gICAgICAgICRzY29wZS5tb3ZlU3RhcnQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgIG1vdmVYID0gJGV2ZW50LmNsaWVudFg7XHJcbiAgICAgICAgICAgIG1vdmVZID0gJGV2ZW50LmNsaWVudFk7XHJcbiAgICAgICAgICAgICRzY29wZS5tb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5tb3ZlID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgeCA9ICRldmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICB2YXIgeSA9ICRldmVudC5jbGllbnRZO1xyXG4gICAgICAgICAgICAkc2NvcGUudmlld0JveC54IC09ICh4IC0gbW92ZVgpICogKDEgLyAkc2NvcGUuc2NhbGUueCk7XHJcbiAgICAgICAgICAgICRzY29wZS52aWV3Qm94LnkgLT0gKHkgLSBtb3ZlWSkgKiAoMSAvICRzY29wZS5zY2FsZS55KTtcclxuICAgICAgICAgICAgbW92ZVggPSB4O1xyXG4gICAgICAgICAgICBtb3ZlWSA9IHk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLm1vdmVFbmQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgICRzY29wZS5tb3ZpbmcgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL2VuZHJlZ2lvbiBWaWV3Ym94IG1vdmluZ1xyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNpemVXYXRjaGVyKCk7XHJcbiAgICAgICAgICAgIHNjYWxlV2F0Y2hlcigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfV0pXHJcbjsiLCIvKipcclxuICogQ3JlYXRlZCBieSBnbWVzemFyb3Mgb24gOS85LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnRmxvd0Rlc2lnbmVyJylcclxuICAgIC5jb250cm9sbGVyKFwiaXRlbUN0cmxcIiwgWyckc2NvcGUnLCAndHlwZXMnLCAnc3RhdHVzJywgZnVuY3Rpb24gKCRzY29wZSwgJHR5cGVzLCAkc3RhdHVzKSB7XHJcbiAgICAgICAgJHNjb3BlLiRzdGF0dXMgPSAkc3RhdHVzO1xyXG4gICAgICAgICRzY29wZS4kdHlwZXMgPSAkdHlwZXM7XHJcbiAgICAgICAgJHNjb3BlLndpZHRoID0gMjUwO1xyXG4gICAgICAgICRzY29wZS5oZWlnaHQgPSAxNzA7XHJcbiAgICAgICAgJHNjb3BlLmRyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgdmFyIGRyYWdYLCBkcmFnWSA9IDA7XHJcbiAgICAgICAgJHNjb3BlLmRyYWdTdGFydCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgZHJhZ1ggPSAkZXZlbnQuY2xpZW50WDtcclxuICAgICAgICAgICAgZHJhZ1kgPSAkZXZlbnQuY2xpZW50WTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmRyYWcgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgICRzY29wZS5kcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgIHZhciB4ID0gJGV2ZW50LmNsaWVudFg7XHJcbiAgICAgICAgICAgIHZhciB5ID0gJGV2ZW50LmNsaWVudFk7XHJcbiAgICAgICAgICAgICRzY29wZS5kYXRhLlBvc2l0aW9uLlggKz0gKHggLSBkcmFnWCkgKiAoMSAvICRzY29wZS5kZXNpZ25lci5nZXRTY2FsZSgpLngpO1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YS5Qb3NpdGlvbi5ZICs9ICh5IC0gZHJhZ1kpICogKDEgLyAkc2NvcGUuZGVzaWduZXIuZ2V0U2NhbGUoKS55KTtcclxuICAgICAgICAgICAgZHJhZ1ggPSB4O1xyXG4gICAgICAgICAgICBkcmFnWSA9IHk7XHJcbiAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5kcmFnRW5kID0gZnVuY3Rpb24gKCRldmVudCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUub25JdGVtQ2xpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5kZXNpZ25lci5zZWxlY3RJdGVtKCRzY29wZS5kYXRhKTtcclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCdkZXNpZ25lckl0ZW0nLCBbICd0eXBlcycsICdzdGF0dXMnLCAnRmxvd0Rlc2lnbmVyLlBhdGhTZXJ2aWNlJywgZnVuY3Rpb24gKCR0eXBlcywgJHN0YXR1cywgJHBhdGgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFFXCIsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6ICdeZGVzaWduZXInLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJHBhdGgudGVtcGxhdGVzQmFzZVVybCArICdpdGVtLnRtcGwuaHRtbCcsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiAnPScsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXRYOiAnPScsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXRZOiAnPSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2l0ZW1DdHJsJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMsIGRlc2lnbmVyQ3RybCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGEuU3RhdHVzID0gJHN0YXR1cy5ub3RydW47XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGVzaWduZXIgPSBkZXNpZ25lckN0cmw7XHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9JdCBuZWVkcyBmb3IgYW5ndWxhciwgcmVtb3ZlcyBzdmcgd3JhcHBlclxyXG4gICAgICAgICAgICAgICAgdmFyIGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudC5jaGlsZHJlbigpKTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVwbGFjZVdpdGgoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCdpdGVtVGl0bGUnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJmb250LWwgYm94LWhlYWRlclwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+JyxcclxuICAgICAgICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ2l0ZW1EZXNjcmlwdGlvbicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogXCJBRVwiLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJmb250LW1cIiBuZy10cmFuc2NsdWRlPjwvZGl2PicsXHJcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pIiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgZ21lc3phcm9zIG9uIDEwLzYvMjAxNC5cclxuICovXHJcbnZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIik7XHJcbnZhciBjdXJyZW50U2NyaXB0UGF0aCA9IHNjcmlwdHNbc2NyaXB0cy5sZW5ndGggLSAxXS5zcmM7XHJcbnZhciBmbG93RGVzaWduZXJSb290UGF0aCA9IGN1cnJlbnRTY3JpcHRQYXRoLnNwbGl0KFwianMvXCIpWzBdO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ0Zsb3dEZXNpZ25lcicpXHJcbiAgICAuc2VydmljZShcIkZsb3dEZXNpZ25lci5QYXRoU2VydmljZVwiLCBbIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHRlbXBsYXRlc0Jhc2VVcmw6IGZsb3dEZXNpZ25lclJvb3RQYXRoICsgXCJ0ZW1wbGF0ZXMvXCJcclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzUvMjAxNC5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdTdmcuRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1dpZHRoJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdXaWR0aCwgZnVuY3Rpb24gKHdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ0hlaWdodCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nSGVpZ2h0LCBmdW5jdGlvbiAoaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ25nWCcsIFsnJGNvbXBpbGUnLCBmdW5jdGlvbiAoJGNvbXBpbGUpIHtcclxuICAgICAgICByZXR1cm57XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWCwgZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoXCJ4XCIsIHgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1knLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1ksIGZ1bmN0aW9uICh5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKFwieVwiLCB5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdDeCcsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nQ3gsIGZ1bmN0aW9uIChjeCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImN4XCIsIGN4KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdDeScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nQ3ksIGZ1bmN0aW9uIChjeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcImN5XCIsIGN5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYMScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWDEsIGZ1bmN0aW9uICh4MSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIngxXCIsIHgxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdYMicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWDIsIGZ1bmN0aW9uICh4Mikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcIngyXCIsIHgyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZMScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWTEsIGZ1bmN0aW9uICh5MSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInkxXCIsIHkxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnbmdZMicsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nWTIsIGZ1bmN0aW9uICh5Mikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihcInkyXCIsIHkyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnYXV0b1NpemUnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zaXplID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnQud2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogZWxlbWVudC5oZWlnaHQoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pXHJcbiAgICAuZGlyZWN0aXZlKCduZ1ZpZXdib3gnLCBbZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybntcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1ZpZXdib3gsIGZ1bmN0aW9uICh2aWV3Ym94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2aWV3Ym94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdmlld2JveC54ICsgXCIgXCIgKyB2aWV3Ym94LnkgKyBcIiBcIiArIHZpZXdib3gud2lkdGggKyBcIiBcIiArIHZpZXdib3guaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0uc2V0QXR0cmlidXRlKFwidmlld0JveFwiLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XSlcclxuICAgIC5kaXJlY3RpdmUoJ3RleHRFbGxpcHNpcycsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJue1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWF4V2lkdGggPSBwYXJzZUZsb2F0KGF0dHJzLm1heFdpZHRoKTtcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS4kZXZhbChhdHRycy50ZXh0RWxsaXBzaXMpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LndpZHRoKCkgPiBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChlbGVtZW50LndpZHRoKCkgPiBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5sZW5ndGggLSAxKSArICcuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV0pOyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IGdtZXN6YXJvcyBvbiA4LzE1LzIwMTQuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnVG91Y2guRGlyZWN0aXZlJywgW10pXHJcbiAgICAuZGlyZWN0aXZlKCd0YXAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0aW1lU3RhbXA7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVTdGFtcCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGUgLSB0aW1lU3RhbXAgPD0gMjAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnRhcCwgeyAkZXZlbnQ6IGV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZWRvd24nKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnVuYmluZCgnbW91c2V1cCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSkuZGlyZWN0aXZlKCdkb3VibGVUYXAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuaGFtbWVyKHtcclxuICAgICAgICAgICAgICAgICAgICB0YXBzOiAyXHJcbiAgICAgICAgICAgICAgICB9KS5iaW5kKCd0YXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZ2VzdHVyZS50YXBDb3VudCA9PT0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5kb3VibGVUYXAsIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgICAgIC8vRGlzcG9zaW5nXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmhhbW1lcigpLnVuYmluZCgndGFwJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KS5kaXJlY3RpdmUoJ3BhbicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5iaW5kKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbChhdHRycy5wYW5CZWdpbiwgeyAkZXZlbnQ6IGV2ZW50fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb3VzZU1vdmVIYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGV2YWwoYXR0cnMucGFuLCB7ICRldmVudDogZXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkuYmluZCgnbW91c2Vtb3ZlJywgbW91c2VNb3ZlSGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb3VzZVVwSGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsKGF0dHJzLnBhblJlbGVhc2UsIHsgJGV2ZW50OiBldmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS51bmJpbmQoJ21vdXNlbW92ZScsIG1vdXNlTW92ZUhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnVuYmluZCgnbW91c2V1cCcsIG1vdXNlVXBIYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5iaW5kKCdtb3VzZXVwJywgbW91c2VVcEhhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAgICAgLy9EaXNwb3NpbmdcclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudW5iaW5kKCdtb3VzZWRvd24nKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==