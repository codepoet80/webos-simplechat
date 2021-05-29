function WelcomeAssistant(startup) {
    this.isStartup = startup;

    // on first start, this message is displayed, along with the current version message from below
    //this.startupMessage = Mojo.Controller.appInfo.startupMessage;
    this.startupMessage = "Your account has been created!";

    // setup command menu
    this.cmdMenuModel = {
        visible: false,
        items: [
            {},
            {
                label: $L("Got it!"),
                command: 'do-continue'
            },
            {}
        ]
    };
};

WelcomeAssistant.prototype.setup = function() {
    //this.titleElement = this.controller.get('title');
    this.dataElement = this.controller.get('welcome-data');

    //this.titleElement.innerHTML = $L('Version Info');

    var useURL = serviceModel.buildURL(null, "");
    useURL = useURL.replace(".php", "");
    var html = '<p>';
    html += '<b>Name:</b> <em>' + appModel.AppSettingsCurrent["Username"] + "</em><br>";
    html += '<b>Share Phrase:</b> <em>' + appModel.AppSettingsCurrent["SharePhrase"] + "</em><br>";
    html += '<b>Admin Password:</b> <em>' + appModel.AppSettingsCurrent["Credential"] + "</em><br>";
    html += '<b>URL:</b> <em>' + useURL + "</em><br></p>";

    // set data
    this.dataElement.innerHTML = html;

    // setup menu
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, { visible: false });

    //if (this.isStartup) {
    // set command menu
    this.controller.setupWidget(Mojo.Menu.commandMenu, { menuClass: 'no-fade' }, this.cmdMenuModel);
    //}
};

WelcomeAssistant.prototype.activate = function(event) {
    this.timer = this.controller.window.setTimeout(this.showContinue.bind(this), 4 * 1000);
};
WelcomeAssistant.prototype.deactivate = function(event) {};
WelcomeAssistant.prototype.cleanup = function(event) {};

WelcomeAssistant.prototype.showContinue = function() {
    // show the command menu
    this.controller.setMenuVisible(Mojo.Menu.commandMenu, true);
};

WelcomeAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-continue':
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.swapScene({ transition: Mojo.Transition.zoomFade, name: "main" });
                break;
        }
    }
};