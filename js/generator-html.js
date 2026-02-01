/**
 * HTMLBuilder
 */
const HTMLBuilder = {
    build: function(studentName, questions, instructions, examTitle, logoData, solutionDataUrl, duration, unlockCodeHash, parts, teacherEmail, driveLink, projectData) {
        
        const tabsHTML = parts.map((p, idx) => `<button class="tab-btn ${idx===0?'active':''}" onclick="showPart('${p.id}')">${p.name}</button>`).join('');

        const sectionsHTML = parts.map((p, idx) => {
            const partQuestions = questions.filter(q => q.part === p.id);
            const partInstrHtml = instructions.parts[p.id] ? `<div class="part-instructions">${instructions.parts[p.id].replace(/\n/g, '<br>')}</div>` : '';
            
            let qHtml = '';
            if(partQuestions.length === 0) {
                qHtml = '<p style="text-align:center; color:#95a5a6; padding:20px;">אין שאלות בחלק זה</p>';
            } else {
                qHtml = partQuestions.map((q, qIdx) => {
                    const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl, q.videoOptions);
                    let vid = embedSrc ? `<div class="video-wrapper"><div class="video-shield"></div><iframe sandbox="allow-scripts allow-same-origin allow-presentation" src="${embedSrc}" frameborder="0"></iframe></div>` : '';
                    const imgSrc = Utils.getImageSrc(q.imageUrl);
                    let img = imgSrc ? `<div class="image-wrapper"><img src="${imgSrc}" alt="Question Image"></div>` : '';

                    let interactionHTML = '';
                    let gradingHTML = '';
                    let modelAnsHtml = '';

                    if (q.subQuestions && q.subQuestions.length > 0) {
                        interactionHTML = q.subQuestions.map((sq, si) => {
                            const label = ExamState.subLabels[si] || (si + 1);
                            const sqModelAns = sq.modelAnswer ? `<div class="model-answer-secret" style="display:none; margin-top:5px; background:#fff3cd; color:#856404; padding:5px; border-radius:4px; font-size:0.9em; border:1px solid #ffeeba;"><strong>מחוון (${label}'):</strong> <span class="model-ans-text-content">${sq.modelAnswer}</span></div>` : '';
                            return `
                            <div class="sub-question-block" data-points="${sq.points}" style="margin-top:20px; border-right:3px solid #eee; padding-right:15px;">
                                <div class="sub-q-title" style="font-weight:bold; color:#3498db; margin-bottom:5px;">סעיף ${label}' (${sq.points} נק')</div>
                                <div class="sub-q-text" id="q-text-${q.id}-${si}">${sq.text}</div>
                                <div class="answer-area" style="margin-top:10px;">
                                    <textarea class="student-ans" id="student-ans-${q.id}-${si}" placeholder="תשובה לסעיף ${label}'..." onpaste="return false;" style="height:10vh;"></textarea>
                                </div>
                                <div class="grading-area">
                                    <div style="display:flex; align-items:center; gap:1vw;">
                                        <label>ניקוד:</label>
                                        <input type="number" class="grade-input" id="grade-input-${q.id}-${si}" min="0" max="${sq.points}" oninput="calcTotal()" disabled>
                                        <span class="grade-max">מתוך ${sq.points}</span>
                                    </div>
                                    <input type="text" class="teacher-comment" id="comment-input-${q.id}-${si}" placeholder="הערה מילולית..." disabled style="width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                                    ${sqModelAns}
                                </div>
                            </div>`;
                        }).join('');
                    } else {
                        modelAnsHtml = q.modelAnswer ? `<div class="model-answer-secret" style="display:none; margin-top:15px; background:#fff3cd; color:#856404; padding:10px; border-radius:5px; border:1px solid #ffeeba;"><strong>🔑 תשובה לדוגמא (למורה):</strong><br><div style="white-space:pre-wrap; margin-top:5px;" id="model-ans-text-${q.id}" class="model-ans-text-content">${q.modelAnswer}</div></div>` : '';
                        interactionHTML = `<div class="answer-area"><label>תשובה:</label><textarea class="student-ans" id="student-ans-${q.id}" placeholder="כתוב את תשובתך כאן..." onpaste="return false;"></textarea></div>`;
                        gradingHTML = `
                        <div class="grading-area">
                            <div style="display:flex; align-items:center; gap:1vw;">
                                <label>ניקוד:</label>
                                <input type="number" class="grade-input" id="grade-input-${q.id}" min="0" max="${q.points}" oninput="calcTotal()" disabled>
                                <span class="grade-max">מתוך ${q.points}</span>
                            </div>
                            <input type="text" class="teacher-comment" id="comment-input-${q.id}" placeholder="הערה מילולית למורה..." disabled style="width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                            ${modelAnsHtml}
                        </div>`;
                    }

                    return `<div class="q-block" id="question-block-${q.id}">
                        <div class="q-header">
                            <span class="q-points">(${q.points} נק' סה"כ)</span>
                            <strong id="q-label-${q.id}">שאלה ${qIdx+1}:</strong>
                        </div>
                        <div class="q-content" id="q-main-text-${q.id}">${q.text}</div>
                        ${img}${vid}
                        ${interactionHTML}
                        ${gradingHTML}
                    </div>`;
                }).join('');
            }
            return `<div id="part-${p.id}" class="exam-section ${idx===0?'active':''}">
                <h2 style="color:#2c3e50; border-bottom:0.3vh solid #3498db; font-weight: 700; padding-bottom:1vh; margin-bottom:3vh;">${p.name}</h2>
                ${partInstrHtml}${qHtml}</div>`;
        }).join('');

        const globalInstructionsHTML = instructions.general ? `<div class="instructions-box global-instructions"><h3>הנחיות כלליות</h3><div class="instructions-text">${instructions.general}</div></div>` : '';
        const logoHTML = logoData ? `<img src="${logoData}" alt="Logo" class="school-logo">` : '';
        const embeddedProjectData = projectData ? `<script type="application/json" id="exam-engine-data">${JSON.stringify(projectData).replace(/<\/script>/g, '<\\/script>')}</script>` : '';

        return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>מבחן - ${studentName}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"><style>
        :root{--primary:#2c3e50;--accent:#3498db;--success:#27ae60;--danger:#e74c3c;}
        body{font-family:'Rubik',sans-serif;background:#f4f6f8;margin:0;padding:2%;color:#2c3e50;font-size:18px;line-height:1.5;} 
        .container{max-width:800px;margin:0 auto;background:white;padding:5%;border-radius:1em;box-shadow:0 1vh 3vh rgba(0,0,0,0.05);}
        textarea{width:100%;height:20vh;padding:2vh;border:1px solid #ccc;border-radius:0.8em;font-family:inherit;font-size:1rem;}
        button{cursor:pointer;}
        .tab-btn{padding:10px 20px;background:#eee;border:none;margin:5px;border-radius:20px;font-size:1rem;}
        .tab-btn.active{background:var(--accent);color:white;}
        .exam-section{display:none;}
        .exam-section.active{display:block;}
        .part-instructions { background: #e8f6f3; border-right: 4px solid #1abc9c; padding: 15px; margin-bottom: 20px; border-radius: 4px; color: #16a085; font-size: 1.05em; line-height: 1.5; display: block !important; width: 100%; box-sizing: border-box; }
        .school-logo { display: block; margin: 0 auto 20px auto; max-width: 200px; max-height: 150px; width: auto; height: auto; object-fit: contain; }
        
        .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; width: 100%; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        .video-shield { position: absolute; top: 0; left: 0; width: 100%; height: 15%; z-index: 10; background: transparent; }
        .image-wrapper { text-align: center; margin: 20px 0; width: 100%; }
        .image-wrapper img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: block; margin: 0 auto; }

        .teacher-controls { background: #fdf2e9; padding: 15px; border: 1px solid #f39c12; border-radius: 8px; margin-bottom: 20px; }
        .grading-area { display: none; margin-top: 15px; background: #fafafa; padding: 10px; border-top: 2px solid #bdc3c7; }
        .grade-input { width: 60px; padding: 5px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; }
        .teacher-comment { background: #fff; }
        .model-answer-secret { margin-top: 10px; border: 1px dashed #f39c12; padding: 10px; background: #fffdf5; border-radius: 4px; font-size: 0.9em; color: #555; }
        
        .sound-check-box { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); padding: 15px; border-radius: 8px; margin-bottom: 30px; max-width: 600px; text-align: center; }
        .sound-check-text { font-size: 0.95em; margin-bottom: 15px; color: #ecf0f1; line-height: 1.5; }
        .sound-btn { background: #3498db; border: none; padding: 10px 25px; border-radius: 5px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto; font-size: 1.1em; transition: background 0.2s, transform 0.1s; width: auto; }
        .sound-btn:hover { background: #2980b9; }
        .sound-btn.playing { background: #e74c3c; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        #highlighterTool { position: fixed; top: 150px; right: 20px; width: 50px; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border-radius: 30px; padding: 15px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 10000; border: 1px solid #ddd; transition: opacity 0.3s; }
        .color-btn { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .color-btn:hover { transform: scale(1.2); }
        .color-btn.active { border-color: #333; transform: scale(1.1); box-shadow: 0 0 0 2px #333; }
        .drag-handle { cursor: move; color: #ccc; font-size: 20px; line-height: 10px; margin-bottom: 5px; user-select: none; }
        
        #startScreen,#timesUpModal,#securityModal,#successModal{position:fixed;top:0;left:0;width:100%;height:100%;background:#2c3e50;color:white;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:9999;}#timesUpModal,#securityModal,#successModal{display:none;}
        #timerBadge{position:fixed;top:10px;left:10px;background:white;color:black;padding:10px;border-radius:20px;border:2px solid #2c3e50;font-weight:bold;z-index:5000;display:none;}
        #securityModal h2, #timesUpModal h2 { font-size: 3rem; margin-bottom: 10px; color: #e74c3c; }
        </style></head><body>
        ${embeddedProjectData}
        <div id="highlighterTool"><div class="drag-handle" id="hlDragHandle">:::</div><div class="color-btn" style="background:#ffeb3b;" onclick="setMarker('#ffeb3b', this)" title="צהוב"></div><div class="color-btn" style="background:#a6ff00;" onclick="setMarker('#a6ff00', this)" title="ירוק"></div><div class="color-btn" style="background:#ff4081;" onclick="setMarker('#ff4081', this)" title="ורוד"></div><div class="color-btn" style="background:#00e5ff;" onclick="setMarker('#00e5ff', this)" title="תכלת"></div><div class="color-btn" style="background:#fff; border:1px solid #ccc; display:flex; justify-content:center; align-items:center; font-size:12px;" onclick="setMarker(null, this)" title="בטל מרקר">❌</div></div>

        <div id="startScreen">
            <h1>${examTitle}</h1>
            <p style="font-size: 1.2em; margin-bottom: 20px;">משך הבחינה: ${duration} דקות</p>
            <div class="sound-check-box">
                <p class="sound-check-text">
                    🔊 <strong>בדיקת שמע:</strong><br>
                    חברו את האוזניות למחשב ובדקו אם יש סאונד.<br>
                    אם הוא חלש מידי, הגבירו אותו <u>לפני</u> כניסתכם למבחן דרך הגדרות המחשב.<br>
                    אם אין סאונד - קראו למורה. <br>
                    <span style="color:#f1c40f; font-size:0.9em; display:block; margin-top:5px; font-weight:bold;">
                        ⚠️ שימו לב: אין אפשרות להגביר את המחשב מתוך ההגדרות במהלך הבחינה (יציאה ממסך מלא תנעל את המבחן!)
                    </span>
                </p>
                <button id="soundCheckBtn" class="sound-btn" onclick="toggleSoundCheck()">
                    <span>▶️ נגן צליל בדיקה</span>
                </button>
            </div>
            <p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">יציאה ממסך מלא או מעבר לחלון אחר ינעלו את המבחן!</p>
            <button onclick="startExamTimer()" style="padding:15px 30px;font-size:1.5em;background:#27ae60;color:white;border:none;border-radius:10px;">התחל בחינה (מסך מלא)</button>
        </div>
        
        <div id="timerBadge">זמן: <span id="timerText">--:--</span></div><div id="timesUpModal"><h2>הזמן נגמר!</h2><button onclick="submitExam()">הגש בחינה</button></div><div id="securityModal"><h2>המבחן ננעל!</h2><p style="font-size: 1.5rem;">יצאת ממסך מלא או עברת לחלון אחר.</p><input type="password" id="teacherCodeInput" placeholder="קוד מורה לשחרור"><button onclick="unlockExam()">שחרר</button></div>
        
        <div id="successModal">
            <h1>המבחן הוגש בהצלחה!</h1>
            <p>הקובץ נשמר במחשבך.</p>
            <div id="submissionActions"></div>
            <div style="margin-top:30px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.3);">
                <button onclick="enableGradingFromModal()" style="background: transparent; border: 1px solid #fff; color: #fff; padding: 10px 20px; border-radius: 5px;">👨‍🏫 מורה? לחץ כאן לבדיקה</button>
            </div>
        </div>
        
        <div class="container" id="mainContainer" style="filter:blur(5px);">
            <div style="text-align:center;">${logoHTML}<h1>${examTitle}</h1></div>
            <div class="teacher-controls" style="display:none;">
                <h3 style="margin-top:0; color:#d35400;">👨‍🏫 אזור בדיקה וציינון</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div style="font-size: 1.2em; font-weight: bold;">ציון סופי מחושב: <span id="teacherCalculatedScore" style="color: var(--success); font-size:1.4em;">0</span></div>
                    <div>
                        <button onclick="saveGradedExam()" style="background:#27ae60;color:white;padding:10px 20px;border:none;border-radius:5px; margin-left: 10px; font-weight:bold;">💾 שמור בדיקה (HTML)</button>
                        <button onclick="exportToDoc()" style="background:#2980b9;color:white;padding:10px 20px;border:none;border-radius:5px; font-weight:bold;">📄 הורד סיכום (DOCX)</button>
                    </div>
                </div>
            </div>
            <div style="background:#fff;padding:20px;border:1px solid var(--accent);border-radius:10px;margin-bottom:20px;"><label>שם תלמיד:</label><input type="text" id="studentNameField" value="${studentName}" style="width:100%;padding:10px;"></div>
            ${globalInstructionsHTML}
            <div class="tabs">${tabsHTML}</div>
            <form id="examForm">${sectionsHTML}</form>
            <div id="teacherSolutionContainer" style="display:none;margin-top:40px;border-top:2px dashed orange;padding-top:20px;"><h2>קובץ פתרון</h2><iframe id="solutionFrame" style="width:100%;height:600px;border:1px solid #ddd;"></iframe></div>
            <div style="text-align:center;margin-top:50px;border-top:1px solid #eee;padding-top:20px;">
                <div class="student-submit-area"><br><button onclick="submitExam()" style="background:#27ae60;color:white;padding:15px 30px;font-size:1.2em;border:none;border-radius:30px;">הגש בחינה</button></div>
            </div>
        </div>
        <script>
        let totalTime=${duration}*60,timerInterval,examStarted=false;
        function simpleHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h<<5)-h+s.charCodeAt(i)|0;return h.toString();}
        window.onload = function() {
            if(document.body.dataset.status === 'submitted') {
                document.getElementById('startScreen').style.display='none';
                document.getElementById('mainContainer').style.filter='none';
                document.getElementById('timerBadge').style.display='none';
                document.getElementById('successModal').style.display='flex';
                document.querySelectorAll('input,textarea').forEach(e=>{
                    if(!e.classList.contains('grade-input') && !e.classList.contains('teacher-comment') && e.id !== 'teacherCodeInput') {
                        e.setAttribute('readonly','true');
                        e.disabled = true;
                    }
                });
                document.querySelector('.student-submit-area').style.display='none';
            }
        };
        let audioCtx = null;
        let isPlayingSound = false;
        let soundLoopTimeout;
        function toggleSoundCheck() {
            const btn = document.getElementById('soundCheckBtn');
            if (isPlayingSound) {
                stopSoundCheck();
                btn.innerHTML = '<span>▶️ נגן צליל בדיקה</span>';
                btn.classList.remove('playing');
            } else {
                playSoundCheck();
                btn.innerHTML = '<span>⏹️ עצור צליל</span>';
                btn.classList.add('playing');
            }
            isPlayingSound = !isPlayingSound;
        }
        function stopSoundCheck() {
            if(audioCtx) {
                audioCtx.close().then(() => { audioCtx = null; });
            } else {
                 clearTimeout(soundLoopTimeout);
            }
            clearTimeout(soundLoopTimeout);
        }
        function playSoundCheck() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const playNote = (freq, time, duration) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.frequency.value = freq;
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(time);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.05); 
                gain.gain.exponentialRampToValueAtTime(0.001, time + duration); 
                osc.stop(time + duration);
            };
            const now = audioCtx.currentTime;
            playNote(440, now, 0.4);       
            playNote(554.37, now + 0.2, 0.4); 
            playNote(659.25, now + 0.4, 0.6); 
            soundLoopTimeout = setTimeout(() => {
                if(isPlayingSound) playSoundCheck();
            }, 1200);
        }
        function startExamTimer(){
            stopSoundCheck(); 
            document.documentElement.requestFullscreen().catch(e=>console.log(e));
            document.getElementById('startScreen').style.display='none';
            document.getElementById('mainContainer').style.filter='none';
            document.getElementById('timerBadge').style.display='block';
            examStarted=true;
            runTimer();
            updateTimer();
        }
        function runTimer(){clearInterval(timerInterval);timerInterval=setInterval(()=>{totalTime--;updateTimer();if(totalTime<=0){clearInterval(timerInterval);document.getElementById('timesUpModal').style.display='flex';}},1000);}
        function updateTimer(){let m=Math.floor(totalTime/60),s=totalTime%60;document.getElementById('timerText').innerText=(m<10?'0'+m:m)+':'+(s<10?'0'+s:s);}
        function showPart(id){document.querySelectorAll('.exam-section').forEach(e=>e.classList.remove('active'));document.getElementById('part-'+id).classList.add('active');document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');}
        function calcTotal(){
            let t=0;
            document.querySelectorAll('.grade-input').forEach(i=>{
                if(i.value) t += parseFloat(i.value);
            });
            const display = document.getElementById('teacherCalculatedScore');
            if(display) display.innerText = t;
        }
        let markerColor = null;
        function setMarker(color, btn) {
            markerColor = color;
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            if(color) {
                const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="\${color}" stroke="black" stroke-width="1" d="M28.06 6.94L25.06 3.94a2.003 2.003 0 0 0-2.83 0l-16.17 16.17a2.003 2.003 0 0 0-.58 1.41V26h4.48c.53 0 1.04-.21 1.41-.59l16.17-16.17c.79-.78.79-2.05.52-2.3zM8.5 24H7v-1.5l14.5-14.5 1.5 1.5L8.5 24z"/><path fill="\${color}" d="M4 28l4-4H4z"/></svg>\`;
                const url = 'data:image/svg+xml;base64,' + btoa(svg);
                document.body.style.cursor = \`url('\${url}') 0 32, auto\`;
            } else {
                document.body.style.cursor = 'default';
            }
        }
        document.addEventListener('mouseup', () => {
            if (!markerColor) return;
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const common = range.commonAncestorContainer;
                if(common.nodeType === 1 && (common.closest('#highlighterTool') || common.tagName === 'TEXTAREA' || common.tagName === 'INPUT')) return;
                if(common.nodeType === 3 && (common.parentNode.closest('#highlighterTool') || common.parentNode.tagName === 'TEXTAREA')) return;
                document.designMode = "on";
                if(document.queryCommandEnabled("hiliteColor")) {
                    document.execCommand("styleWithCSS", false, true);
                    document.execCommand("hiliteColor", false, markerColor);
                }
                document.designMode = "off";
                sel.removeAllRanges();
            }
        });
        const tool = document.getElementById('highlighterTool');
        const handle = document.getElementById('hlDragHandle');
        let isDragging = false, startX, startY, initialLeft, initialTop;
        handle.onmousedown = function(e) {
            e.preventDefault(); isDragging=true; startX=e.clientX; startY=e.clientY; initialLeft=tool.offsetLeft; initialTop=tool.offsetTop;
            document.onmouseup = function(){isDragging=false; document.onmouseup=null; document.onmousemove=null;};
            document.onmousemove = function(e){if(!isDragging)return; tool.style.top=(initialTop+e.clientY-startY)+"px"; tool.style.left=(initialLeft+e.clientX-startX)+"px"; tool.style.right='auto';};
        };
        function lockExam(){ clearInterval(timerInterval); document.getElementById('securityModal').style.display='flex'; }
        function checkSec(){ if(!examStarted||document.body.dataset.status==='submitted')return; if(document.hidden){lockExam();} }
        document.addEventListener('visibilitychange',checkSec);
        document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && examStarted && document.body.dataset.status!=='submitted') { lockExam(); } });
        function unlockExam(){ if(simpleHash(document.getElementById('teacherCodeInput').value)==="${unlockCodeHash}"){ document.getElementById('securityModal').style.display='none'; document.documentElement.requestFullscreen().catch(e=>console.log(e)); runTimer(); } else { alert('קוד שגוי'); } }
        function submitExam(){
            document.body.dataset.status='submitted';
            if(document.fullscreenElement) document.exitFullscreen();
            clearInterval(timerInterval); document.getElementById('timerBadge').style.display='none';
            document.querySelectorAll('input,textarea').forEach(e=>{e.setAttribute('value',e.value); if(!e.classList.contains('grade-input')&&!e.classList.contains('teacher-comment')) { e.setAttribute('readonly','true'); e.disabled=true; } });
            document.querySelectorAll('textarea').forEach(t=>t.innerHTML=t.value);
            const html="<!DOCTYPE html>"+document.documentElement.outerHTML;
            const b=new Blob([html],{type:'text/html'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download="פתור-"+(document.getElementById('studentNameField').value||'תלמיד')+".html"; a.click();
            document.getElementById('successModal').style.display='flex';
            const acts=document.getElementById('submissionActions');
            if("${teacherEmail}"){const l="https://mail.google.com/mail/?view=cm&to=${teacherEmail}&su=Exam Submission&body=Attached";acts.innerHTML+='<a href="'+l+'" target="_blank" style="display:block;margin:10px;padding:10px;background:#3498db;color:white;text-decoration:none;">שלח במייל (צרף קובץ!)</a>';}
            if("${driveLink}"){acts.innerHTML+='<a href="${driveLink}" target="_blank" style="display:block;margin:10px;padding:10px;background:#f1c40f;color:black;text-decoration:none;">העלה לדרייב</a>';}
        }
        function enableGradingFromModal() {
             if(simpleHash(prompt('הכנס קוד מורה:'))==="${unlockCodeHash}") {
                 document.getElementById('successModal').style.display='none';
                 enableGradingUI();
             } else { alert('קוד שגוי'); }
        }
        function enableGrading() { 
             if(simpleHash(prompt('Code?'))==="${unlockCodeHash}") { enableGradingUI(); }
        }
        function enableGradingUI() {
            document.querySelector('.teacher-controls').style.display='block';
            document.querySelectorAll('.grading-area').forEach(e=>e.style.display='block');
            document.querySelectorAll('.grade-input, .teacher-comment').forEach(e=>e.disabled=false);
            document.querySelectorAll('.model-answer-secret').forEach(e=>e.style.display='block');
            document.querySelector('.student-submit-area').style.display='none';
            document.body.dataset.status = 'grading';
            document.querySelectorAll('.exam-section').forEach(e=>e.style.display='block');
            document.querySelector('.tabs').style.display='none';
            if("${solutionDataUrl}"){
                document.getElementById('teacherSolutionContainer').style.display='block';
                document.getElementById('solutionFrame').src="${solutionDataUrl}";
            }
        }
        function saveGradedExam(){
            document.querySelectorAll('input,textarea').forEach(i=>i.setAttribute('value',i.value));
            document.querySelectorAll('textarea').forEach(t=>t.innerHTML=t.value);
            const html="<!DOCTYPE html>"+document.documentElement.outerHTML;
            const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); 
            a.download="בדוק-"+document.getElementById('studentNameField').value+".html"; a.click();
        }
        function exportToDoc() {
            const studentName = document.getElementById('studentNameField').value || 'תלמיד';
            const finalScore = document.getElementById('teacherCalculatedScore').innerText || '0';
            let content = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
            content += '<head><meta charset="utf-8"><title>מבחן בדוק</title>';
            content += '<style>body{font-family: Arial, sans-serif; direction: rtl;} table{width:100%; border-collapse: collapse;} td, th{border: 1px solid #999; padding: 10px;} .q-box{border: 1px solid #ccc; padding: 10px; margin-bottom: 20px;} .teacher-feedback{background: #f0f8ff; padding: 5px; margin-top: 5px; border: 1px solid #3498db;}</style></head><body>';
            content += '<h1 style="text-align:center;">' + document.querySelector('h1').innerText + '</h1>';
            content += '<h2>שם התלמיד: ' + studentName + '</h2>';
            content += '<h3>ציון סופי: <span style="color:red">' + finalScore + '</span></h3><hr>';
            const blocks = document.querySelectorAll('.q-block, .sub-question-block');
            blocks.forEach((block, idx) => {
                const isSub = block.classList.contains('sub-question-block');
                const textDiv = block.querySelector('.q-content') || block.querySelector('.sub-q-text');
                const text = textDiv ? textDiv.innerText : 'שאלה ' + (idx+1);
                const ansArea = block.querySelector('.student-ans');
                const answer = ansArea ? ansArea.value : '(אין תשובה)';
                const gradeInp = block.querySelector('.grade-input');
                const grade = gradeInp ? gradeInp.value : '0';
                const maxPoints = block.dataset.points || block.querySelector('.grade-max')?.innerText.replace(/\D/g,'') || '';
                const commentInp = block.querySelector('.teacher-comment');
                const comment = commentInp ? commentInp.value : '';
                content += '<div class="q-box">';
                content += '<p><strong>' + (isSub ? 'סעיף' : 'שאלה') + ':</strong> ' + text + '</p>';
                content += '<p><strong>תשובת התלמיד:</strong><br>' + answer.replace(/\\n/g, '<br>') + '</p>';
                if(grade || comment) {
                    content += '<div class="teacher-feedback">';
                    content += '<p><strong>ציון:</strong> ' + grade + (maxPoints ? ' מתוך ' + maxPoints : '') + '</p>';
                    if(comment) content += '<p><strong>הערת המורה:</strong> ' + comment + '</p>';
                    content += '</div>';
                }
                content += '</div>';
            });
            content += '</body></html>';
            const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'בדוק-' + studentName + '.doc'; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        <\/script></body></html>`;
    }
};