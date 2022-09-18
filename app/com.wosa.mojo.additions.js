/*
Mojo Additions
 Version 0.3e
 Created: 2018
 Author: Jon W
 License: MIT
 Description: Functions I use often, that probably should have been part of Mojo.
              They either fix bugs in Mojo or make it easier to use.
*/

//** Note: If you synced this file from a common repository, local edits may be over-written! */

this.Additions = function() {}

console.log("** Mojo Additions loaded **");

Additions.ShowDialogBox = function(title, message) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        this.controller.showAlertDialog({
            onChoose: function(value) {},
            title: title,
            message: message,
            choices: [{ label: 'OK', value: 'OK' }],
            allowHTMLMessage: true
        });
    }
}

Additions.DisableWidget = function(widgetName, disabledValue) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetSetup = this.controller.getWidgetSetup(widgetName);
        var thisWidgetModel = thisWidgetSetup.model;
        thisWidgetModel.disabled = disabledValue;

        this.controller.setWidgetModel(widgetName, thisWidgetModel);
        this.controller.modelChanged(thisWidgetModel);
    }
}

Additions.SetPickerWidgetValue = function(widgetName, newvalue) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetModel = this.controller.getWidgetSetup(widgetName).model;
        thisWidgetModel.value = newvalue;
        this.controller.setWidgetModel(widgetName, thisWidgetModel);
    }
}

Additions.SetWidgetLabel = function(widgetName, newvalue) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetModel = this.controller.getWidgetSetup(widgetName).model;
        thisWidgetModel.label = newvalue;
        this.controller.setWidgetModel(widgetName, thisWidgetModel);
    }
}

Additions.GetWidgetLabel = function(widgetName) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetModel = this.controller.getWidgetSetup(widgetName).model;
        return thisWidgetModel.label;
    }
}

Additions.SetToggleState = function(widgetName, toggledValue) {
    var stageController = Mojo.Controller.getAppController().getStageController("");
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetSetup = this.controller.getWidgetSetup(widgetName);
        var thisWidgetModel = thisWidgetSetup.model;
        thisWidgetModel.value = toggledValue;
        this.controller.setWidgetModel(widgetName, thisWidgetModel);

        //There appears to be a bug in Mojo that means a toggle button doesn't reflect its model state during instantiation
        //	This work-around fixes it.
        var children = document.getElementById(widgetName).querySelectorAll('*');
        for (var i = 0; i < children.length; i++) {
            if (children[i].className.indexOf("toggle-button") != -1) {
                children[i].className = "toggle-button " + thisWidgetModel.value;
            }
            if (children[i].tagName == "SPAN") {
                if (thisWidgetModel.value.toString().toLowerCase() == "true")
                    children[i].innerHTML = "on";
                else
                    children[i].innerHTML = "off";
            }
        }
    }
}

Additions.FindAncestorWithIdPart = function(currElement, namePartToSearch, expectedIndex, levelsToClimb) {
    var parentList = "";
    if (typeof levelsToClimb === undefined || levelsToClimb == null)
        levelsToClimb = 10;
    var foundElement;
    for (var i = 0; i < levelsToClimb; i++) {
        var parentElement = currElement.parentElement;
        if (parentElement != null && parentElement.id != null && parentElement.id != "") {
            parentList += parentElement.id + ",";
            if (parentElement.id.indexOf(namePartToSearch) == expectedIndex) {
                foundElement = parentElement;
            }
        } else {
            parentList += "null,";
        }
        currElement = parentElement;
    }
    Mojo.Log.info("Discovered ancestor ids: " + parentList);
    return foundElement;
}

Additions.EnumerateObject = function(objectToEnumerate) {
    for (var key in objectToEnumerate) {
        Mojo.Log.info("=== prop:" + key + ": " + objectToEnumerate[key]);
        if (objectToEnumerate.hasOwnProperty(key)) {
            var obj = objectToEnumerate[key];
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    Mojo.Log.info("...... sub: " + prop + " = " + obj[prop])
                }
            }
        }
    }
}