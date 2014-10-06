/**
 * Created by gmeszaros on 10/6/2014.
 */
var scripts = document.getElementsByTagName("script");
var currentScriptPath = scripts[scripts.length - 1].src;
var rootPath = currentScriptPath.replace('js/resourcePathService.js', "");

angular.module('FlowDesigner')
    .service("pathService", [ function () {
        return{
            templatesBaseUrl: rootPath + "templates/"
        };
    }]);