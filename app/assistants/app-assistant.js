/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var appModel = null;
var updaterModel = null;
var serviceModel = null;
var MainStageName = "main";

function AppAssistant() {
    appModel = new AppModel();
    updaterModel = new UpdaterModel();
    serviceModel = new ShareServiceModel();
    systemModel = new SystemModel();
    Mojo.Additions = Additions;
}

//This function will handle relaunching the app when an alarm goes off(see the device/alarm scene)
AppAssistant.prototype.handleLaunch = function(params) {
    Mojo.Log.info("Share Space is Launching! Launch params: " + JSON.stringify(params));

    //Load preferences
    appModel.LoadSettings();
    Mojo.Log.info("settings now: " + JSON.stringify(appModel.AppSettingsCurrent));
    
    /*
    if (!appModel.AppSettingsCurrent["BackgroundUpdate"]) {
        appModel.AppSettingsCurrent["BackgroundUpdate"] = "00:30:00";
        appModel.SaveSettings();
    }

    //Reset alarms
    systemModel.ClearSystemAlarm("ShareSpace");
    if (appModel.AppSettingsCurrent["BackgroundUpdate"] && appModel.AppSettingsCurrent["BackgroundUpdate"] != "" && appModel.AppSettingsCurrent["BackgroundUpdate"] != -1)
        systemModel.SetSystemAlarmRelative("ShareSpace", appModel.AppSettingsCurrent["BackgroundUpdate"]);
    */

    if (!params || !params["action"]) {
        var mainStage = this.controller.getStageProxy("main"); //get the proxy for the stage if it already exists (eg: app is currently open)
        if (mainStage) //If the stage exists, use it
        {
            Mojo.Log.info("Found existing main stage, app was already running");
            Mojo.Log.info("This is a non-alarm re-launch");

            var stageController = this.controller.getStageController("main");
            stageController.activate(); //bring existing stage into focus
            if (params)
                this.handleParameterLaunch(params, stageController);

        } else //If not, determine if we should make one
        {
            Mojo.Log.info("Did not find existing main stage, app is not running");
            Mojo.Log.info("This is a non-alarm launch of version " + Mojo.Controller.appInfo.version);

            var stageArguments = { name: MainStageName, lightweight: true };
            this.controller.createStageWithCallback(stageArguments, function(stageController) {
                stageController.pushScene(MainStageName);
                if (params)
                    this.handleParameterLaunch(params, stageController);
            }.bind(this));
        }
    } else {
        //this is an alarm launch
        //TODO: Add Dashboard scene
    }
};

AppAssistant.prototype.handleParameterLaunch = function(params, stageController) {
    Mojo.Log.info("Launch params: " + JSON.stringify(params));
    if (params["sendDataToShare"]) {
        Mojo.Log.info("Launch with Touch2Share request!");
        systemModel.SendDataForTouch2Share(appModel.CurrentShareURL);
    } else {
        Mojo.Log.info("Launch with item request to be handled by Main scene...");
        //Make sure the main scene is there
        appModel.LaunchQuery = params;
        stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "main" });
    }
}
/*

//This function will handle relaunching the app when an alarm goes off(see the device/alarm scene)
AppAssistant.prototype.handleLaunch = function(params) {

    //get the proxy for the stage in the event it already exists (eg: app is currently open)
    var mainStage = this.controller.getStageProxy("");
    Mojo.Log.info("Share space is Launching! Launch params: " + JSON.stringify(params));

    //if there was a search query, load with that
    Mojo.Log.info("Launch params: " + JSON.stringify(params));
    if (params) {
        if (params["sendDataToShare"]) {
            Mojo.Log.info("Launch with Touch2Share request!");
            systemModel.SendDataForTouch2Share(appModel.CurrentShareURL);
        } else {
            Mojo.Log.info("Launch with item request to be handled by Main scene...");
            appModel.LaunchQuery = params;
        }
    }

    //if the stage already exists then just bring it into focus
    if (mainStage) {
        var stageController = this.controller.getStageController("");
        stageController.activate();
    }
    return;
};
*/