// =========================================================================
// === MODULE 1: EXAM STATE (MODEL) - ניהול המידע ===
// =========================================================================
const ExamState = {
    questions: [],
    parts: [
        { id: 'A', name: 'חלק ראשון' },
        { id: 'B', name: 'חלק שני' },
        { id: 'C', name: 'חלק שלישי' }
    ],
    currentTab: 'A',
    studentName: '',
    examTitle: 'מבחן בגרות', 
    logoData: null,
    solutionDataUrl: null,
    instructions: {
        general: '',
        parts: {} 
    },
    partNamesList: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שביעי", "שמיני", "תשיעי", "עשירי"],
    subLabels: ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"],
    tempSubQuestions: [], // Holds sub-questions currently being edited

    // Methods to mutate state
    addQuestion: function(q) { this.questions.push(q); },
    removeQuestion: function(id) { this.questions = this.questions.filter(q => q.id !== id); },
    addPart: function(part) { this.parts.push(part); },
    removePart: function(id) {
        this.questions = this.questions.filter(q => q.part !== id);
        this.parts = this.parts.filter(p => p.id !== id);
        delete this.instructions.parts[id];
    },
    updatePartName: function(id, name) {
        const p = this.parts.find(p => p.id === id);
        if (p) p.name = name;
    },
    getNextPartId: function() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i=0; i<letters.length; i++) {
            if (!this.parts.find(p => p.id === letters[i])) return letters[i];
        }
        return 'P' + Date.now();
    }
};

