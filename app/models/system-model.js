/*
System Model
 Version 0.9
 Created: 2020
 Author: Jonathan Wise
 License: MIT
 Description: A generic and re-usable model for accessing webOS system features more easily
				Privileged functions can only be called if your App ID starts with com.palm.webos
*/

var SystemModel = function() {

};

//Create a named System Alarm using relative time ("in")
SystemModel.prototype.SetSystemAlarmRelative = function(alarmName, alarmTime) {
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
        method: "set",
        parameters: {
            "key": Mojo.Controller.appInfo.id + "-" + alarmName,
            "in": alarmTime,
            "wakeup": true,
            "uri": "palm://com.palm.applicationManager/open",
            "params": {
                "id": Mojo.Controller.appInfo.id,
                "params": { "action": alarmName }
            }
        },
        onSuccess: function(response) {
            Mojo.Log.info("Alarm Set Success", JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Set Failure, " + alarmTime + ":",
                JSON.stringify(response), response.errorText);
        }
    });
    return true;
}

//Create a named System Alarm using absolute time ("at")
SystemModel.prototype.SetSystemAlarmAbsolute = function(alarmName, alarmTime) {
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
        method: "set",
        parameters: {
            "key": Mojo.Controller.appInfo.id + "-" + alarmName,
            "at": alarmTime,
            "wakeup": true,
            "uri": "palm://com.palm.applicationManager/open",
            "params": {
                "id": Mojo.Controller.appInfo.id,
                "params": { "action": alarmName }
            }
        },
        onSuccess: function(response) {
            Mojo.Log.info("Alarm Set Success", JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Set Failure, " + alarmTime + ":",
                JSON.stringify(response), response.errorText);
        }
    });
    return true;
}

//Remove a named System alarm
SystemModel.prototype.ClearSystemAlarm = function(alarmName) {
    Mojo.Log.warn("Clearing alarm: " + alarmName);
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
        method: "clear",
        parameters: { "key": Mojo.Controller.appInfo.id + "-" + alarmName },
        onSuccess: function(response) {
            Mojo.Log.info("Alarm Clear Success", JSON.stringify(response));
            success = true;
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Clear Failure",
                JSON.stringify(response), response.errorText);
            success = false;
        }
    });
    return true;
}

//Play a pre-defined system sound
SystemModel.prototype.PlaySound = function(soundName) {
    Mojo.Log.info("Playing sound: " + soundName);
    this.soundRequest = new Mojo.Service.Request("palm://com.palm.audio/systemsounds", {
        method: "playFeedback",
        parameters: {
            name: soundName
        },
        onSuccess: function() { success = true; },
        onFailure: function() { success = false; }
    });
}

//Allow the display to sleep
SystemModel.prototype.AllowDisplaySleep = function(stageController) {
    if (!stageController)
        stageController = Mojo.Controller.getAppController().getActiveStageController();

    //Tell the System it doesn't have to stay awake any more
    Mojo.Log.info("Allowing display sleep");

    stageController.setWindowProperties({
        blockScreenTimeout: false
    });
}

//Prevent the display from sleeping
SystemModel.prototype.PreventDisplaySleep = function(stageController) {
    if (!stageController)
        stageController = Mojo.Controller.getAppController().getActiveStageController();

    //Ask the System to stay awake while timer is running
    Mojo.Log.info("Preventing display sleep");

    stageController.setWindowProperties({
        blockScreenTimeout: true
    });
}

//Show a notification window in its own small stage
//	Launches with sound: pass true for default, false for no sound, or pass the path to a specific sound file
SystemModel.prototype.ShowNotificationStage = function(stageName, sceneName, heightToUse, sound, vibrate) {
    Mojo.Log.info("Showing notification stage.");
    //Determine what sound to use
    var soundToUse;
    if (!sound)
        soundToUse = "assets/silent.mp3";
    else if (sound == true || sound == "")
        soundToUse = "/media/internal/ringtones/Dulcimer (short).mp3"
    else
        soundToUse = sound;
    if (vibrate != null)
        this.Vibrate(vibrate);

    var stageCallBack = function(stageController) {
        stageController.pushScene({ name: stageName, sceneTemplate: sceneName });
    }
    Mojo.Controller.getAppController().createStageWithCallback({
        name: stageName,
        lightweight: true,
        height: heightToUse,
        sound: soundToUse,
        clickableWhenLocked: true
    }, stageCallBack, 'popupalert');
}

//Vibrate the device
SystemModel.prototype.Vibrate = function(vibrate) {
    var success = true;
    Mojo.Log.info("Vibrating device.");
    if (!Number(vibrate)) {
        if (vibrate == true)
            vibeMax = 1;
        else
            vibeMax = 0;
    } else
        vibeMax = Number(vibrate);
    if (vibeMax > 0)
        vibeInterval = setInterval(doVibrate, 500);

    return success;
}

//Launch an app
SystemModel.prototype.LaunchApp = function(appName, params) {
    if (!params)
        params = {};
    if (!params.id)
        params.id = appName;
    this.launchRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
        method: "open",
        parameters: params,
        onSuccess: function(response) {
            Mojo.Log.info("App Launch Success", appName, JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Launch Failure", appName, JSON.stringify(response));
        }
    });
    return true;
}

//Helper Functions
var vibeInterval;
var vibeCount = 0;
var vibeMax = 5;
doVibrate = function() {
    vibeCount++;
    new Mojo.Service.Request("palm://com.palm.vibrate", {
        method: "vibrate",
        parameters: { "period": 500, "duration": 1000 }
    });

    if (vibeCount >= vibeMax) {
        clearInterval(vibeInterval);
        vibeCount = 0;
    }
}

