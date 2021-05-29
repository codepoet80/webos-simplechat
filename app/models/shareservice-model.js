/*
ShareBoard Model - Mojo
 Version 1.0
 Created: 2021
 Author: Jonathan Wise
 License: MIT
 Description: A model to interact with a share service
*/

var ShareServiceModel = function() {
    this.urlBase = Mojo.Controller.appInfo.serviceURL;
    this.shortUrlBase = Mojo.Controller.appInfo.shortURL;
};

//Properties
ShareServiceModel.prototype.ForceHTTP = false;
ShareServiceModel.prototype.UseCustomShare = false;
ShareServiceModel.prototype.UseCustomEndpoint = false;
ShareServiceModel.prototype.CustomEndpointURL = "";
ShareServiceModel.prototype.CustomShortURL = "";
ShareServiceModel.prototype.CustomCreateKey = "";
ShareServiceModel.prototype.UseCustomClientId = false;
ShareServiceModel.prototype.CustomClientId = "";
//ShareServiceModel.prototype.ServiceCompatWarning = 0;

ShareServiceModel.prototype.buildURL = function(username, actionType) {
    var urlBase = this.urlBase;
    if (this.UseCustomEndpoint == true && this.CustomEndpointURL != "") {
        urlBase = this.CustomEndpointURL;
    }
    //Make sure we don't end up with double slashes in the built URL if there's a custom endpoint
    var urlTest = urlBase.split("://");
    if (urlTest[urlTest.length - 1].indexOf("/") != -1) {
        urlBase = urlBase.substring(0, urlBase.length - 1);
    }
    var path = urlBase + "/" + actionType + ".php";
    if (username)
        path += "?username=" + username;
    if (this.ForceHTTP)
        path = path.replace ("https:", "http:");
    return path;
}

ShareServiceModel.prototype.MakeShareURL = function(username, guid, type) {
    var urlBase = this.shortUrlBase;
    if (this.CustomShortURL == true && this.CustomShortURL != "") {
        urlBase = this.CustomShortURL;
    }
    if (type.indexOf("image") != -1)
        urlBase = urlBase + "image.php?";
    else
        urlBase = urlBase + "t.php?";
    var data = username + "|" + guid;
    data = btoa(data);
    urlBase = urlBase + data;
    return urlBase;
}

//HTTP request for list files
ShareServiceModel.prototype.DoShareListRequest = function(username, credential, callback, errorhandler) {
    if (callback)
        callback = callback.bind(this);
    if (!errorhandler) {
        errorhandler = function(errorText) {
            Mojo.Log.warn(errorText);
            Mojo.Controller.getAppController().showBanner({ messageText: errorText }, "", "");
        }
    } else {
        errorhandler = errorhandler.bind(this);
    }
    var useURL = this.buildURL(username, "get-shares");
    Mojo.Log.info("Calling sharing service at " + useURL + " with key " + this.getCurrentClientKey());

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", useURL);
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    xmlhttp.setRequestHeader("credential", credential);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status >= 400) {
                errorhandler(xmlhttp.status + " Error getting share list: " + responseObj.error, callback);
                return false;
            } else {
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            errorhandler("Share service error: " + responseObj.error, callback);
                            return false;
                        } else {
                            //Mojo.Log.info("Share List success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(responseObj);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Shares retreived!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        errorhandler("Error parsing share list response: " + ex + ", response: " + xmlhttp.responseText, callback);
                        return false;
                    }
                } else {
                    errorhandler("Share list response was empty", callback);
                    return false;
                }
            }
        }
    }.bind(this);
}

