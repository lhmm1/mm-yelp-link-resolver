"use strict";

// Note: This must be ran with PhantomJS flags:
//     --ssl-protocol=any 
//     --web-security=false

var webserver = require('webserver');
var server = webserver.create();
var page = require('webpage').create();
var fs = require('fs');

// Assumption: localhost port 8081
// SERVERNAME should not have any slashes at the beginning or end of it
var SERVERNAME = 'localhost:8081';

// Assumption: public directory is in current working directory
// DIRNAME should not have any slashes at the beginning or end of it
var DIRNAME = "public";

var enableCORS = true;

// TBD: Setting viewport size doesn't work reliably?
//var pageWidth = 1024;
//var pageHeight = 768;
//page.viewportSize = { width: pageWidth, height: pageHeight };

page.onConsoleMessage = function(msg) {
    console.log(msg);
}

function sendResponse(response, statusCode, data, headers, encoding) {
    response.statusCode = statusCode;
    if (encoding != undefined) {
        response.setEncoding(encoding);
    }
    if (headers == undefined) {
        headers = {};
    }
    if (enableCORS == true) {
        headers['Access-Control-Allow-Origin'] = 'https://compose.mixmax.com';
        headers['Access-Control-Allow-Credentials'] = true;
    }
    response.headers = headers;
    response.write(data);
    response.close();
}

function processFileRequest(request, response) {
    var requestURL = request.url;
    console.log("Got a request for: " + requestURL);
    var filename = fs.workingDirectory + requestURL;
    console.log('Getting file: ' + filename)
    try {      
        // Assumption: Only serving up jpegs at the moment
        var file = fs.open(filename, 'rb');
        var content = file.read();
        file.close();

        sendResponse(response, 200, content, {'Content-Type': 'image/jpeg'}, 'binary');
    } catch(e) {
        var responseBody = 'error:' + e;
        sendResponse(response, 400, responseBody ,undefined, undefined);
    }
}

function getYelpImage(request, response, getParams) {
    var requestURL = getParams['url'];
    var requestEmail = getParams['user'];

    console.log('Received: ' + requestEmail + ', URL: ' + requestURL);

    var httpRE = /^(http(s)?){1}/;
    // Add "http://" to the beginning of the URL if it isn't already there
    if (httpRE.test(requestURL) == false) {
        // Assumption: Force http for now
        requestURL = "http://" + requestURL;
    }

    console.log('Retrieving: ' + requestURL);
    page.open(requestURL, function(status) {
        if (status == "success") {
            var clip = page.evaluate(function() {
                return document.querySelector('div.top-shelf').getBoundingClientRect();
            });

            // Clip the top-shelf portion
            page.clipRect = {
                top:    clip.top,
                left:   clip.left,
                width:  clip.width,
                height: clip.height
            };
            // Create screenshot name from last value of url split
            var urlSplit = page.url.split('/');
            var baseScreenShotName = urlSplit[urlSplit.length-1].split('?')[0];

            var screenshotName = DIRNAME + '/' + 'yelp_' + baseScreenShotName + '.jpg';
            console.log('Saving: ' + screenshotName);
            page.render(screenshotName, {format: 'jpeg', quality: '90'});

            var imageURL = 'http://' + SERVERNAME + '/' + screenshotName;

            // TBD: Clip the width to a certain size?
            //var width = clip.width > 512? 512 : clip.width;
            //var responseHTML = '<a href="' + page.url + '"><img src="' + imageURL + '" width="' + width + '"></a>';
            
            var responseHTML = '<a href="' + page.url + '"><img style="max-width:100%;max-height:100%" src="' + imageURL + '"></a>';
            var responseJSON = {body: responseHTML};
            sendResponse(response, 200, JSON.stringify(responseJSON), {'Content-Type': 'application/json'}, undefined, undefined);
        } else {
            var htmlResponse = '<html><body><h1>Error while processing request, please try again later.</h1></body></html>';
            sendResponse(response, 500, htmlResponse, undefined, undefined, undefined);
        }
    });
}

function parseGetParameters(request) {
    try {
        var qLoc = request.url.indexOf('?')
        if (qLoc == -1) {
            console.log('No GET parameters');
            return {};
        }
        var rawParams = request.url.substr(qLoc+1);     
        var getParams = {};
        console.log('Raw Params:' + rawParams);
        rawParams.split('&').forEach(function(part){
            var equals = part.indexOf('=');
            var key = part.substr(0, equals);
            var value = part.substr(equals+1);
            getParams[key] = decodeURIComponent(value);
        });
        return getParams;
    } catch (e) {
        console.log("Whoops! Error while trying to parse get parameters:" + e);
        return {};
    }
}

var service = server.listen(8081,function(request, response) {
    if (request.method == 'GET') {
        // Parse the URL GET parameters
        console.log('Parsing get parameters...')
        var getParams = parseGetParameters(request);
        console.log('getParams:' + JSON.stringify(getParams));
        if (getParams['url'] != undefined) {
            getYelpImage(request, response, getParams);
        } else {
            processFileRequest(request, response);
        }
    } else {
        var responseBody = 'Unsupported method: ' + request.method;
        sendResponse(response, 400, responseBody, undefined, undefined);
    }
});
