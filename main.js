var accessToken = 'pk.eyJ1Ijoic2ViaWFuY29kZXIiLCJhIjoiY2pzanFzZTVmMHh3NTQ1bHB0N2c3MXV4bCJ9.8UIykQeOfgk9gtIo679N2w';

var routeBeingEdited = false;
var pendingStopCoords = [];
var busRoutes = {};
var busStops = {};

function cancelLoad() {

    $("#warningModal").modal("hide");
    $("#confirmWarning").off();

}

var map = L.map('map').setView([39.9526, -75.1652], 13);

var streetMap = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a             >',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: accessToken,
}).addTo(map);

var satelliteMap = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a             >',
    maxZoom: 18,
    id: 'mapbox.satellite',
    accessToken: accessToken,
});

var baseMaps = {
    "Street": streetMap,
    "Satellite": satelliteMap
};

L.control.layers(baseMaps).addTo(map);

var stopCircleFeatureGroup = L.featureGroup().addTo(map);

map.on("click", function(e) {

    if (routeBeingEdited) {

        busStop = {
            stopCoords: e.latlng,
            stopName: e.latlng.toString(),
            routes: [],
            circle: L.circle(e.latlng, {
                color: '#000000',
                fillColor: '#ffffff',
                fillOpacity: 1,
                radius: 10,
            }).addTo(stopCircleFeatureGroup)
        };

        busStops[busStop.stopName] = busStop;
        pendingStopCoords.push(busStop.stopName);

    }

});

stopCircleFeatureGroup.on("click", function(stopClicked) {

    if (routeBeingEdited) {

        L.DomEvent.stop(stopClicked);
        pendingStopCoords.push(stopClicked.layer.getLatLng().toString());
        busStops[stopClicked.layer.getLatLng().toString()].circle.setStyle({
            fillColor: "#000000"
        });

    } else {

        var busStopClicked = busStops[stopClicked.layer.getLatLng().toString()];

        var popupContent = document.createElement("div");
        popupContent.setAttribute("style", "text-align: center");

        var popupContentHeading = document.createElement('h5');
        popupContentHeading.id = busStopClicked.stopName + 'H';
        popupContentHeading.setAttribute("contentEditable", "true");
        popupContentHeading.innerHTML = busStopClicked.stopName;

        popupContent.appendChild(popupContentHeading);

        for (var i = 0; i < busStopClicked.routes.length; i++) {

            var route = busRoutes[busStopClicked.routes[i]];

            var routeBlock = document.createElement('div');
            routeBlock.setAttribute("style", "height: 20px; background-color: " + route.color + ";");
            var routeBlockText = document.createElement('p');
            routeBlockText.setAttribute("style", "text-align: center; margin: 0");
            routeBlockText.innerHTML = route.name;
            routeBlock.appendChild(routeBlockText);

            popupContent.appendChild(routeBlock);

        }

        var deleteStopButton = document.createElement("button");
        deleteStopButton.id = "deleteStopButton";
        deleteStopButton.setAttribute("class", "btn btn-danger");
        deleteStopButton.setAttribute("style", "text-align: center; margin-top: 10px");
        deleteStopButton.innerHTML = "Delete Stop";

        popupContent.appendChild(deleteStopButton);

        var stopPopup = L.popup().setLatLng(stopClicked.layer.getLatLng()).setContent(popupContent).openOn(map);

        $("#deleteStopButton").click(function() {

            busStopClicked.circle.remove();

            for (var i = 0; i < busStopClicked.routes.length; i++) {

                busRoutes[busStopClicked.routes[i]].stops.splice(busRoutes[busStopClicked.routes[i]].stops.indexOf(stopClicked.layer.getLatLng().toString()), 1);
                busRoutes[busStopClicked.routes[i]].route.setWaypoints(busRoutes[busStopClicked.routes[i]].stops.map(a => busStops[a].stopCoords));

            }

            delete busStops[busStopClicked.stopCoords.toString()];

            map.closePopup();

        });

        map.on('popupclose', function(event) {

            busStops[event.popup.getLatLng().toString()].stopName = event.popup.getContent().children[0].textContent;

            for (var j = 0; j < busStops[event.popup.getLatLng().toString()].routes.length; j++) {

                updateListObject(busStops[event.popup.getLatLng().toString()].routes[j]);

            }

        });

    }

});

stopCircleFeatureGroup.on("contextmenu", function(stopClicked) {

    if (pendingStopCoords.includes(stopClicked.layer.getLatLng().toString())) {

        pendingStopCoords.splice(pendingStopCoords.indexOf(stopClicked.layer.getLatLng().toString()), 1);

        if (busStops[stopClicked.layer.getLatLng().toString()].routes.length == 0) {

            busStops[stopClicked.layer.getLatLng().toString()].circle.remove();
            delete busStops[stopClicked.layer.getLatLng().toString()];

        } else {

            busStops[stopClicked.layer.getLatLng().toString()].circle.setStyle({
                fillColor: "#ffffff"
            });

        }

    }

});