// =========================================================================
// === MODULE 2: UI RENDERING (VIEW) - תצוגה ואינטראקציה ===
// =========================================================================
const UI = {
    elements: {}, // Will be populated on init
    
    initElements: function() {
        const idList = [
            'qPart', 'partNameInput', 'partInstructions', 'partNameLabel', 
            'qPoints', 'qText', 'qModelAnswer', 'qVideo', 'qImage', 
            'previewQuestionsContainer', 'statsContainer', 'totalPoints', 
            'studentNameInput', 'filenamePreview', 'previewTabs', 
            'examInstructions', 'previewInstructionsBox', 'examTitleInput', 
            'previewExamTitle', 'previewLogo', 'examDurationInput', 
            'unlockCodeInput', 'teacherEmailInput', 'driveFolderInput', 
            'subQuestionsList', 'mainModelAnswerContainer', 
            'toastContainer', 'confirmModal'
        ];
        idList.forEach(id => this.elements[id] = document.getElementById(id));
    },

    showToast: function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.elements.toastContainer.appendChild(toast);
        void toast.offsetWidth; // Trigger reflow
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showConfirm: function(title, text, callback) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        this.elements.confirmModal.classList.add('open');
        this.confirmCallback = callback;
    },

    closeModal: function() {
        this.elements.confirmModal.classList.remove('open');
        this.confirmCallback = null;
    },

    renderPartSelector: function() {
        const el = this.elements.qPart;
        el.innerHTML = '';
        ExamState.parts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            el.appendChild(opt);
        });
        el.value = ExamState.currentTab;
    },

    renderTabs: function() {
        const container = this.elements.previewTabs;
        container.innerHTML = '';
        ExamState.parts.forEach(p => {
            const div = document.createElement('div');
            div.className = `tab ${p.id === ExamState.currentTab ? 'active' : ''}`;
            div.textContent = p.name;
            div.onclick = () => App.setTab(p.id);
            container.appendChild(div);
        });
    },

    updateStats: function() {
        const container = this.elements.statsContainer;
        container.innerHTML = '';
        let total = 0;
        
        ExamState.parts.forEach(p => {
            const count = ExamState.questions.filter(q => q.part === p.id).length;
            const div = document.createElement('div');
            div.className = 'stat-row';
            div.innerHTML = `<span>${p.name}:</span> <span>${count}</span>`;
            container.appendChild(div);
        });

        ExamState.questions.forEach(q => total += q.points);
        this.elements.totalPoints.textContent = total;
    },

    renderPreview: function() {
        const container = this.elements.previewQuestionsContainer;
        const filtered = ExamState.questions.filter(q => q.part === ExamState.currentTab);
        
        if (filtered.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; color: #bdc3c7; margin-top: 50px;">
                <h3>עדיין אין שאלות בחלק זה</h3>
                <p>הוסף שאלות מהתפריט הימני</p>
            </div>`;
            return;
        }

        container.innerHTML = filtered.map((q, idx) => {
            let mediaHTML = '';
            const imgSrc = Utils.getImageSrc(q.imageUrl);
            if (imgSrc) mediaHTML += `<div class="image-wrapper"><img src="${imgSrc}" alt="Question Image"></div>`;

            const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl);
            if (embedSrc) mediaHTML += `<div class="video-wrapper"><div class="video-shield"></div><iframe sandbox="allow-scripts allow-same-origin allow-presentation" src="${embedSrc}" frameborder="0"></iframe></div>`;

            let subQuestionsHTML = '';
            let modelAnsPreview = '';

            if (q.subQuestions && q.subQuestions.length > 0) {
                subQuestionsHTML = q.subQuestions.map((sq, si) => {
                    const label = ExamState.subLabels[si] || (si + 1);
                    return `<div class="preview-sub-q">
                        <div class="preview-sub-badge">${label}' (${sq.points} נק')</div>
                        <div style="margin-bottom:10px;">${sq.text}</div>
                        <div class="preview-input" style="height:8vh;">תשובה לסעיף...</div>
                        ${sq.modelAnswer ? `<div style="background:#fff3cd; padding:0.5vh; margin-top:0.5vh; border-radius:0.4em; font-size:0.8rem; color:#856404; border:1px solid #ffeeba;"><strong>👁️ מחוון:</strong> ${sq.modelAnswer}</div>` : ''}
                    </div>`;
                }).join('');
            } else {
                modelAnsPreview = q.modelAnswer ? `<div style="background:#fff3cd; padding:1vh; margin-top:1vh; border-radius:0.4em; font-size:0.9rem; color:#856404; border:1px solid #ffeeba;"><strong>👁️ מחוון למורה:</strong> ${q.modelAnswer}</div>` : '';
            }

            return `
            <div class="question-card">
                <button class="btn-delete" onclick="App.deleteQuestion(${q.id})">🗑️ הסר</button>
                <div class="badge">שאלה ${idx + 1} • ${q.points} נקודות</div>
                <div class="q-text">${q.text}</div>
                ${mediaHTML}
                ${q.subQuestions && q.subQuestions.length > 0 ? subQuestionsHTML : '<div class="preview-input">תיבת טקסט לתשובת התלמיד...</div>'}
                ${modelAnsPreview}
            </div>`;
        }).join('');
    },

    renderSubQuestionInputs: function() {
        const list = this.elements.subQuestionsList;
        list.innerHTML = '';
        ExamState.tempSubQuestions.forEach((sq, idx) => {
            const label = ExamState.subLabels[idx] || (idx + 1);
            const row = document.createElement('div');
            row.className = 'sub-q-row';
            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <strong>סעיף ${label}'</strong>
                    <button class="btn-small-remove" onclick="App.removeSubQuestionField(${sq.id})">❌</button>
                </div>
                <input type="text" placeholder="תוכן הסעיף" value="${sq.text}" oninput="App.updateSubQuestionData(${sq.id}, 'text', this.value)" style="margin-bottom:5px;">
                <div style="display:flex; gap:10px;">
                    <input type="number" placeholder="נקודות" value="${sq.points}" oninput="App.updateSubQuestionData(${sq.id}, 'points', parseInt(this.value)||0)" style="width:80px;">
                    <input type="text" placeholder="מחוון לסעיף" value="${sq.modelAnswer}" oninput="App.updateSubQuestionData(${sq.id}, 'modelAnswer', this.value)" style="flex:1; border-color:#f39c12; background:#fffdf5;">
                </div>
            `;
            list.appendChild(row);
        });

        // Update main points and visibility
        if (ExamState.tempSubQuestions.length > 0) {
            const total = ExamState.tempSubQuestions.reduce((acc, curr) => acc + (curr.points || 0), 0);
            this.elements.qPoints.value = total;
            this.elements.qPoints.disabled = true;
            this.elements.mainModelAnswerContainer.style.display = 'none';
        } else {
            this.elements.qPoints.disabled = false;
            this.elements.mainModelAnswerContainer.style.display = 'block';
        }
    }
};

