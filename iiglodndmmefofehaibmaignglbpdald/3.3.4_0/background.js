/* globals chrome */

var _gaq = _gaq || [];

var defaults = {
    "autoformat": false,
    "exclude_json": false,
    "theme": "default",
    "font": "default",
    "end_with_newline": false,

    "indent_size": 4,
    "indent_char": " ",

    "preserve_newlines": true,
    "max_preserve_newlines": 10,
    "wrap_line_length": 0,
    "brace_style": "collapse",
    "e4x": false,
    "comma_first": false,
    "detect_packers": true,
    "keep_array_indentation": false,
    "break_chained_methods": false,
    "space_before_conditional": true,
    "unescape_strings": false,
    "jslint_happy": false,

    "selector_separator_newline": true,
    "newline_between_rules": true,
    "space_around_selector_separator": true
};

var options = {};

function extend(destination, source) {
    for (var property in source) {
        destination[property] = source[property];
    }
    return destination;
}

function getOptions(firstTime) {
    chrome.storage.sync.get("options", function(data) {
        options = extend(defaults, data.options);

        if (firstTime && _gaq) {
            _gaq.push(["_setCustomVar", 1, "detect_packers", options.detect_packers.toString(), 2]);
            _gaq.push(["_setCustomVar", 2, "autoformat", options.autoformat.toString(), 2]);
            _gaq.push(["_setCustomVar", 3, "jslint_happy", options.jslint_happy.toString(), 2]);
            _gaq.push(["_setCustomVar", 4, "theme", options.theme.toString(), 2]);
            _gaq.push(["_setCustomVar", 4, "font", options.font.toString(), 2]);
            _gaq.push(["_setCustomVar", 5, "indent", options.indent_size + " " + (options.indent_size == 1 ? "tab" : "spaces"), 2]);
        }
    });
}

chrome.storage.onChanged.addListener(function(changes, areaName) {
    console.info("chrome.storage.onChanged", changes, areaName);
    getOptions();
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    var tabId = sender.tab ? sender.tab.id : null;

    switch (message.action) {
        case "get_options":
            sendResponse(options);
            break;
        case "found":
            _gaq.push(["_trackEvent", message.type, message.action]);
            break;
        case "beautify":
            _gaq.push(["_trackEvent", message.type, message.action, message.duration]);
            break;
        case "insert_base_css":
            chrome.tabs.insertCSS(tabId, {
                file: "codemirror/lib/codemirror.css"
            }, function() {
                chrome.tabs.insertCSS(tabId, {
                    file: "content-script.css"
                }, sendResponse);
            });
            return true;
        case "insert_theme":
            chrome.tabs.insertCSS(tabId, {
                file: "codemirror/theme/" + message.theme + ".css"
            }, sendResponse);
            return true;
        case "insert_css":
            chrome.tabs.insertCSS(tabId, {
                code: message.css
            }, sendResponse);
            return true;
    }
});

getOptions(true);

/* Google Analytics */
_gaq.push(['_setAccount', 'UA-37085142-2']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();