$("#newLineButton").click(function() {

    $("#newLineCollapse").collapse("toggle");

    if ($("#newLineButton").text() == "Create a New Line") {

        $("#newLineButton").removeClass("btn-success");
        $("#newLineButton").addClass("btn-danger");
        $("#newLineButton").text("Cancel");
        routeBeingEdited = true;

    } else {

        for (var i = 0; i < pendingStopCoords.length; i++) {

            if (busStops[pendingStopCoords[i]].routes.length == 0) {

                busStops[pendingStopCoords[i]].circle.remove();
                delete busStops[pendingStopCoords[i]];

            } else {

                busStops[pendingStopCoords[i]].circle.setStyle({
                    fillColor: "#ffffff"
                });

            }

        }

        pendingStopCoords = [];

        $("#newLineButton").removeClass("btn-danger");
        $("#newLineButton").addClass("btn-success");
        $("#newLineButton").text("Create a New Line");
        routeBeingEdited = false;

    }

});

$("#saveButton").click(function() {

    var routesCopy = jQuery.extend(true, {}, busRoutes);
    console.log(busRoutes);
    var stopsCopy = jQuery.extend(true, {}, busStops);
    console.log(busStops);

    var routeIDs = Object.keys(routesCopy);

    for (var i = 0; i < routeIDs.length; i++) {

        routesCopy[routeIDs[i]].route = "";

    }

    var stopCoords = Object.keys(stopsCopy);

    for (var i = 0; i < stopCoords.length; i++) {

        stopsCopy[stopCoords[i]].circle = "";

    }

    var saveData = {
        routes: routesCopy,
        stops: stopsCopy
    }

    var saveDataAsJSON = JSON.stringify(saveData);
    var fileToSave = new Blob([saveDataAsJSON], {
        type: "application/json",
        name: "myBusCompany.json"
    });

    saveAs(fileToSave, "myBusCompany.json");

});

$("#loadButton").click(function() {

    $("#warningModalText").text("Loading a new route system will cause you to lose any current work. Are you sure you want to continue?")

    $("#warningModal").modal();

    $("#confirmWarning").on("click", function() {

        $("#warningModal").modal("hide");

        $("#confirmWarning").off();

        var busRouteKeys = Object.keys(busRoutes);

        for (var i = 0; i < busRouteKeys.length; i++) {

            deleteLine(busRouteKeys[i]);

        }

        $("#loadFileInput").click();
        $("#loadFileInput").on("change", function() {

            console.log("File selected");

            var uploadedFile = $("#loadFileInput").prop("files").item(0);

            if (uploadedFile != null) {

                var fileReader = new FileReader();

                fileReader.onload = function(e) {

                    var uploadedFileAsObject = JSON.parse(e.target.result);

                    var stops = uploadedFileAsObject.stops;
                    var routes = uploadedFileAsObject.routes;

                    var stopCoords = Object.keys(stops);
                    var routeIDs = Object.keys(routes);

                    for (var i = 0; i < stopCoords.length; i++) {

                        stops[stopCoords[i]].circle = L.circle(stops[stopCoords[i]].stopCoords, {
                            color: '#000000',
                            fillColor: '#ffffff',
                            fillOpacity: 1,
                            radius: 10,
                        }).addTo(stopCircleFeatureGroup);

                        busStops[stopCoords[i]] = stops[stopCoords[i]];

                    }

                    for (var i = 0; i < routeIDs.length; i++) {

                        var routingObject = L.Routing.control({
                            waypoints: (routes[routeIDs[i]].stops).map(a => busStops[a].stopCoords),
                            lineOptions: {
                                styles: [{
                                    color: routes[routeIDs[i]].color,
                                    opacity: 1,
                                    weight: 5
                                }]
                            },
                            createMarker: function() {
                                return null;
                            }
                        }).addTo(map);

                        routingObject.hide();

                        routes[routeIDs[i]].route = routingObject;

                        busRoutes[routeIDs[i]] = routes[routeIDs[i]];

                        buildListObject(busRoutes[routeIDs[i]]);

                    }

                    console.log(busRoutes);
                    $("#loadFileInput").off();
                    $("#loadFileInput").val(null);

                }

                fileReader.readAsText(uploadedFile);

            }

        });

    });

});

$("#createLineButton").click(function() {

    if (lineExists($("#name").val())) {

        createAlert("A line with this name already exists");

    } else if (/\s/.test($("#name").val())) {

        createAlert("The line name cannot contain any spaces");

    } else if ($("#name").val().length < 1) {

        createAlert("Please give this line a name");

    } else if (pendingStopCoords.length < 2) {

        createAlert("Please ensure that the line has at least two stops");

    } else {

        createNewLine();

        $("#newLineCollapse").collapse("toggle");
        $("#newLineButton").removeClass("btn-danger");
        $("#newLineButton").addClass("btn-success");
        $("#newLineButton").text("Create a New Line");

        routeBeingEdited = false;

    }

})

