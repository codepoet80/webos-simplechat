/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var appModel = null;
var updaterModel = null;
var serviceModel = null;
var MainStageName = "main";
var InDockMode = false;

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
    
    if (!appModel.AppSettingsCurrent["AutoDownloadTime"]) {
        appModel.AppSettingsCurrent["AutoDownloadTime"] = appModel.AppSettingsDefaults["AutoDownloadTime"];
        appModel.SaveSettings();
    }

    //Reset alarms
    systemModel.ClearSystemAlarm("BackgroundDownload");
    if (appModel.AppSettingsCurrent["UseAutoDownload"] && appModel.AppSettingsCurrent["Username"] != "" && appModel.AppSettingsCurrent["Credential"]) {
        Mojo.Log.info("Re-establishing background download alarm with time: " + appModel.AppSettingsCurrent["AutoDownloadTime"]);
        systemModel.SetSystemAlarmRelative("BackgroundDownload", appModel.AppSettingsCurrent["AutoDownloadTime"]);
    } else {
        Mojo.Log.warn("Not setting background download alarm since conditions weren't met.");
    }

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
        this.handleParameterLaunch(params);
    }
};

AppAssistant.prototype.handleParameterLaunch = function(params) {
    Mojo.Log.info("Launch params: " + JSON.stringify(params));
    //Touch2Share Launch (goes to main)
    if (params["sendDataToShare"]) {
        Mojo.Log.info("Launch with Touch2Share request!");
        systemModel.SendDataForTouch2Share(appModel.CurrentShareURL);
    }

    //Alarm Launch (goes to dashboard) 
    else if (params.action && params.action == "BackgroundDownload"){
        Mojo.Log.info("Alarm launch for background sync...");
        //TODO: Check if in Dock Mode (and remember)
        systemModel.GetDisplayState(function(response) {
            Mojo.Log.info("Called back from GetDisplayState with response: " + JSON.stringify(response));
            InDockMode = false;
            if (response && response.state == "on" && response.active == false) {
                InDockMode = true;
                systemModel.SetDisplayState("unlock");
                systemModel.SetDisplayState("on");
            }
            appModel.ShowDownloaderStage();
        }.bind(this));
    }

    //JustType or other (goes to main) 
    else {
        Mojo.Log.info("Launch with item request to be handled by Main scene...");
        appModel.LaunchQuery = params;

        var mainStage = this.controller.getStageProxy(MainStageName);
        if (mainStage) {
            var stageController = this.controller.getStageController(MainStageName);
            stageController.swapScene({ transition: Mojo.Transition.crossFade, name: MainStageName });
        }
        else {
            var stageArguments = { name: MainStageName, lightweight: true };
            this.controller.createStageWithCallback(stageArguments, function(stageController) {
                stageController.pushScene(MainStageName);
            }.bind(this));
        }
    }
}