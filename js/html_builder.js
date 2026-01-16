const HtmlBuilder = {
    build: function(studentName, questions, instructions, examTitle, logoData, duration, unlockCodeHash, parts, teacherEmail, driveLink, projectData) {
        
        const tabsHTML = parts.map((p, idx) => `<button class="tab-btn ${idx===0?'active':''}" onclick="showPart('${p.id}')">${p.name}</button>`).join('');

        const sectionsHTML = parts.map((p, idx) => {
            const partQuestions = questions.filter(q => q.part === p.id);
            const partInstrHtml = instructions.parts[p.id] ? `<div class="part-instructions">${instructions.parts[p.id].replace(/\n/g, '<br>')}</div>` : '';
            
            let qHtml = '';
            if(partQuestions.length === 0) {
                qHtml = '<p style="text-align:center; color:#95a5a6; padding:20px;">אין שאלות בחלק זה</p>';
            } else {
                qHtml = partQuestions.map((q, qIdx) => {
                    const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl);
                    let vid = '';
                    let vidId = `vid-${q.id}`;
                    
                    if(q.embedCode) { 
                        let safeEmbed = q.embedCode.replace(/allowfullscreen/gi, '');
                        if (!safeEmbed.includes('allow=')) {
                             safeEmbed = safeEmbed.replace('<iframe', '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"');
                        }
                        vid = `<div class="media-container embed-container" id="${vidId}">${safeEmbed}</div>`; 
                    } 
                    else if (Utils.isHTML5Video(q.videoUrl)) { 
                        const controls = q.videoControls || { download: false, fullscreen: false, playbackrate: true, pip: false };
                        let controlsList = [];
                        if(!controls.download) controlsList.push('nodownload');
                        if(!controls.fullscreen) controlsList.push('nofullscreen');
                        if(!controls.playbackrate) controlsList.push('noplaybackrate');
                        if(!controls.pip) controlsList.push('nopip');

                        let extraAttrs = '';
                        if(!controls.pip) extraAttrs += ' disablePictureInPicture';

                        vid = `<div class="video-wrapper" id="${vidId}" style="padding-bottom:0; height:auto; background:black;">
                            <video controls playsinline controlsList="${controlsList.join(' ')}" ${extraAttrs} src="${q.videoUrl}" style="width:100%; border-radius:8px; display:block;"></video>
                        </div>`; 
                    }
                    else if (embedSrc) { 
                        vid = `<div class="video-wrapper" id="${vidId}"><iframe src="${embedSrc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`; 
                    }

                    if(vid) {
                        vid = `<div class="resizable-media" id="res-${vidId}" style="width:100%;">
                                 ${vid}
                                 <div class="resize-handle" title="גרור לשינוי גודל" onmousedown="initResize(event, 'res-${vidId}')"></div>
                               </div>`;
                    }

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

        // Inject the Student Code Script
        const scriptHTML = StudentCode.getScript(duration, unlockCodeHash, teacherEmail, driveLink, ExamState.solutionDataUrl);
        
        // Inject Project Data for Reloading
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
        
        .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; width: 100%; max-width: 100%; margin: 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        .video-shield { position: absolute; top: 0; left: 0; width: 100%; height: 15%; z-index: 10; background: transparent; }
        
        .embed-container { margin: 0; text-align: center; }
        .embed-container iframe { max-width: 100%; }

        .image-wrapper { text-align: center; margin: 20px 0; width: 100%; }
        .image-wrapper img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: block; margin: 0 auto; }

        .teacher-controls { background: #fdf2e9; padding: 15px; border: 1px solid #f39c12; border-radius: 8px; margin-bottom: 20px; }
        .grading-area { display: none; margin-top: 15px; background: #fafafa; padding: 10px; border-top: 2px solid #bdc3c7; }
        .grade-input { width: 60px; padding: 5px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; }
        .teacher-comment { background: #fff; }
        .model-answer-secret { margin-top: 10px; border: 1px dashed #f39c12; padding: 10px; background: #fffdf5; border-radius: 4px; font-size: 0.9em; color: #555; }
        
        #highlighterTool { position: fixed; top: 150px; right: 20px; width: 50px; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border-radius: 30px; padding: 15px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 10000; border: 1px solid #ddd; transition: opacity 0.3s; }
        .color-btn { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .color-btn:hover { transform: scale(1.2); }
        .color-btn.active { border-color: #333; transform: scale(1.1); box-shadow: 0 0 0 2px #333; }
        .drag-handle { cursor: move; color: #ccc; font-size: 20px; line-height: 10px; margin-bottom: 5px; user-select: none; }
        
        /* Modals */
        #startScreen,#timesUpModal,#securityModal,#successModal{position:fixed;top:0;left:0;width:100%;height:100%;background:#2c3e50;color:white;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:9999;}#timesUpModal,#securityModal,#successModal{display:none;}
        #timerBadge{position:fixed;top:10px;left:10px;background:white;color:black;padding:10px;border-radius:20px;border:2px solid #2c3e50;font-weight:bold;z-index:5000;display:none;}
        #securityModal h2, #timesUpModal h2 { font-size: 3rem; margin-bottom: 10px; color: #e74c3c; }
        
        /* Resizable Media CSS */
        .resizable-media { position: relative; margin: 20px 0; max-width: 100%; }
        .resize-handle { 
            position: absolute; 
            left: 0; 
            bottom: 0; 
            width: 30px; 
            height: 30px; 
            cursor: sw-resize; 
            z-index: 20; 
            background: linear-gradient(45deg, rgba(52, 152, 219, 1) 50%, transparent 50%); 
            opacity: 0.5; 
            transition: opacity 0.2s;
        }
        .resize-handle:hover { opacity: 1; }
        </style></head><body>
        ${embeddedProjectData}
        <div id="highlighterTool"><div class="drag-handle" id="hlDragHandle">:::</div><div class="color-btn" style="background:#ffeb3b;" onclick="setMarker('#ffeb3b', this)" title="צהוב"></div><div class="color-btn" style="background:#a6ff00;" onclick="setMarker('#a6ff00', this)" title="ירוק"></div><div class="color-btn" style="background:#ff4081;" onclick="setMarker('#ff4081', this)" title="ורוד"></div><div class="color-btn" style="background:#00e5ff;" onclick="setMarker('#00e5ff', this)" title="תכלת"></div><div class="color-btn" style="background:#fff; border:1px solid #ccc; display:flex; justify-content:center; align-items:center; font-size:12px;" onclick="setMarker(null, this)" title="בטל מרקר">❌</div></div>

        <div id="startScreen"><h1>${examTitle}</h1><p>משך הבחינה: ${duration} דקות</p><p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">שים לב: המבחן יתבצע במסך מלא.<br>יציאה ממסך מלא או מעבר לחלון אחר ינעלו את המבחן!</p><button onclick="startExamTimer()" style="padding:15px 30px;font-size:1.5em;background:#27ae60;color:white;border:none;border-radius:10px;">התחל בחינה (מסך מלא)</button></div><div id="timerBadge">זמן: <span id="timerText">--:--</span><span id="extraTimeLabel" style="display:none; color:red; font-size:0.8em; margin-right:5px;">(תוספת זמן)</span></div>
        <div id="timesUpModal">
            <h2>תם הזמן!</h2>
            <p>זמן הבחינה המוקצב הסתיים.</p>
            <div style="margin-top:20px;">
                <button onclick="requestExtraTime()" style="background:#3498db; margin:10px; padding:15px 30px;">בקש תוספת זמן (מורה)</button>
                <button onclick="submitExam()" style="background:#27ae60; margin:10px; padding:15px 30px;">הגש בחינה כעת</button>
            </div>
            <div style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.3); padding-top:10px;">
                <button onclick="enableGradingFromModal()" style="background: transparent; border: 1px solid #fff; color: #fff; padding: 10px; font-size:0.9em;">👨‍🏫 כניסת מורה (בדיקה)</button>
            </div>
        </div>
        <div id="securityModal"><h2>המבחן ננעל!</h2><p style="font-size: 1.5rem;">יצאת ממסך מלא או עברת לחלון אחר.</p><input type="password" id="teacherCodeInput" placeholder="קוד מורה לשחרור"><button onclick="unlockExam()">שחרר</button></div>
        
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
        ${scriptHTML}</body></html>`;
    }
};
