/**
 * Created by gmeszaros on 10/6/2014.
 */
angular.module('FlowDesigner')
    .service("pathService", [ function () {
        var _templateBaseUrl = "src/templates/";
        return{
            templatesBaseUrl: _templateBaseUrl,
            setPath: function (options) {
                _templateBaseUrl = options.templatesBaseUrl;
            }
        };
    }]);