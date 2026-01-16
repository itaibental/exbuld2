const Generator = {
    generateAndDownload: function() {
        const name = ExamState.studentName || 'תלמיד';
        const duration = UI.elements.examDurationInput.value || 90;
        const unlockCodePlain = UI.elements.unlockCodeInput.value || '1234';
        const unlockCodeHash = Utils.simpleHash(unlockCodePlain);
        const teacherEmail = UI.elements.teacherEmailInput.value.trim();
        const driveLink = UI.elements.driveFolderInput.value.trim();

        const projectData = {
            state: ExamState,
            meta: {
                duration: UI.elements.examDurationInput.value,
                unlockCode: UI.elements.unlockCodeInput.value,
                teacherEmail: UI.elements.teacherEmailInput.value,
                driveLink: UI.elements.driveFolderInput.value,
                examTitle: UI.elements.examTitleInput.value,
                generalInstructions: UI.elements.examInstructions.value
            },
            timestamp: Date.now()
        };

        const htmlContent = this.buildStudentHTML(name, ExamState.questions, ExamState.instructions, ExamState.examTitle, ExamState.logoData, ExamState.solutionDataUrl, duration, unlockCodeHash, ExamState.parts, teacherEmail, driveLink, projectData);
        
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

    generateAndDownloadDocx: function() {
        // ... (קוד זהה לפעמים קודמות)
        try {
            let content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset="utf-8"><title>${ExamState.examTitle}</title><style>body{font-family: Arial; direction:rtl;}</style></head><body>`;
            // Simplified for brevity, same logic as before
            content += `<h1>${ExamState.examTitle}</h1>`;
            ExamState.parts.forEach(p => {
                content += `<h2>${p.name}</h2>`;
                ExamState.questions.filter(q => q.part === p.id).forEach((q,i) => {
                    content += `<p><strong>${i+1}. ${q.text}</strong></p>`;
                    if(q.subQuestions) {
                        q.subQuestions.forEach((sq,si) => content += `<p>${si+1}. ${sq.text}</p>`);
                    }
                });
            });
            content += `</body></html>`;
            const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'exam.doc'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch(e) { console.error(e); }
    },

    buildStudentHTML: function(studentName, questions, instructions, examTitle, logoData, solutionDataUrl, duration, unlockCodeHash, parts, teacherEmail, driveLink, projectData) {
        const tabsHTML = parts.map((p, idx) => `<button class="tab-btn ${idx===0?'active':''}" onclick="showPart('${p.id}')">${p.name}</button>`).join('');
        
        const sectionsHTML = parts.map((p, idx) => {
            const partQuestions = questions.filter(q => q.part === p.id);
            const partInstrHtml = instructions.parts[p.id] ? `<div class="part-instructions">${instructions.parts[p.id].replace(/\n/g, '<br>')}</div>` : '';
            let qHtml = '';

            if (partQuestions.length === 0) {
                qHtml = '<p style="text-align:center;">אין שאלות.</p>';
            } else {
                qHtml = partQuestions.map((q, qIdx) => {
                    // Media Handling
                    let vid = '';
                    let vidId = `vid-${q.id}`;
                    if(q.embedCode) { 
                        let safeEmbed = q.embedCode.replace(/allowfullscreen/gi, '');
                        if (!safeEmbed.includes('allow=')) safeEmbed = safeEmbed.replace('<iframe', '<iframe allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"');
                        vid = `<div class="media-container embed-container" id="${vidId}">${safeEmbed}</div>`;
                    } else if (Utils.isHTML5Video(q.videoUrl)) {
                        const c = q.videoControls || { download: false, fullscreen: false, playbackrate: true, pip: false };
                        let cl = [];
                        if(!c.download) cl.push('nodownload');
                        if(!c.fullscreen) cl.push('nofullscreen');
                        if(!c.playbackrate) cl.push('noplaybackrate');
                        if(!c.pip) cl.push('nopip');
                        let attrs = !c.pip ? 'disablePictureInPicture' : '';
                        vid = `<div class="video-wrapper" id="${vidId}" style="padding-bottom:0; height:auto; background:black;"><video controls playsinline controlsList="${cl.join(' ')}" ${attrs} src="${q.videoUrl}" style="width:100%; border-radius:8px; display:block;"></video></div>`;
                    } else {
                        const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl);
                        if(embedSrc) vid = `<div class="video-wrapper" id="${vidId}"><iframe src="${embedSrc}" frameborder="0"></iframe></div>`;
                    }
                    
                    if(vid) {
                        vid = `<div class="resizable-media" id="res-${vidId}" style="width:100%;">${vid}<div class="resize-handle" onmousedown="initResize(event, 'res-${vidId}')"></div></div>`;
                    }

                    const imgSrc = Utils.getImageSrc(q.imageUrl);
                    let img = imgSrc ? `<div class="image-wrapper"><img src="${imgSrc}"></div>` : '';

                    // Content Handling
                    let contentHTML = '';
                    if (q.subQuestions && q.subQuestions.length > 0) {
                        contentHTML = q.subQuestions.map((sq, si) => `
                            <div class="sub-question-block" style="margin-top:15px; border-right:2px solid #eee; padding-right:10px;">
                                <div class="sub-q-title"><strong>סעיף ${ExamState.subLabels[si]||(si+1)}'</strong> (${sq.points} נק')</div>
                                <div class="sub-q-text">${sq.text}</div>
                                <div class="answer-area"><textarea class="student-ans" placeholder="תשובה..." onpaste="return false;"></textarea></div>
                                <div class="grading-area">
                                    <input type="number" class="grade-input" min="0" max="${sq.points}" oninput="calcTotal()">
                                    <input type="text" class="teacher-comment" placeholder="הערה...">
                                    <div class="model-answer-secret" style="display:none">${sq.modelAnswer||''}</div>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        contentHTML = `
                            <div class="answer-area"><textarea class="student-ans" placeholder="תשובה..." onpaste="return false;"></textarea></div>
                            <div class="grading-area">
                                <input type="number" class="grade-input" min="0" max="${q.points}" oninput="calcTotal()">
                                <input type="text" class="teacher-comment" placeholder="הערה...">
                                <div class="model-answer-secret" style="display:none">${q.modelAnswer||''}</div>
                            </div>
                        `;
                    }

                    return `<div class="q-block" id="q-${q.id}">
                        <div class="q-header"><strong>שאלה ${qIdx+1}</strong> (${q.points} נק')</div>
                        <div class="q-content">${q.text}</div>
                        ${img}${vid}${contentHTML}
                    </div>`;
                }).join('');
            }
            return `<div id="part-${p.id}" class="exam-section ${idx===0?'active':''}"><h2 style="border-bottom:2px solid #3498db;">${p.name}</h2>${partInstrHtml}${qHtml}</div>`;
        }).join('');

        const scriptHTML = StudentCode.getScript(duration, unlockCodeHash, teacherEmail, driveLink, ExamState.solutionDataUrl);
        const embeddedProjectData = projectData ? `<script type="application/json" id="exam-engine-data">${JSON.stringify(projectData).replace(/<\/script>/g, '<\\/script>')}</script>` : '';

        return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>${studentName}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"><style>
        body{font-family:'Rubik',sans-serif;background:#f4f6f8;color:#2c3e50;font-size:18px;line-height:1.5;margin:0;padding:20px;}
        .container{max-width:900px;margin:0 auto;background:#fff;padding:40px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}
        textarea{width:100%;height:150px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:inherit;font-size:1rem;margin-top:10px;}
        .tab-btn{padding:10px 20px;background:#eee;border:none;margin-left:5px;border-radius:20px;cursor:pointer;font-size:1rem;}
        .tab-btn.active{background:#3498db;color:#fff;}
        .exam-section{display:none;} .exam-section.active{display:block;}
        .q-block{margin-bottom:30px;padding-bottom:20px;border-bottom:1px solid #eee;}
        .video-wrapper{position:relative;background:#000;border-radius:8px;overflow:hidden;}
        .resizable-media{position:relative;margin:20px 0;max-width:100%;}
        .resize-handle{position:absolute;left:0;bottom:0;width:30px;height:30px;cursor:sw-resize;z-index:20;background:linear-gradient(45deg,#3498db 50%,transparent 50%);opacity:0.5;}
        .resize-handle:hover{opacity:1;}
        .teacher-controls, .grading-area, .model-answer-secret {display:none;}
        .grade-input {width:60px;padding:5px;text-align:center;}
        .teacher-comment {width:200px;padding:5px;}
        /* Modals */
        #startScreen,#timesUpModal,#securityModal,#successModal{position:fixed;top:0;left:0;width:100%;height:100%;background:#2c3e50;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;}
        #successModal,#timesUpModal,#securityModal{display:none;}
        #timerBadge{position:fixed;top:10px;left:10px;background:#fff;color:#000;padding:5px 15px;border-radius:20px;font-weight:bold;z-index:5000;display:none;box-shadow:0 2px 10px rgba(0,0,0,0.2);}
        </style></head><body>${embeddedProjectData}
        <div id="startScreen"><h1>${examTitle}</h1><p>משך: ${duration} דקות</p><button onclick="startExamTimer()" style="padding:15px 30px;font-size:1.5em;background:#27ae60;color:#fff;border:none;border-radius:5px;cursor:pointer;">התחל</button></div>
        <div id="timerBadge">זמן: <span id="timerText">--:--</span><span id="extraTimeLabel" style="display:none;color:red;margin-right:5px;">(תוספת)</span></div>
        <div id="timesUpModal"><h2>תם הזמן!</h2><button onclick="requestExtraTime()" style="background:#3498db;color:#fff;padding:10px 20px;border:none;margin:5px;">תוספת זמן</button><button onclick="submitExam()" style="background:#27ae60;color:#fff;padding:10px 20px;border:none;margin:5px;">הגש</button>
        <div style="margin-top:20px;"><button onclick="enableGradingFromModal()" style="background:transparent;border:1px solid #fff;color:#fff;padding:5px;">מורה (בדיקה)</button></div></div>
        <div id="securityModal"><h2>נעול!</h2><p>יצאת ממסך מלא.</p><input type="password" id="teacherCodeInput"><button onclick="unlockExam()">שחרר</button></div>
        <div id="successModal"><h1>הוגש!</h1><p>הקובץ נשמר.</p><div id="submissionActions"></div><div style="margin-top:30px;"><button onclick="enableGradingFromModal()" style="background:transparent;border:1px solid #fff;color:#fff;padding:5px;">מורה (בדיקה)</button></div></div>
        
        <div class="container" id="mainContainer" style="filter:blur(5px);">
            <div style="text-align:center;">${logoHTML}<h1>${examTitle}</h1></div>
            <div class="teacher-controls">
                <h3>אזור בדיקה</h3>
                <div>ציון: <span id="teacherCalculatedScore" style="color:green;font-weight:bold;">0</span></div>
                <button onclick="saveGradedExam()">שמור בדיקה</button> <button onclick="exportToDoc()">Word</button>
            </div>
            ${globalInstructionsHTML}
            <div class="tabs">${tabsHTML}</div>
            <form id="examForm">${sectionsHTML}</form>
            <div id="teacherSolutionContainer" style="display:none;margin-top:40px;"><h2>פתרון</h2><iframe id="solutionFrame" style="width:100%;height:600px;"></iframe></div>
            <div style="text-align:center;margin-top:50px;"><button onclick="submitExam()" style="background:#27ae60;color:#fff;padding:15px 40px;border:none;border-radius:5px;font-size:1.2em;cursor:pointer;">הגש בחינה</button></div>
        </div>
        ${scriptHTML}
        </body></html>`;
    }
};