$("#deleteLineButton").on("click", function() {

    $("#moreOpsModal").modal("hide");
    $("#warningModalText").text("Are you sure you want to delete this line? This action cannot be undone.");
    $("#warningModal").modal();

    $("#confirmWarning").on("click", function() {

        routeID = $("#moreOpsModalTitle").text() + "ID";

        console.log("This is running");
        deleteLine(routeID);

        $("#warningModal").modal("hide");

        $("#confirmWarning").off();

    });

});

function deleteLine(routeID) {

    busRoutes[routeID].route.remove();

    for (var i = 0; i < busRoutes[routeID].stops.length; i++) {

        if (busStops[busRoutes[routeID].stops[i]].routes.length > 1) {

            busStops[busRoutes[routeID].stops[i]].routes.splice(busStops[busRoutes[routeID].stops[i]].routes.indexOf(routeID), 1);

        } else {

            busStops[busRoutes[routeID].stops[i]].circle.remove();
            delete busStops[busRoutes[routeID].stops[i]];

        }

    }

    $("#" + routeID).remove();

    delete busRoutes[routeID];

}

function lineExists(lineName) {

    var x;
    for (x in busRoutes) {

        if (x == lineName + "ID") {
            return true;
        }

    }

    return false;

}

function createAlert(message) {

    var Alert = document.createElement("div");
    Alert.id = "alert";
    Alert.setAttribute("class", "hidden alert alert-danger alert-dismissable fade show");

    alertCloseButton = document.createElement("a");
    alertCloseButton.setAttribute("href", "#");
    alertCloseButton.setAttribute("class", "close");
    alertCloseButton.setAttribute("data-dismiss", "alert");
    alertCloseButton.setAttribute("aria-label", "close");
    alertCloseButton.innerHTML = "&times";

    Alert.innerHTML = message;
    Alert.appendChild(alertCloseButton);


    $("#alertsDiv").append(Alert);

    setTimeout(function() {
        $("#alert").alert("close");
    }, 5000);

}

function createNewLine() {

    var lineName = $("#name").val();
    var lineColor = $("#color").val();

    var lineRoute = L.Routing.control({
        waypoints: pendingStopCoords.map(a => busStops[a].stopCoords),
        lineOptions: {
            styles: [{
                color: lineColor,
                opacity: 1,
                weight: 5
            }]
        },
        createMarker: function() {
            return null;
        }
    }).addTo(map);

    lineRoute.hide();

    stopCircleFeatureGroup.bringToFront();

    var route = {
        name: lineName,
        color: lineColor,
        route: lineRoute,
        stops: pendingStopCoords
    }

    for (var i = 0; i < pendingStopCoords.length; i++) {

        if (!busStops[pendingStopCoords[i]].routes.includes(route.name + "ID")) {

            busStops[pendingStopCoords[i]].routes.push(route.name + "ID");

        }

        busStops[pendingStopCoords[i]].circle.setStyle({
            fillColor: "#ffffff"
        });

    }

    busRoutes[lineName + "ID"] = route;

    buildListObject(route);

    pendingStopCoords = [];

}

function buildListObject(route) {

    var routeListItem = document.createElement("a");
    routeListItem.id = route.name + "ID";
    routeListItem.setAttribute("href", "#");
    routeListItem.setAttribute("class", "list-group-item list-group-item-action flex-column align-items-start active");
    routeListItem.setAttribute("style", "background-color:" + route.color + ";");

    $("#lines").append(routeListItem);

    var heading = document.createElement("h5");
    heading.id = route.name + "HeadingID";
    heading.setAttribute("class", "mb-1");
    heading.innerHTML = route.name;

    $("#" + route.name + "ID").append(heading);

    var originAndDestination = document.createElement("p");
    originAndDestination.id = route.name + "ODID";
    originAndDestination.setAttribute("class", "mb-1");
    originAndDestination.innerHTML = busStops[route.stops[0]].stopName + " - " + busStops[route.stops[route.stops.length - 1]].stopName;

    $("#" + route.name + "ID").append(originAndDestination);

    var moreOpsButton = document.createElement("button");
    moreOpsButton.id = route.name + "ButtonID";
    moreOpsButton.setAttribute("type", "button");
    moreOpsButton.setAttribute("class", "btn btn-primary");
    moreOpsButton.innerHTML = "More Options";

    $("#" + route.name + "ID").append(moreOpsButton);

    $("#" + route.name + "ButtonID").click(function(e) {

        busRoutes[e.target.id.replace("ButtonID", "ID")];
        initModal(busRoutes[e.target.id.replace("ButtonID", "ID")]);

    });

}

function initModal(route) {

    $("#moreOpsModalTitle").text(route.name);
    $("#stops").empty();

    for (var i = 0; i < route.stops.length; i++) {

        var stopsListItem = document.createElement("a");
        stopsListItem.setAttribute("class", "list-group-item");
        stopsListItem.innerHTML = busStops[route.stops[i]].stopName;

        $("#stops").append(stopsListItem);

    }

    $("#moreOpsModal").modal();

}

function updateListObject(routeID) {

    route = busRoutes[routeID];
    $("#" + route.name + "ODID").text(busStops[route.stops[0]].stopName + " - " + busStops[route.stops[route.stops.length - 1]].stopName);

}
