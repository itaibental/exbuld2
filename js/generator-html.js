const HTMLBuilder = {
    createMarkerCursor(color) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="${color}" stroke="black" d="M28.06 6.94L25.06 3.94a2 2 0 0 0-2.83 0l-16.17 16.17a2 2 0 0 0-.58 1.41V26h4.48c.53 0 1.04-.21 1.41-.59l16.17-16.17a2 2 0 0 0 0-2.83z"/></svg>`;
        return `url(data:image/svg+xml;base64,${btoa(svg)}) 0 32, auto`;
    },
    build(studentName, questions, instructions, examTitle, logoData, solutionDataUrl, duration, unlockCodeHash, parts, teacherEmail, driveLink, projectData) {
        const cYellow = this.createMarkerCursor('#ffeb3b');
        const cGreen = this.createMarkerCursor('#a6ff00');
        const cPink = this.createMarkerCursor('#ff4081');
        return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>${examTitle}</title>
        <style>
            body { font-family: 'Rubik', sans-serif; padding: 40px; background: #f4f6f8; }
            .container { max-width: 800px; margin: auto; background: white; padding: 40px; border-radius: 15px; }
            #highlighterTool { position: fixed; top: 100px; right: 20px; display: flex; flex-direction: column; gap: 10px; background: white; padding: 10px; border-radius: 50px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .color-btn { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 1px solid #ddd; }
            #startScreen { position: fixed; inset: 0; background: #2c3e50; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; }
        </style></head><body>
        <div id="startScreen">
            <h1>${examTitle}</h1>
            <button onclick="startFullExam()" style="padding:15px 40px; font-size:20px; cursor:pointer; background:#27ae60; color:white; border:none; border-radius:10px;">התחל בחינה במסך מלא</button>
        </div>
        <div id="highlighterTool">
            <div class="color-btn" style="background:#ffeb3b;" onclick="setMarker('#ffeb3b', '${cYellow}')"></div>
            <div class="color-btn" style="background:#a6ff00;" onclick="setMarker('#a6ff00', '${cGreen}')"></div>
            <div class="color-btn" style="background:#ff4081;" onclick="setMarker('#ff4081', '${cPink}')"></div>
            <div class="color-btn" onclick="setMarker(null, 'default')">❌</div>
        </div>
        <div class="container">
            <h1>${examTitle}</h1>
            <input type="text" id="sName" value="${studentName}" style="width:100%; padding:10px; margin-bottom:20px;">
            \${questions.map(q => `<div class="q-block"><h3>\${q.text}</h3>\${q.subQuestions.map(sq => `<p>\${sq.text}</p><textarea class="ans" style="width:100%; height:80px;"></textarea>`).join('')}</div>`).join('')}
            <button onclick="submitExam()" style="margin-top:40px; padding:15px 40px; background:#27ae60; color:white; border:none; cursor:pointer; border-radius:30px;">הגש מבחן</button>
        </div>
        <script>
            let mColor = null;
            function startFullExam() {
                const doc = document.documentElement;
                if (doc.requestFullscreen) doc.requestFullscreen();
                document.getElementById('startScreen').style.display='none';
            }
            function setMarker(color, cursor) { mColor = color; document.body.style.cursor = cursor; }
            document.addEventListener('mouseup', () => {
                if (!mColor) return;
                const sel = window.getSelection();
                if (sel.rangeCount > 0 && !sel.isCollapsed) {
                    document.designMode = "on";
                    document.execCommand("hiliteColor", false, mColor);
                    document.designMode = "off";
                }
            });
            function submitExam() {
                document.querySelectorAll('textarea').forEach(t => t.innerHTML = t.value);
                const content = "<!DOCTYPE html>" + document.documentElement.outerHTML;
                const blob = new Blob([content], {type: 'text/html'});
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "פתור_" + document.getElementById('sName').value + ".html"; a.click();
                
                const scriptURL = "https://script.google.com/macros/s/AKfycbw_X6TaMh7XbK5GzMETSJq5wxm_CD2ZUwVgMgy53qlImPauEXJjy2TsPXpyZntFuErjTQ/exec";
                const fd = new FormData(); fd.append('fileName', "פתור_" + document.getElementById('sName').value + ".html"); fd.append('fileContent', content);
                fetch(scriptURL, {method:'POST', mode:'no-cors', body:fd});
            }
        </script></body></html>`;
    }
};