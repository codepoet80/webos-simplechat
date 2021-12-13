function VersionAssistant(startup) {
    this.isStartup = startup;

    // on first start, this message is displayed, along with the current version message from below
    this.startupMessage = Mojo.Controller.appInfo.startupMessage;

    //New Features
    this.changelog = [{
            version: "Version 1.7.0",
            detail: [
                "Images from Discord are now supported! Inline rendering uses a thumbnail for efficiency; tap the image to load the fullsize, or tap elsewhere on the row to pull up the menu that lets you download the image to your device (it will be saved to /internal/downloads)",
            ]
        },{
            version: "Version 1.6.0",
            detail: [
                "Added ability to parse Imgur album links and render via a service proxy.",
            ]
        },{
            version: "Version 1.5.0",
            detail: [
                "Added ability to parse Share Services links and show thumbnails, configurable in Preferences.",
            ]
        },{
            version: "Version 1.4.1",
            detail: [
                "Add support for some basic markdown",
            ]
        },
        {
            version: "Version 1.4.0",
            detail: [
                "Enter key behavior as a Preference",
                "Even more silent background sync, won't sync if offline",
                "Swiping notifications resets missed message count",
                "Adjust tap target for collapsing controls"
            ]
        },
        {
            version: "Version 1.3.2",
            detail: [
                "More sync timing options.",
                "Refactored some code to make forking easier."
            ]
        }, {
            version: "Version 1.3.1",
            detail: [
                "Enter key now sends message when Command menu buttons are hidden."
            ]
        },
        {
            version: "Version 1.3.0",
            detail: [
                "Drastically improved background update and notifications."
            ]
        }, {
            version: "Version 1.2.0",
            detail: [
                "Converts image links to an image proxy so they can be viewed and scaled properly on tiny devices",
                "Improved background update, using a notification launch, no longer interupts Exhibition, video playback or One Night Stand"
            ]
        },
        {
            version: "Version 1.1.3",
            detail: [
                "Bug fixes and general maintenance"
            ]
        }, {
            version: "Version 1.1.2",
            detail: [
                "Show/Hide the Command menu buttons by tapping the Compose area title bar",
                "Enable/Disable Discord Emojis in Preferences",
            ]
        }, {
            version: "Version 1.1.1",
            detail: [
                "Improved Discord integration, including showing Emojis!<span class='emoji-outer emoji-sizer'><span class='emoji-inner emoji1f388'></span></span>",
                "Now with a smaller emoji file!",
                "Improved timeout logic.",
                "Trying different background sync logic."
            ]
        }
    ];

    // setup command menu
    this.cmdMenuModel = {
        visible: false,
        items: [
            {},
            {
                label: $L("OK! Let's Go..."),
                command: 'do-continue'
            },
            {}
        ]
    };
};

VersionAssistant.prototype.setup = function() {
    this.titleElement = this.controller.get('title');
    this.dataElement = this.controller.get('data');

    this.titleElement.innerHTML = $L('Version Info');

    var html = '';
    html += '<div style="margin: 2px 12px 12px 12px">' + this.startupMessage + '</div>';

    for (var i = 0; i < this.changelog.length; i++) {
        html += Mojo.View.render({ object: { title: this.changelog[i].version }, template: 'version/rowDivider' });
        html += '<ul>';

        for (var j = 0; j < this.changelog[i].detail.length; j++) {
            html += '<li>' + this.changelog[i].detail[j] + '</li>';
        }
        html += '</ul>';
    }

    // set data
    this.dataElement.innerHTML = html;

    // setup menu
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, { visible: false });

    //if (this.isStartup) {
    // set command menu
    this.controller.setupWidget(Mojo.Menu.commandMenu, { menuClass: 'no-fade' }, this.cmdMenuModel);
    //}
};

VersionAssistant.prototype.activate = function(event) {
    this.timer = this.controller.window.setTimeout(this.showContinue.bind(this), 2 * 1000);
};
VersionAssistant.prototype.deactivate = function(event) {};
VersionAssistant.prototype.cleanup = function(event) {};

VersionAssistant.prototype.showContinue = function() {
    // show the command menu
    this.controller.setMenuVisible(Mojo.Menu.commandMenu, true);
};

VersionAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-continue':
                this.controller.stageController.popScene();
                break;
        }
    }
};