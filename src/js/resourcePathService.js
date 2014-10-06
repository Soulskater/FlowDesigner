/**
 * Created by gmeszaros on 10/6/2014.
 */
var scripts = document.getElementsByTagName("script");
var currentScriptPath = scripts[scripts.length - 1].src;
var rootPath = currentScriptPath.split("js/")[0];

angular.module('FlowDesigner')
    .service("pathService", [ function () {
        return{
            templatesBaseUrl: rootPath + "templates/"
        };
    }]);