//HTTP request for add file
ShareServiceModel.prototype.DoShareAddRequestText = function(content, username, credential, contenttype, callback, errorhandler) {
    if (callback)
        callback = callback.bind(this);
    if (!errorhandler) {
        errorhandler = function(errorText) {
            Mojo.Log.warn(errorText);
            Mojo.Controller.getAppController().showBanner({ messageText: errorText }, "", "");
        }
    }
    var useURL = this.buildURL(username, "share-text");
    Mojo.Log.info("Adding text share: " + content + " of type " + contenttype + " from URL " + useURL);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", useURL);
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    xmlhttp.setRequestHeader("credential", credential);
    xmlhttp.setRequestHeader("content-type", contenttype);
    xmlhttp.send(content);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status >= 400) {
                errorhandler(xmlhttp.status + " Error adding share text: " + responseObj.error);
                return false;
            } else {
                Mojo.Log.info("Share service sent response while sharing text: " + xmlhttp.responseText);
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            errorhandler("Error sharing text: " + responseObj.error);
                            return false;
                        } else {
                            Mojo.Log.info("Share text success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(responseObj);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Content shared!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        errorhandler("Error parsing add share response: " + ex);
                        return false;
                    }
                } else {
                    errorhandler("Add share response was empty");
                    return false;
                }
            }
        }
    }.bind(this);
}

//Upload a file
ShareServiceModel.prototype.DoShareAddRequestImage = function (fullFilePath, username, credential, contenttype, callback, errorhandler) {
    if (callback)
        callback = callback.bind(this);
    if (!errorhandler) {
        errorhandler = function(errorText) {
            Mojo.Log.warn(errorText);
            Mojo.Controller.getAppController().showBanner({ messageText: errorText }, "", "");
        }
    }
    var useURL = this.buildURL(username, "share-image");
    Mojo.Log.info("Adding image share: " + fullFilePath + " of type " + contenttype + " from URL " + useURL);
    
    this.uploadRequest = new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
        method: 'upload',
        parameters: {
            fileName: fullFilePath,
            url: useURL,
            fileLabel: "image",
            contentType: contenttype,
            postParameters: [
                {"key":"username", "data": username},
                {"key":"credential" , "data": credential},
            ],
            customHttpHeaders : [ 
                'client-id: ' + this.getCurrentClientKey(),
            ],
            subscribe: true
        },
        onSuccess: function(response) {
            Mojo.Log.info("Upload progress", JSON.stringify(response));
            if ((response.completed && response.completed == true) || (response.completionCode && response.completionCode != 0)) {
                if (response.error) {
                    errorhandler(response.error);
                    return false;
                } else if (response.completionCode && response.completionCode != 0) {
                    var errMsg = "error code " + response.completionCode;
                    switch(Math.abs(response.completionCode)) {
                        case 1:
                            errMsg = "General Error";
                            break;
                        case 2:
                            errMsg = "Connection Timeout";
                            break;
                        case 3:
                            errMsg = "Corrupt File";
                            break;
                        case 4:
                            errMsg = "File System Error";
                            break;
                        case 5:
                            errMsg = "HTTP Error";
                            break;
                        case 6:
                            errMsg = "Connection Offline";
                            break;
                    }
                    errorhandler(errMsg);
                    return false;
                } else {
                    if (response.responseString) {
                        Mojo.Log.info("Upload response: " + response.responseString);
                        var responseObj = JSON.parse(response.responseString);
                        if (responseObj.error) {
                            errorhandler(responseObj.error);
                            return false;
                        } else {
                            if (callback) {
                                callback(responseObj);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Image uploaded!" }, "", "");
                            }
                            return true;
                        }
                    } else {
                        errorhandler("Error uploading image: server response was empty");
                        return false;
                    }
                }
            }
        },
        onFailure: function(response) {
            errorhandler("Error uploading image share: " + response);
            return false;
        }
    });
}

