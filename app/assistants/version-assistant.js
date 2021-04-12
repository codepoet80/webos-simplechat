function VersionAssistant(startup) {
    this.isStartup = startup;

    // on first start, this message is displayed, along with the current version message from below
    this.startupMessage = $L("<img src='icon.png' style='float:left; margin-right:8px'>Welcome to SimpleChat! We're so excited you're here chatting with us 10 years after this platform was supposed to have died!<br>You can also join this chat from Discord: <a href='discord.gg/7NrrT8exrn'>discord.gg/7NrrT8exrn</a> or view the log on the web: <a href='http://chat.webosarchive.com'>chat.webosarchive.com</a>");

    //New Features
    this.changelog = [{
            version: "Version 1.1.4",
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