// =========================================================================
// === MODULE 3: UTILS - פונקציות עזר ===
// =========================================================================
const Utils = {
    getVideoEmbedUrl: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        const iframeMatch = url.match(/src=["'](.*?)["']/);
        const link = iframeMatch ? iframeMatch[1] : url;
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?"]*).*/;
        const ytMatch = link.match(ytRegExp);
        if (ytMatch && ytMatch[2].length === 11) {
            return `https://www.youtube-nocookie.com/embed/${ytMatch[2]}?rel=0&modestbranding=1&showinfo=0`;
        }
        return null;
    },

    getImageSrc: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
        }
        return url;
    },

    simpleHash: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return hash.toString();
    },

    setupResizers: function() {
        // Setup Right Resizer
        const resizerRight = document.getElementById('dragHandleRight');
        const rightCol = document.getElementById('rightPanel');
        resizerRight.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = 'col-resize';
            resizerRight.classList.add('resizing');
            const onMove = (e) => {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 200 && newWidth < window.innerWidth * 0.6) {
                    rightCol.style.width = newWidth + 'px';
                    rightCol.style.flex = 'none';
                }
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = 'default';
                resizerRight.classList.remove('resizing');
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Setup Left Resizer
        const resizerLeft = document.getElementById('dragHandleLeft');
        const leftCol = document.getElementById('leftPanel');
        resizerLeft.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = 'col-resize';
            resizerLeft.classList.add('resizing');
            const onMove = (e) => {
                const newWidth = e.clientX;
                if (newWidth > 150 && newWidth < window.innerWidth * 0.4) {
                    leftCol.style.width = newWidth + 'px';
                    leftCol.style.flex = 'none';
                }
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = 'default';
                resizerLeft.classList.remove('resizing');
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
};

// =========================================================================
// === MODULE 4: GENERATOR - לוגיקה ליצירת קובץ התלמיד ===
// =========================================================================
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
        // Note: In a real multi-file system, this template would be loaded from a separate HTML file.
        // For this generator, we include the string construction here.
        
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

        // Using template literal for the massive HTML string (abbreviated here for clarity, imagine full CSS/JS injected)
        // Note: The Student HTML contains its own internal JS for timer, tabs, etc.
        // We escape the script tag to prevent early termination
        return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>מבחן - ${studentName}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"><style>/* Student CSS Here */ :root{--primary:#2c3e50;--accent:#3498db;--success:#27ae60;--danger:#e74c3c;}body{font-family:'Rubik',sans-serif;background:#f4f6f8;margin:0;padding:2%;color:#2c3e50;user-select:none;}.container{max-width:800px;margin:0 auto;background:white;padding:5%;border-radius:1em;box-shadow:0 1vh 3vh rgba(0,0,0,0.05);}textarea{width:100%;height:20vh;padding:2vh;border:1px solid #ccc;border-radius:0.8em;font-family:inherit;}button{cursor:pointer;}.tab-btn{padding:10px 20px;background:#eee;border:none;margin:5px;border-radius:20px;}.tab-btn.active{background:var(--accent);color:white;}.exam-section{display:none;}.exam-section.active{display:block;}#startScreen,#timesUpModal,#securityModal,#successModal{position:fixed;top:0;left:0;width:100%;height:100%;background:#2c3e50;color:white;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:9999;}#timesUpModal,#securityModal,#successModal{display:none;}#timerBadge{position:fixed;top:10px;left:10px;background:white;color:black;padding:10px;border-radius:20px;border:2px solid #2c3e50;font-weight:bold;z-index:5000;display:none;}</style></head><body oncontextmenu="return false;"><div id="startScreen"><h1>${examTitle}</h1><p>משך הבחינה: ${duration} דקות</p><button onclick="startExamTimer()" style="padding:15px 30px;font-size:1.5em;background:#27ae60;color:white;border:none;border-radius:10px;">התחל בחינה</button></div><div id="timerBadge">זמן: <span id="timerText">--:--</span></div><div id="timesUpModal"><h2>הזמן נגמר!</h2><button onclick="submitExam()">הגש בחינה</button></div><div id="securityModal"><h2>המבחן ננעל!</h2><input type="password" id="teacherCodeInput" placeholder="קוד מורה"><button onclick="unlockExam()">שחרר</button></div><div id="successModal"><h1>סיימת!</h1><div id="submissionActions"></div></div><div class="container" id="mainContainer" style="filter:blur(5px);"><div style="text-align:center;">${logoHTML}<h1>${examTitle}</h1></div><div class="teacher-controls" style="display:none;border-bottom:1px solid #ccc;padding-bottom:20px;margin-bottom:20px;"><button onclick="enableGrading()">🔓 כניסת מורה</button><div id="gradingTools" style="display:none;margin-top:10px;"><button onclick="saveGradedExam()" style="background:#27ae60;color:white;padding:5px 10px;border:none;border-radius:5px;">💾 שמור בדיקה</button><button onclick="exportToDoc()" style="background:#3498db;color:white;padding:5px 10px;border:none;border-radius:5px;margin-right:10px;">📄 ייצוא ל-Word</button><div id="apiKeyContainer" style="margin-top:10px;"><label>Gemini API Key:</label><input type="password" id="apiKeyInput" onchange="enableAIButtons()"></div></div></div><div style="background:#fff;padding:20px;border:1px solid var(--accent);border-radius:10px;margin-bottom:20px;"><label>שם תלמיד:</label><input type="text" id="studentNameField" value="${studentName}" style="width:100%;padding:10px;"></div>${globalInstructionsHTML}<div class="tabs">${tabsHTML}</div><form id="examForm">${sectionsHTML}</form><div id="teacherSolutionContainer" style="display:none;margin-top:40px;border-top:2px dashed orange;padding-top:20px;"><h2>קובץ פתרון</h2><iframe id="solutionFrame" style="width:100%;height:600px;border:1px solid #ddd;"></iframe></div><div style="text-align:center;margin-top:50px;border-top:1px solid #eee;padding-top:20px;">ציון סופי: <span id="finalScore">--</span><div class="student-submit-area"><br><button onclick="submitExam()" style="background:#27ae60;color:white;padding:15px 30px;font-size:1.2em;border:none;border-radius:30px;">הגש בחינה</button></div></div></div><script>
        // Student Script embedded
        let totalTime=${duration}*60,timerInterval,examStarted=false;
        function simpleHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h<<5)-h+s.charCodeAt(i)|0;return h.toString();}
        function startExamTimer(){document.getElementById('startScreen').style.display='none';document.getElementById('mainContainer').style.filter='none';document.getElementById('timerBadge').style.display='block';examStarted=true;runTimer();updateTimer();}
        function runTimer(){clearInterval(timerInterval);timerInterval=setInterval(()=>{totalTime--;updateTimer();if(totalTime<=0){clearInterval(timerInterval);document.getElementById('timesUpModal').style.display='flex';}},1000);}
        function updateTimer(){let m=Math.floor(totalTime/60),s=totalTime%60;document.getElementById('timerText').innerText=(m<10?'0'+m:m)+':'+(s<10?'0'+s:s);}
        function showPart(id){document.querySelectorAll('.exam-section').forEach(e=>e.classList.remove('active'));document.getElementById('part-'+id).classList.add('active');document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');}
        function calcTotal(){let t=0;document.querySelectorAll('.grade-input').forEach(i=>{if(i.value)t+=parseFloat(i.value)});document.getElementById('finalScore').innerText=t;}
        function checkSec(){if(!examStarted||document.body.dataset.status==='submitted')return;if(document.hidden){clearInterval(timerInterval);document.getElementById('securityModal').style.display='flex';}}
        document.addEventListener('visibilitychange',checkSec);
        function unlockExam(){if(simpleHash(document.getElementById('teacherCodeInput').value)==="${unlockCodeHash}"){document.getElementById('securityModal').style.display='none';runTimer();}else{alert('קוד שגוי');}}
        function submitExam(){document.body.dataset.status='submitted';clearInterval(timerInterval);document.getElementById('timerBadge').style.display='none';
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

// =========================================================================
// === MODULE 5: APP MAIN CONTROLLER (CONTROLLER) - חיבור האירועים ===
// =========================================================================
const App = {
    init: function() {
        UI.initElements();
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        this.onPartSelectChange();
        Utils.setupResizers();
        
        // Confirm Modal Handler
        document.getElementById('btnConfirmYes').onclick = function() {
            if (UI.confirmCallback) UI.confirmCallback();
            UI.closeModal();
        };
    },

    // --- Question Management Handlers ---
    addQuestion: function() {
        const text = UI.elements.qText.value.trim();
        const modelAnswer = UI.elements.qModelAnswer.value.trim();
        const part = UI.elements.qPart.value;
        const videoUrl = UI.elements.qVideo.value.trim();
        const imageUrl = UI.elements.qImage.value.trim();
        let points = parseInt(UI.elements.qPoints.value) || 0;

        if (!text) {
            UI.showToast('אנא הכנס תוכן לשאלה', 'error');
            return;
        }

        if (ExamState.tempSubQuestions.length > 0) {
            points = ExamState.tempSubQuestions.reduce((acc, curr) => acc + (curr.points || 0), 0);
        }

        const question = {
            id: Date.now(),
            part, points, text, modelAnswer, videoUrl, imageUrl,
            subQuestions: [...ExamState.tempSubQuestions]
        };

        ExamState.addQuestion(question);
        
        // Reset Form
        UI.elements.qText.value = '';
        UI.elements.qModelAnswer.value = '';
        UI.elements.qPoints.value = '10';
        UI.elements.qVideo.value = '';
        UI.elements.qImage.value = '';
        UI.elements.qText.focus();
        ExamState.tempSubQuestions = [];
        UI.renderSubQuestionInputs();

        UI.updateStats();
        UI.renderPreview();
        UI.showToast('השאלה נוספה בהצלחה');
    },

    deleteQuestion: function(id) {
        UI.showConfirm('מחיקת שאלה', 'האם אתה בטוח שברצונך למחוק שאלה זו?', () => {
            ExamState.removeQuestion(id);
            UI.updateStats();
            UI.renderPreview();
            UI.showToast('השאלה נמחקה');
        });
    },

    // --- Part Management Handlers ---
    onPartSelectChange: function() {
        const selectedPartId = UI.elements.qPart.value;
        const part = ExamState.parts.find(p => p.id === selectedPartId);
        if (part) {
            UI.elements.partNameInput.value = part.name;
            UI.elements.partNameLabel.textContent = part.name;
            UI.elements.partInstructions.value = ExamState.instructions.parts[selectedPartId] || '';
            this.setTab(selectedPartId);
        }
    },

    setTab: function(partId) {
        ExamState.currentTab = partId;
        UI.renderTabs();
        if(UI.elements.qPart.value !== partId) {
            UI.elements.qPart.value = partId;
            this.onPartSelectChange(); 
        }
        UI.renderPreview();
    },

    addPart: function() {
        const nextIdx = ExamState.parts.length;
        let suffix = "";
        if (nextIdx < ExamState.partNamesList.length) suffix = ExamState.partNamesList[nextIdx];
        else suffix = (nextIdx + 1).toString();
        
        const newId = ExamState.getNextPartId();
        const newName = "חלק " + suffix;
        
        ExamState.addPart({ id: newId, name: newName });
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        
        UI.elements.qPart.value = newId;
        this.onPartSelectChange();
        UI.showToast(`חלק חדש נוסף: ${newName}`);
    },

    removePart: function() {
        if (ExamState.parts.length <= 1) {
            UI.showToast('חייב להישאר לפחות חלק אחד בבחינה.', 'error');
            return;
        }
        const partIdToRemove = UI.elements.qPart.value;
        const partName = ExamState.parts.find(p => p.id === partIdToRemove).name;
        
        UI.showConfirm('מחיקת חלק', `האם למחוק את "${partName}"? השאלות בחלק זה יימחקו.`, () => {
            ExamState.removePart(partIdToRemove);
            if (ExamState.parts.length > 0) ExamState.currentTab = ExamState.parts[0].id;
            
            UI.renderPartSelector();
            UI.renderTabs();
            UI.updateStats();
            this.onPartSelectChange();
            UI.renderPreview();
            UI.showToast(`החלק "${partName}" נמחק`);
        });
    },

    updatePartName: function() {
        ExamState.updatePartName(UI.elements.qPart.value, UI.elements.partNameInput.value);
        UI.elements.partNameLabel.textContent = UI.elements.partNameInput.value;
        UI.renderTabs();
        UI.renderPartSelector(); // to update dropdown text
        UI.updateStats();
    },

    savePartInstructions: function() {
        ExamState.instructions.parts[UI.elements.qPart.value] = UI.elements.partInstructions.value;
    },

    // --- Sub Question Handlers ---
    addSubQuestionField: function() {
        const id = Date.now() + Math.random();
        ExamState.tempSubQuestions.push({ id, text: '', points: 5, modelAnswer: '' });
        UI.renderSubQuestionInputs();
    },

    removeSubQuestionField: function(id) {
        ExamState.tempSubQuestions = ExamState.tempSubQuestions.filter(sq => sq.id !== id);
        UI.renderSubQuestionInputs();
    },

    updateSubQuestionData: function(id, field, value) {
        const sq = ExamState.tempSubQuestions.find(s => s.id === id);
        if (sq) {
            sq[field] = value;
            if (field === 'points') UI.renderSubQuestionInputs(false);
        }
    },

    // --- General Settings Handlers ---
    updateExamTitle: function() {
        ExamState.examTitle = UI.elements.examTitleInput.value.trim() || 'מבחן בגרות';
        UI.elements.previewExamTitle.textContent = ExamState.examTitle;
    },

    updateInstructionsPreview: function() {
        const text = UI.elements.examInstructions.value;
        ExamState.instructions.general = text;
        if (text.trim()) {
            UI.elements.previewInstructionsBox.style.display = 'block';
            UI.elements.previewInstructionsBox.textContent = text;
        } else {
            UI.elements.previewInstructionsBox.style.display = 'none';
        }
    },

    updateFilenamePreview: function() {
        ExamState.studentName = UI.elements.studentNameInput.value.trim();
        const name = ExamState.studentName || 'תלמיד';
        UI.elements.filenamePreview.textContent = `${name} - מבחן.html`;
    },

    handleLogoUpload: function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                ExamState.logoData = e.target.result;
                UI.elements.previewLogo.src = ExamState.logoData;
                UI.elements.previewLogo.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    },

    handleSolutionUpload: function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                ExamState.solutionDataUrl = e.target.result;
                UI.showToast('קובץ הפתרון נטען בהצלחה');
            };
            reader.readAsDataURL(file);
        }
    }
};

// === START APP ===
window.onload = function() {
    App.init();
};