//Privileged functions
/*	These functions can only be called with apps that have com.palm.webos as the start of their App Id */

//Set the System Volume to a given level
SystemModel.prototype.SetSystemVolume = function(newVolume) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        this.service_identifier = 'palm://com.palm.audio/system';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setVolume',
            parameters: { volume: newVolume },
            onSuccess: function(response) { Mojo.Log.info("System volume set to " + newVolume); },
            onFailure: function(response) { Mojo.Log.warn("System volume not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the current System Volume to a callback
SystemModel.prototype.GetSystemVolume = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        this.service_identifier = 'palm://com.palm.audio/system';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'getVolume',
            onSuccess: callback,
            onFailure: callback
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the Ringtone Volume to a given level
SystemModel.prototype.SetRingtoneVolume = function(newVolume) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        this.service_identifier = 'palm://com.palm.audio/ringtone';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setVolume',
            parameters: { volume: newVolume },
            onSuccess: function(response) { Mojo.Log.info("Ringtone volume set to " + newVolume); },
            onFailure: function(response) { Mojo.Log.warn("Ringtone volume not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the current Ringtone Volume to a callback
SystemModel.prototype.GetRingtoneVolume = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        this.service_identifier = 'palm://com.palm.audio/ringtone';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'getVolume',
            onSuccess: callback,
            onFailure: callback
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the System Brightness to a given level
SystemModel.prototype.SetSystemBrightness = function(newBrightness) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        this.service_identifier = 'palm://com.palm.display/control';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setProperty',
            parameters: { maximumBrightness: newBrightness },
            onSuccess: function(response) { Mojo.Log.info("Screen brightness set to " + newBrightness); },
            onFailure: function(response) { Mojo.Log.warn("Screen brightess not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the System Brightness
SystemModel.prototype.GetSystemBrightness = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Getting display state");
        new Mojo.Service.Request("palm://com.palm.display/control", {
            method: "getProperty",
            parameters: { properties: ['timeout', 'maximumBrightness'] },
            onSuccess: callback,
            onFailure: callback
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the state of the display ("undefined", "dimmed", "off" or "on") to a callback
SystemModel.prototype.GetDisplayState = function(callBack) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Getting display state");
        new Mojo.Service.Request("palm://com.palm.display/control", {
            method: "status",
            parameters: {},
            onSuccess: callBack,
            onFailure: callBack
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the state of the display ("unlocked", "dimmed", "off" or "on")
SystemModel.prototype.SetDisplayState = function(state) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Setting display state to " + state);
        new Mojo.Service.Request("palm://com.palm.display/control", {
            method: "setState",
            parameters: { "state": state },
            onSuccess: function(response) {
                Mojo.Log.info("Display set success: ", JSON.stringify(response));
            },
            onFailure: function(response) {
                Mojo.Log.error("Display set error: ", JSON.stringify(response), response.errorText);
            }
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the Notifications-When-Locked state
SystemModel.prototype.setShowNotificationsWhenLocked = function(value) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Setting Notifications When Locked to " + value);
        this.service_identifier = 'palm://com.palm.systemservice';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setPreferences',
            parameters: { showAlertsWhenLocked: value }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the LED Notification state
SystemModel.prototype.setLEDLightNotifications = function(value) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Setting LED Notifications to " + value);
        this.service_identifier = 'palm://com.palm.systemservice';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setPreferences',
            parameters: { BlinkNotifications: value }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the WAN state
SystemModel.prototype.setWANEnabled = function(value) {
    var state = value ? 'off' : 'on';
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Setting WAN State to " + value);
        this.service_identifier = 'palm://com.palm.wan/';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'set',
            parameters: { disablewan: state },
            onSuccess: function(response) { Mojo.Log.info("WAN state set to " + value); },
            onFailure: function(response) { Mojo.Log.warn("WAN state not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the WIFI state
SystemModel.prototype.setWifiEnabled = function(value) {
    var state = value ? 'enabled' : 'disabled';
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Setting WIFI State to " + state);
        this.service_identifier = 'palm://com.palm.wifi';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setstate',
            parameters: { 'state': state },
            onSuccess: function(response) { Mojo.Log.info("Wifi state set to " + state); },
            onFailure: function(response) { Mojo.Log.warn("Wifi state not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the Bluetooth radio state
SystemModel.prototype.SetBluetoothEnabled = function(value) {
    //var state  = value ? 'enabled':'disabled';
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Setting Bluetooth State to " + value);
        if (value == true)
            this.bluetoothControlService("palm://com.palm.btmonitor/monitor/radioon", { visible: true, connectable: true }, null);
        else
            this.bluetoothControlService("palm://com.palm.btmonitor/monitor/radiooff", null, null);
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.bluetoothControlService = function(url, params, cb) {
    return new Mojo.Service.Request(url, {
        onSuccess: cb,
        onFailure: cb,
        parameters: params,
    });
};

SystemModel.prototype.GetRunningApps = function(callBack) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Getting list of running apps.");
        this.appRequest = new Mojo.Service.Request("palm://com.palm.applicationManager/running", {
            method: "",
            parameters: {},
            onSuccess: callBack,
            onFailure: callBack
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.KillApp = function(appId) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm.webos") != -1) {
        Mojo.Log.info("Killing app id: " + appId);
        this.appRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
            method: "close",
            parameters: { "processId": appId },
            onSuccess: function(response) { Mojo.Log.info("App was killed: " + appId); },
            onFailure: function(response) { Mojo.Log.warn("App was not killed!", JSON.stringify(response)); }
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm.webos'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}