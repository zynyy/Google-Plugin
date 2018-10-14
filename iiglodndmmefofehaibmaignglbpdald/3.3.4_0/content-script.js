/* globals chrome, CodeMirror, js_beautify, css_beautify, unpacker_filter */

var MODE_LANGUAGE_MAP = {
    "text/css": "CSS",
    "text/x-less": "LESS",
    "text/x-scss": "SCSS",
    "text/x-sass": "SASS",
    "text/x-markdown": "Markdown",
    "text/javascript": "JavaScript",
    "text/jsx": "JSX",
    "text/typescript": "TypeScript",
    "application/json": "JSON"
};

function CodeBeautifier(options) {
    var body = document.body;
    var sourcePre = body.firstChild;
    var code = sourcePre.textContent;
    var ext = location.pathname.substring(location.pathname.lastIndexOf(".") + 1).toLowerCase();
    var mode;
    var lang;
    var start;

    if (!/^(json|jsx|js|ts|less|scss|sass|css|md)$/.test(ext)) {
        ext = location.href.substring(location.origin.length).match(/(json|jsx|js|ts|less|scss|sass|css|md)(\?|&|$)/i);
        ext = ext ? ext[1] : undefined;
    }

    if (!ext) {
        return;
    }

    if (options.exclude_json && ext === "json") {
        return;
    }

    switch (ext) {
        case "css":
            mode = "text/css";
            break;
        case "less":
        case "scss":
        case "sass":
            mode = "text/x-" + ext;
            break;
        case "js":
            mode = "text/javascript";
            break;
        case "jsx":
            mode = "text/jsx";
            break;
        case "ts":
            mode = "text/typescript";
            break;
        case "json":
            mode = "application/json";
            break;
        case "md":
            mode = "text/x-markdown";
            break;
    }

    lang = MODE_LANGUAGE_MAP[mode];

    chrome.runtime.sendMessage({
        action: "found",
        type: lang
    });

    console.group("[Code Beautifier] File Type: " + lang);
    console.log("Options:", options);

    function bindEvents() {
        var activeline;

        function removeActiveline() {
            if (activeline) {
                activeline.classList.remove("CodeMirror-activeline", "CodeMirror-activeline-background");
                activeline.cells[0].classList.add("CodeMirror-activeline-gutter");
                activeline = null;
            }
        }

        document.addEventListener("click", function(event) {
            var tr = event.target.closest("tr");

            if (!tr || window.getSelection().toString()) return;

            removeActiveline();

            tr.classList.add("CodeMirror-activeline", "CodeMirror-activeline-background");
            tr.cells[0].classList.add("CodeMirror-activeline-gutter");

            activeline = tr;
        }, false);

        document.addEventListener("dblclick", removeActiveline, false);

        document.addEventListener("selectstart", removeActiveline, false);
    }

    function beautify() {
        body.classList.add("processing");

        bar.innerHTML = "<span>Beautify…</span>";

        start = window.performance.now();
        console.time("Total");
        console.time("Format");

        if (typeof css_beautify === "function") {
            if (mode !== "text/x-sass") code = css_beautify(code, options);
        } else if (typeof js_beautify === "function") {
            if (mode === "text/jsx") options.e4x = true;
            code = js_beautify(options.detect_packers ? unpacker_filter(code) : code, options);
        }

        console.timeEnd("Format");
        console.time("Highlight");

        var cmWrapper = document.createElement("div");
        cmWrapper.className = "CodeMirror CodeMirror-wrap cm-s-" + options.theme.split(" ").join(" cm-s-");
        if (options.font !== "default") cmWrapper.style.fontFamily = "'" + options.font + "', monospace";

        var cmLines = document.createElement("div");
        cmLines.className = "CodeMirror-lines";

        var cmCode = document.createElement("table");
        cmCode.className = "CodeMirror-code";

        var colGroup = document.createElement("colgroup");
        var colNumber = document.createElement("col");
        var colContent = document.createElement("col");

        colNumber.className = "line-number";
        colContent.className = "line-content";
        colGroup.appendChild(colNumber);
        colGroup.appendChild(colContent);
        cmCode.appendChild(colGroup);

        var cmGutters = document.createElement("div");
        cmGutters.className = "CodeMirror-gutters";
        cmGutters.innerHTML = "<div class='CodeMirror-gutter CodeMirror-linenumbers'><div class='CodeMirror-linenumber''></div></div>";

        var tabSize = options.indent_size;
        var tabChar = options.indent_char;
        var col = 0;

        var lineNumber = 0;
        var frag = document.createDocumentFragment();
        var row, lineNumCell, lineNumEl, lineCntCell, pre;

        function appendLine(contents) {
            lineNumber++;

            row = cmCode.insertRow();

            lineNumCell = row.insertCell(0);
            lineNumCell.className = "CodeMirror-gutter-wrapper";

            lineNumEl = document.createElement("div");
            lineNumEl.dataset.n = lineNumber;
            lineNumEl.className = "CodeMirror-linenumber CodeMirror-gutter-elt";
            lineNumCell.appendChild(lineNumEl);

            lineCntCell = row.insertCell(1);
            lineCntCell.className = "CodeMirror-line";

            if (contents.childNodes.length !== 0) {
                pre = document.createElement("pre");
                pre.appendChild(contents);
                lineCntCell.appendChild(pre);
            }

            frag = document.createDocumentFragment();
        }

        CodeMirror.runMode(code, mode, function(text, style) {
            if (text == "\n") {
                appendLine(frag);
                col = 0;
                return;
            }
            var content = "";
            // replace tabs
            for (var pos = 0;;) {
                var idx = text.indexOf("\t", pos);
                if (idx == -1) {
                    content += text.slice(pos);
                    col += text.length - pos;
                    break;
                } else {
                    col += idx - pos;
                    content += text.slice(pos, idx);
                    var size = tabSize - col % tabSize;
                    col += size;
                    for (var i = 0; i < size; ++i) content += tabChar;
                    pos = idx + 1;
                }
            }

            if (style) {
                var sp = document.createElement("span");
                sp.className = "cm-" + style.replace(/ +/g, " cm-");
                sp.appendChild(document.createTextNode(content));
                frag.appendChild(sp);
            } else {
                frag.appendChild(document.createTextNode(content));
            }
        });
        appendLine(frag);

        cmGutters.querySelector(".CodeMirror-linenumber").dataset.n = lineNumber;
        cmWrapper.appendChild(cmGutters);
        cmLines.appendChild(cmCode);
        cmWrapper.appendChild(cmLines);

        console.timeEnd("Highlight");
        console.time("Insert Theme");

        chrome.runtime.sendMessage({
            action: "insert_theme",
            theme: options.theme.split(" ")[0]
        }, function() {
            console.timeEnd("Insert Theme");

            body.removeChild(sourcePre);
            body.appendChild(cmWrapper);
            body.className = "CodeBeautifier";

            var gutterOuterWidth = cmGutters.offsetWidth;
            var gutterInnerWidth = cmGutters.querySelector(".CodeMirror-linenumbers").offsetWidth;
            colNumber.style.width = gutterOuterWidth + "px";

            console.time("Insert CSS");
            chrome.runtime.sendMessage({
                action: "insert_css",
                css: ".CodeMirror-code .CodeMirror-linenumber { margin-right: " + (gutterOuterWidth - gutterInnerWidth) / 2 + "px }"
            }, function() {
                console.timeEnd("Insert CSS");
                console.timeEnd("Total");
                console.groupEnd();

                chrome.runtime.sendMessage({
                    action: "beautify",
                    type: lang,
                    duration: (window.performance.now() - start).toFixed()
                });

                bindEvents();
            });
        });
    }

    var bar = document.createElement("div");
    bar.id = "infobar";

    var bar_text = document.createElement("span");
    bar_text.className = "desc";

    if (options.autoformat) {
        bar_text.textContent = "Beautify…";
        bar.appendChild(bar_text);
    } else {
        bar_text.textContent = "This looks like a " + lang + " file.";

        var btn_yes = document.createElement("button");
        btn_yes.textContent = "Beautify Now!";
        btn_yes.onclick = function() {
            beautify(bar);
        };

        var btn_no = document.createElement("button");
        btn_no.textContent = "No, thanks.";

        var btn_close = document.createElement("button");
        btn_close.className = "close";
        btn_close.innerHTML = "<span></span>";

        btn_no.onclick = btn_close.onclick = function() {
            body.className = "";
            chrome.runtime.sendMessage({
                action: "reject",
                type: lang
            });
            console.groupEnd();
        };

        bar.appendChild(bar_text);
        bar.appendChild(btn_yes);
        bar.appendChild(btn_no);
        bar.appendChild(btn_close);
    }

    body.insertBefore(bar, body.firstChild);

    bar.addEventListener("webkitTransition" in body.style ? "webkitTransitionEnd" : "transitionEnd", function() {
        if (body.className === "CodeBeautifier" || body.className === "") body.removeChild(bar);
    }, false);

    setTimeout(function() {
        body.className = "showInfobar";
        if (options.autoformat) {
            beautify();
            chrome.runtime.sendMessage({
                action: "autoformat",
                type: lang
            });
        }
    }, 100);
}

if (document.body.firstChild.tagName === "PRE") {
    chrome.runtime.sendMessage({
        action: "get_options"
    }, function(options) {
        if (!options) throw new Error("Failed to load options.");

        chrome.runtime.sendMessage({
            action: "insert_base_css"
        }, function() {
            CodeBeautifier(options);
        });
    });
}
