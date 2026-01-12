const Generator = {
    generateAndDownload: function() {
        const name = ExamState.studentName || 'תלמיד';
        const duration = UI.elements.examDurationInput.value || 90;
        const unlockCodePlain = UI.elements.unlockCodeInput.value || '1234';
        const unlockCodeHash = Utils.simpleHash(unlockCodePlain);
        const teacherEmail = UI.elements.teacherEmailInput.value.trim();
        const driveLink = UI.elements.driveFolderInput.value.trim();

        const htmlContent = this.buildStudentHTML(name, ExamState.questions, ExamState.instructions, ExamState.examTitle, ExamState.logoData, ExamState.solutionDataUrl, duration, unlockCodeHash, ExamState.parts, teacherEmail, driveLink);
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name} - מבחן.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        UI.showToast('קובץ המבחן הורד בהצלחה!');
    },

    buildStudentHTML: function(studentName, questions, instructions, examTitle, logoData, solutionDataUrl, duration, unlockCodeHash, parts, teacherEmail, driveLink) {
        
        const tabsHTML = parts.map((p, idx) => `<button class="tab-btn ${idx===0?'active':''}" onclick="showPart('${p.id}')">${p.name}</button>`).join('');

        const sectionsHTML = parts.map((p, idx) => {
            const partQuestions = questions.filter(q => q.part === p.id);
            const partInstrHtml = instructions.parts[p.id] ? `<div class="part-instructions">${instructions.parts[p.id]}</div>` : '';
            
            let qHtml = '';
            if(partQuestions.length === 0) {
                qHtml = '<p style="text-align:center; color:#95a5a6; padding:20px;">אין שאלות בחלק זה</p>';
            } else {
                qHtml = partQuestions.map((q, qIdx) => {
                    const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl);
                    let vid = embedSrc ? `<div class="video-wrapper"><div class="video-shield"></div><div class="media-container"><iframe sandbox="allow-scripts allow-same-origin allow-presentation" src="${embedSrc}" frameborder="0"></iframe></div></div>` : '';
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
                            <div class="sub-question-block" style="margin-top:20px; border-right:3px solid #eee; padding-right:15px;">
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
                                    <input type="text" class="teacher-comment" id="comment-input-${q.id}-${si}" placeholder="הערה לסעיף..." disabled>
                                    ${sqModelAns}
                                </div>
                            </div>`;
                        }).join('');
                        
                        gradingHTML = `<div style="margin-top:15px; text-align:left;">
                            <button class="ai-grade-btn" onclick="askAI_Multi('${q.id}', ${q.subQuestions.length})" title="קבל המלצת ציון לכל הסעיפים" disabled>✨ בדיקת כל הסעיפים (AI)</button>
                        </div>`;
                    } else {
                        modelAnsHtml = q.modelAnswer ? `<div class="model-answer-secret" style="display:none; margin-top:15px; background:#fff3cd; color:#856404; padding:10px; border-radius:5px; border:1px solid #ffeeba;"><strong>🔑 תשובה לדוגמא (למורה):</strong><br><div style="white-space:pre-wrap; margin-top:5px;" id="model-ans-text-${q.id}" class="model-ans-text-content">${q.modelAnswer}</div></div>` : '';
                        interactionHTML = `<div class="answer-area"><label>תשובה:</label><textarea class="student-ans" id="student-ans-${q.id}" placeholder="כתוב את תשובתך כאן..." onpaste="return false;"></textarea></div>`;
                        gradingHTML = `<div class="grading-area"><div style="display:flex; align-items:center; gap:1vw;"><label>ניקוד:</label><input type="number" class="grade-input" id="grade-input-${q.id}" min="0" max="${q.points}" oninput="calcTotal()" disabled><span class="grade-max">מתוך ${q.points}</span></div><input type="text" class="teacher-comment" id="comment-input-${q.id}" placeholder="הערה מילולית..." disabled><button class="ai-grade-btn" onclick="askAI('${q.id}', ${q.points})" title="קבל המלצת ציון מ-AI" disabled>✨ AI</button>${modelAnsHtml}</div>`;
                    }

                    return `<div class="q-block"><div class="q-header"><span class="q-points">(${q.points} נק' סה"כ)</span><strong id="q-label-${q.id}">שאלה ${qIdx+1}:</strong></div><div class="q-content" id="q-main-text-${q.id}">${q.text}</div>${img}${vid}${interactionHTML}${gradingHTML}</div>`;
                }).join('');
            }
            return `<div id="part-${p.id}" class="exam-section ${idx===0?'active':''}">
                <h2 style="color:#2c3e50; border-bottom:0.3vh solid #3498db; font-weight: 700; padding-bottom:1vh; margin-bottom:3vh;">${p.name}</h2>
                ${partInstrHtml}${qHtml}</div>`;
        }).join('');

        const globalInstructionsHTML = instructions.general ? `<div class="instructions-box global-instructions"><h3>הנחיות כלליות</h3><div class="instructions-text">${instructions.general}</div></div>` : '';
        const logoHTML = logoData ? `<img src="${logoData}" alt="Logo" class="school-logo">` : '';

        // כאן מוזרק הקוד שרץ אצל התלמיד, כולל מנגנון הנעילה
        return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>מבחן - ${studentName}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"><style>/* Student CSS Here */ :root{--primary:#2c3e50;--accent:#3498db;--success:#27ae60;--danger:#e74c3c;}body{font-family:'Rubik',sans-serif;background:#f4f6f8;margin:0;padding:2%;color:#2c3e50;user-select:none;}.container{max-width:800px;margin:0 auto;background:white;padding:5%;border-radius:1em;box-shadow:0 1vh 3vh rgba(0,0,0,0.05);}textarea{width:100%;height:20vh;padding:2vh;border:1px solid #ccc;border-radius:0.8em;font-family:inherit;}button{cursor:pointer;}.tab-btn{padding:10px 20px;background:#eee;border:none;margin:5px;border-radius:20px;}.tab-btn.active{background:var(--accent);color:white;}.exam-section{display:none;}.exam-section.active{display:block;}#startScreen,#timesUpModal,#securityModal,#successModal{position:fixed;top:0;left:0;width:100%;height:100%;background:#2c3e50;color:white;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:9999;}#timesUpModal,#securityModal,#successModal{display:none;}#timerBadge{position:fixed;top:10px;left:10px;background:white;color:black;padding:10px;border-radius:20px;border:2px solid #2c3e50;font-weight:bold;z-index:5000;display:none;}</style></head><body oncontextmenu="return false;"><div id="startScreen"><h1>${examTitle}</h1><p>משך הבחינה: ${duration} דקות</p><p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">שים לב: המבחן יתבצע במסך מלא.<br>יציאה ממסך מלא או מעבר לחלון אחר ינעלו את המבחן!</p><button onclick="startExamTimer()" style="padding:15px 30px;font-size:1.5em;background:#27ae60;color:white;border:none;border-radius:10px;">התחל בחינה (מסך מלא)</button></div><div id="timerBadge">זמן: <span id="timerText">--:--</span></div><div id="timesUpModal"><h2>הזמן נגמר!</h2><button onclick="submitExam()">הגש בחינה</button></div><div id="securityModal"><h2>המבחן ננעל!</h2><p>יצאת ממסך מלא או עברת לחלון אחר.</p><input type="password" id="teacherCodeInput" placeholder="קוד מורה לשחרור"><button onclick="unlockExam()">שחרר</button></div><div id="successModal"><h1>סיימת!</h1><div id="submissionActions"></div></div><div class="container" id="mainContainer" style="filter:blur(5px);"><div style="text-align:center;">${logoHTML}<h1>${examTitle}</h1></div><div class="teacher-controls" style="display:none;border-bottom:1px solid #ccc;padding-bottom:20px;margin-bottom:20px;"><button onclick="enableGrading()">🔓 כניסת מורה</button><div id="gradingTools" style="display:none;margin-top:10px;"><button onclick="saveGradedExam()" style="background:#27ae60;color:white;padding:5px 10px;border:none;border-radius:5px;">💾 שמור בדיקה</button><button onclick="exportToDoc()" style="background:#3498db;color:white;padding:5px 10px;border:none;border-radius:5px;margin-right:10px;">📄 ייצוא ל-Word</button><div id="apiKeyContainer" style="margin-top:10px;"><label>Gemini API Key:</label><input type="password" id="apiKeyInput" onchange="enableAIButtons()"></div></div></div><div style="background:#fff;padding:20px;border:1px solid var(--accent);border-radius:10px;margin-bottom:20px;"><label>שם תלמיד:</label><input type="text" id="studentNameField" value="${studentName}" style="width:100%;padding:10px;"></div>${globalInstructionsHTML}<div class="tabs">${tabsHTML}</div><form id="examForm">${sectionsHTML}</form><div id="teacherSolutionContainer" style="display:none;margin-top:40px;border-top:2px dashed orange;padding-top:20px;"><h2>קובץ פתרון</h2><iframe id="solutionFrame" style="width:100%;height:600px;border:1px solid #ddd;"></iframe></div><div style="text-align:center;margin-top:50px;border-top:1px solid #eee;padding-top:20px;">ציון סופי: <span id="finalScore">--</span><div class="student-submit-area"><br><button onclick="submitExam()" style="background:#27ae60;color:white;padding:15px 30px;font-size:1.2em;border:none;border-radius:30px;">הגש בחינה</button></div></div></div><script>
        let totalTime=${duration}*60,timerInterval,examStarted=false;
        function simpleHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h<<5)-h+s.charCodeAt(i)|0;return h.toString();}
        
        function startExamTimer(){
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
        function calcTotal(){let t=0;document.querySelectorAll('.grade-input').forEach(i=>{if(i.value)t+=parseFloat(i.value)});document.getElementById('finalScore').innerText=t;}
        
        // מנגנון הנעילה
        function lockExam(){
            clearInterval(timerInterval);
            document.getElementById('securityModal').style.display='flex';
        }

        function checkSec(){
            if(!examStarted||document.body.dataset.status==='submitted')return;
            if(document.hidden){
                lockExam();
            }
        }
        document.addEventListener('visibilitychange',checkSec);
        
        document.addEventListener('fullscreenchange', () => {
             if(!document.fullscreenElement && examStarted && document.body.dataset.status!=='submitted') {
                 lockExam();
             }
        });

        function unlockExam(){
            if(simpleHash(document.getElementById('teacherCodeInput').value)==="${unlockCodeHash}"){
                document.getElementById('securityModal').style.display='none';
                document.documentElement.requestFullscreen().catch(e=>console.log(e));
                runTimer();
            } else {
                alert('קוד שגוי');
            }
        }

        function submitExam(){
            document.body.dataset.status='submitted';
            if(document.fullscreenElement) document.exitFullscreen();
            clearInterval(timerInterval);document.getElementById('timerBadge').style.display='none';
            const name=document.getElementById('studentNameField').value||'student';
            document.querySelectorAll('input,textarea').forEach(e=>{e.setAttribute('value',e.value);if(!e.classList.contains('grade-input')&&!e.classList.contains('teacher-comment'))e.setAttribute('readonly','true');});
            document.querySelectorAll('textarea').forEach(t=>t.innerHTML=t.value);
            const html="<!DOCTYPE html>"+document.documentElement.outerHTML;
            const b=new Blob([html],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download="פתור-"+name+".html";a.click();
            document.getElementById('successModal').style.display='flex';
            const acts=document.getElementById('submissionActions');
            if("${teacherEmail}"){const l="https://mail.google.com/mail/?view=cm&to=${teacherEmail}&su=Exam:"+name+"&body=Please attach file";acts.innerHTML+='<a href="'+l+'" target="_blank" style="display:block;margin:10px;padding:10px;background:#3498db;color:white;text-decoration:none;">שלח במייל (צרף קובץ!)</a>';}
            if("${driveLink}"){acts.innerHTML+='<a href="${driveLink}" target="_blank" style="display:block;margin:10px;padding:10px;background:#f1c40f;color:black;text-decoration:none;">העלה לדרייב</a>';}
        }
        function enableGrading(){if(simpleHash(prompt('Code?'))==="${unlockCodeHash}"){document.querySelector('.teacher-controls').style.display='block';document.getElementById('gradingTools').style.display='block';document.querySelectorAll('.grade-input,.teacher-comment').forEach(e=>e.disabled=false);document.querySelectorAll('.model-answer-secret').forEach(e=>e.style.display='block');document.querySelector('.student-submit-area').style.display='none';if("${solutionDataUrl}"){document.getElementById('teacherSolutionContainer').style.display='block';document.getElementById('solutionFrame').src="${solutionDataUrl}";}}}
        function saveGradedExam(){document.querySelectorAll('input').forEach(i=>i.setAttribute('value',i.value));const html="<!DOCTYPE html>"+document.documentElement.outerHTML;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download="בדוק-"+document.getElementById('studentNameField').value+".html";a.click();}
        function exportToDoc(){/*Export Logic Abbreviated*/}
        async function askAI(id,max){/*AI Logic Abbreviated*/}
        async function askAI_Multi(id,count){/*AI Logic Abbreviated*/}
        <\/script></body></html>`;
    }
};