//HTTP request for list files
ShareServiceModel.prototype.DoShareDeleteRequest = function(itemid, username, credential, callback, errorhandler) {
    if (callback)
        callback = callback.bind(this);
    if (!errorhandler) {
        errorhandler = function(errorText) {
            Mojo.Log.warn(errorText);
            Mojo.Controller.getAppController().showBanner({ messageText: errorText }, "", "");
        }
    }
    var useURL = this.buildURL(username, "delete-share-item");
    Mojo.Log.info("Calling sharing service at " + useURL + " for item " + itemid + " with key " + this.getCurrentClientKey());

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", useURL);
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    xmlhttp.setRequestHeader("credential", credential);
    xmlhttp.setRequestHeader("itemid", itemid);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status >= 400) {
                errorhandler(xmlhttp.status + " Error deleting share: " + responseObj.error);
                return false;
            } else {
                Mojo.Log.info("Share service sent response while deleting share: " + xmlhttp.responseText);
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            errorhandler("Error deleting share: " + responseObj.error);
                            return false;
                        } else {
                            Mojo.Log.info("Share Delete success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(responseObj);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Content deleted!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        errorhandler("Error parsing delete share response: " + ex);
                        return false;
                    }
                } else {
                    errorhandler("Delete share response was empty");
                    return false;
                }
            }
        }
    }.bind(this);
}

//HTTP request for new user
ShareServiceModel.prototype.DoNewUserRequest = function(username, sharephrase, password, callback, errorhandler) {  
    if (callback)
        callback = callback.bind(this);
    if (!errorhandler) {
        errorhandler = function(errorText) {
            Mojo.Log.warn(errorText);
            Mojo.Controller.getAppController().showBanner({ messageText: errorText }, "", "");
        }
    }
    var useURL = this.buildURL(null, "new-user");
    Mojo.Log.info("Creating user: " + username + " with share-phrase " + sharephrase + " and password " + password + " from URL " + useURL);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", useURL);
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    var request = {
        "username":username,
        "sharephrase":sharephrase,
        "password":password,
        "createkey":this.getCurrentCreateKey()
    }
    xmlhttp.send(JSON.stringify(request));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status >= 400) {
                errorhandler(xmlhttp.status + " Error creating user: " + responseObj.error);
                return false;
            } else {
                Mojo.Log.info("Share service sent response while creating user: " + xmlhttp.responseText);
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            errorhandler("Error creating user: " + responseObj.error);
                            return false;
                        } else {
                            Mojo.Log.info("New user success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(responseObj);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "User created!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        errorhandler("Error parsing create user response: " + ex);
                        return false;
                    }
                } else {
                    errorhandler("Create user response was empty");
                    return false;
                }
            }
        }
    }.bind(this);
}

//HTTP request to get Terms and Conditions
ShareServiceModel.prototype.GetTnC = function(callback) {
    if (callback)
        callback = callback.bind(this);

    var useURL = this.buildURL(null, "tandc");
    Mojo.Log.info("Getting Terms and Conditions with query: " + useURL);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", useURL);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to get random share phrase
ShareServiceModel.prototype.GetRandomWords = function(callback) {
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL(null, "random-words");
    Mojo.Log.info("Getting Random words query: " + theQuery);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to get random share phrase
ShareServiceModel.prototype.QueryShareData = function(query, callback) {
    if (callback)
        callback = callback.bind(this);

    var theQuery = query;
    theQuery = theQuery.replace("image.php", "q.php");
    theQuery = theQuery.replace("t.php", "q.php");
    Mojo.Log.warn("Querying share item with URL: " + theQuery);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            try {
                var itemData = JSON.parse(xmlhttp.responseText);
                if (callback)
                    callback(itemData);
            } catch (ex) {
                Mojo.Log.error("Got bad item query response payload: " + ex);
            }
        }
    }.bind(this);
}

ShareServiceModel.prototype.getCurrentClientKey = function() {
    var retVal = atob(appKeys['shareBoardClientKey']);
    if (this.UseCustomEndpoint) {
        retVal = this.CustomClientId;
        Mojo.Log.info("Using custom shareboard client key: " + retVal);
    }
    //Mojo.Log.info("Using shareboard client key: " + retVal);
    return retVal;
}

ShareServiceModel.prototype.getCurrentCreateKey = function() {
    var retVal = atob(appKeys['shareBoardCreateKey']);
    if (this.UseCustomEndpoint) {
        retVal = this.CustomCreateKey;
        Mojo.Log.info("Using custom shareboard create key: " + retVal);
    }
    //Mojo.Log.info("Using shareboard create key: " + retVal);
    return retVal;
}