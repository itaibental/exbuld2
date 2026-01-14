// --- Teacher Mode Helper Functions (Must be global to be called from injected HTML) ---
window.ExamFunctions = {
    calcTotal: function() {
        // This function runs in the context of the main window but calculates based on elements 
        // inside the #submittedExamView container
        const view = document.getElementById('submittedExamView');
        if(!view) return;
        
        let t = 0;
        view.querySelectorAll('.grade-input').forEach(i => {
            if(i.value) t += parseFloat(i.value);
        });
        const display = view.querySelector('#teacherCalculatedScore');
        if(display) display.innerText = t;
    },

    saveGradedExam: function() {
        const view = document.getElementById('submittedExamView');
        if(!view) return;
        
        // Update value attributes for persistence
        view.querySelectorAll('input, textarea').forEach(i => i.setAttribute('value', i.value));
        view.querySelectorAll('textarea').forEach(t => t.innerHTML = t.value);
        
        // Prepare HTML for download
        // We need to reconstruct the full HTML.
        // We grab the innerHTML of the view, wrap it in basic html/body tags, 
        // AND importantly, we need the original scripts to remain working for the next viewing.
        // However, simple saving of innerHTML is usually enough for a static record.
        
        // Better approach: Take the original loaded doc structure (if we had kept it) and update it.
        // For simplicity: We will wrap the current view content in a standard HTML shell.
        // Note: This "Checked" version might lose the interactive timer scripts, which is fine for a graded paper.
        
        const content = view.innerHTML;
        const studentName = view.querySelector('#studentNameField')?.value || 'student';
        
        const html = `<!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>מבחן בדוק - ${studentName}</title>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap">
            <style>
                body { font-family: 'Rubik', sans-serif; background: #f4f6f8; margin: 0; padding: 2%; color: #2c3e50; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 5%; border-radius: 1em; box-shadow: 0 1vh 3vh rgba(0,0,0,0.05); }
                .student-exam-wrapper { width: 100%; }
                /* Copy essential styles needed for display */
                .question-card, .q-block { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                .teacher-controls { display: none !important; } /* Hide controls in final static copy if desired, or keep them */
                .grade-input { border: 1px solid #000; font-weight: bold; background: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                ${content}
            </div>
        </body>
        </html>`;
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
        a.download = "בדוק-" + studentName + ".html";
        a.click();
    },

    exportToDoc: function() {
        const view = document.getElementById('submittedExamView');
        if(!view) return;
        
        const studentName = view.querySelector('#studentNameField')?.value || 'תלמיד';
        const finalScore = view.querySelector('#teacherCalculatedScore')?.innerText || '0';
        
        let content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>מבחן בדוק</title>
        <style>body{font-family: Arial, sans-serif; direction: rtl;} .q-box{border: 1px solid #ccc; padding: 10px; margin-bottom: 20px;} .teacher-feedback{background: #f0f8ff; padding: 5px; margin-top: 5px; border: 1px solid #3498db;}</style>
        </head><body>
        <h1 style="text-align:center;">מבחן בדוק</h1>
        <h2>שם התלמיד: ${studentName}</h2>
        <h3>ציון סופי: <span style="color:red">${finalScore}</span></h3><hr>`;

        view.querySelectorAll('.q-block, .sub-question-block').forEach((block, idx) => {
            const isSub = block.classList.contains('sub-question-block');
            const text = (block.querySelector('.q-content') || block.querySelector('.sub-q-text'))?.innerText || '';
            const answer = block.querySelector('.student-ans')?.value || '(אין תשובה)';
            const grade = block.querySelector('.grade-input')?.value || '0';
            const comment = block.querySelector('.teacher-comment')?.value || '';

            content += `<div class="q-box">
                <p><strong>${isSub ? 'סעיף' : 'שאלה'}:</strong> ${text}</p>
                <p><strong>תשובה:</strong><br>${answer.replace(/\n/g, '<br>')}</p>
                <div class="teacher-feedback">
                    <p><strong>ציון:</strong> ${grade}</p>
                    ${comment ? `<p><strong>הערה:</strong> ${comment}</p>` : ''}
                </div>
            </div>`;
        });

        content += `</body></html>`;
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\ufeff', content], {type: 'application/msword'}));
        a.download = 'בדוק-' + studentName + '.doc';
        a.click();
    }
};

const App = {
    activeFormatInput: null, 

    init: function() {
        UI.initElements();
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        this.onPartSelectChange();
        Utils.setupResizers();
        this.setupTextFormatting();
        
        const confirmBtn = document.getElementById('btnConfirmYes');
        if(confirmBtn) {
            confirmBtn.onclick = function() {
                if (UI.confirmCallback) UI.confirmCallback();
                UI.closeModal();
            };
        }
    },

    // --- Save & Load Project Logic ---
    saveProject: function() {
        try {
            const projectData = {
                state: ExamState,
                meta: {
                    duration: UI.elements.examDurationInput?.value || 90,
                    unlockCode: UI.elements.unlockCodeInput?.value || '',
                    teacherEmail: UI.elements.teacherEmailInput?.value || '',
                    driveLink: UI.elements.driveFolderInput?.value || '',
                    examTitle: UI.elements.examTitleInput?.value || '',
                    generalInstructions: UI.elements.examInstructions?.value || ''
                },
                timestamp: Date.now()
            };

            const dataStr = JSON.stringify(projectData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `exam-draft-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            UI.showToast('טיוטת המבחן נשמרה בהצלחה!');
        } catch (e) {
            console.error("Save Error:", e);
            UI.showToast('שגיאה בשמירת הטיוטה: ' + e.message, 'error');
        }
    },

    handleProjectLoad: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let loaded;
                
                if (file.name.endsWith('.html')) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(e.target.result, 'text/html');
                    const scriptTag = doc.getElementById('exam-engine-data');
                    if (scriptTag && scriptTag.textContent) {
                        loaded = JSON.parse(scriptTag.textContent);
                    } else {
                        throw new Error("לא נמצא מידע פרויקט בקובץ ה-HTML זה.");
                    }
                } else {
                    loaded = JSON.parse(e.target.result);
                }
                
                if (!loaded.state || !loaded.state.questions) {
                    throw new Error("קובץ לא תקין");
                }

                ExamState.questions = loaded.state.questions;
                ExamState.parts = loaded.state.parts;
                ExamState.currentTab = loaded.state.parts[0]?.id || 'A';
                ExamState.studentName = loaded.state.studentName || '';
                ExamState.examTitle = loaded.state.examTitle || 'מבחן בגרות';
                ExamState.logoData = loaded.state.logoData;
                ExamState.solutionDataUrl = loaded.state.solutionDataUrl;
                ExamState.instructions = loaded.state.instructions;

                if (loaded.meta) {
                    if (UI.elements.examDurationInput) UI.elements.examDurationInput.value = loaded.meta.duration || 90;
                    if (UI.elements.unlockCodeInput) UI.elements.unlockCodeInput.value = loaded.meta.unlockCode || '';
                    if (UI.elements.teacherEmailInput) UI.elements.teacherEmailInput.value = loaded.meta.teacherEmail || '';
                    if (UI.elements.driveFolderInput) UI.elements.driveFolderInput.value = loaded.meta.driveLink || '';
                    if (UI.elements.examTitleInput) UI.elements.examTitleInput.value = loaded.meta.examTitle || '';
                    if (UI.elements.examInstructions) UI.elements.examInstructions.value = loaded.meta.generalInstructions || '';
                }

                if (ExamState.logoData && UI.elements.previewLogo) {
                    UI.elements.previewLogo.src = ExamState.logoData;
                    UI.elements.previewLogo.style.display = 'block';
                }
                
                if (UI.elements.previewExamTitle) UI.elements.previewExamTitle.textContent = ExamState.examTitle;
                App.updateInstructionsPreview(); 

                UI.renderPartSelector();
                UI.renderTabs();
                UI.updateStats();
                App.setTab(ExamState.currentTab);
                
                UI.showToast('המבחן נטען בהצלחה!');

            } catch (err) {
                console.error(err);
                UI.showToast('שגיאה בטעינת הקובץ: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; 
    },

    // --- New Feature: Load Submitted Exam for Viewing (No Iframe) ---
    handleSubmittedExamLoad: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const rawContent = e.target.result;
                const parser = new DOMParser();
                const doc = parser.parseFromString(rawContent, 'text/html');

                // 1. Extract Styles
                let styles = doc.querySelector('style')?.textContent || '';
                // Fix CSS conflict: .container -> .student-exam-container
                styles = styles.replace(/\.container/g, '.student-exam-container');
                // Fix Body selector to avoid messing up editor
                styles = styles.replace(/body\s*{([^}]*)}/g, '.student-exam-wrapper { $1 }');

                // 2. Extract Content
                const mainContainer = doc.getElementById('mainContainer');
                if(!mainContainer) throw new Error("מבנה קובץ לא תקין");
                
                // Fix HTML Class conflict
                mainContainer.className = mainContainer.className.replace('container', 'student-exam-container');
                
                // 3. Prepare Viewer
                const questionsList = document.getElementById('questionsList');
                questionsList.style.display = 'none'; // Hide editor preview

                let viewContainer = document.getElementById('submittedExamView');
                if(!viewContainer) {
                    viewContainer = document.createElement('div');
                    viewContainer.id = 'submittedExamView';
                    viewContainer.className = 'student-exam-wrapper'; // Apply "body" styles here
                    document.querySelector('.col-middle').appendChild(viewContainer);
                }
                viewContainer.style.display = 'block';

                // 4. Inject Content
                viewContainer.innerHTML = `
                    <style>${styles}</style>
                    <div class="review-toolbar" style="background:#2c3e50; color:white; padding:10px; margin-bottom:20px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                        <strong>מצב בדיקה</strong>
                        <button onclick="App.closeSubmittedView()" style="background:#e74c3c; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer;">סגור חזרה לעריכה</button>
                    </div>
                    ${mainContainer.outerHTML}
                `;

                // 5. Post-Processing (Enable controls)
                const container = viewContainer.querySelector('.student-exam-container');
                if(container) container.style.filter = 'none'; // Remove blur if exists

                // Show all sections
                viewContainer.querySelectorAll('.exam-section').forEach(sect => {
                    sect.style.display = 'block';
                    sect.style.borderBottom = "2px dashed #ccc";
                    sect.style.paddingBottom = "20px";
                    sect.style.marginBottom = "20px";
                });
                
                // Hide tabs within the view
                const internalTabs = viewContainer.querySelector('.tabs');
                if(internalTabs) internalTabs.style.display = 'none';

                // Show Teacher Controls & Model Answers
                const teacherControls = viewContainer.querySelector('.teacher-controls');
                if(teacherControls) teacherControls.style.display = 'block';
                
                viewContainer.querySelectorAll('.grading-area, .model-answer-secret').forEach(el => el.style.display = 'block');
                
                // Enable Inputs
                viewContainer.querySelectorAll('input, textarea').forEach(el => {
                    el.disabled = false;
                    el.removeAttribute('readonly');
                    if(el.classList.contains('grade-input')) {
                        el.setAttribute('oninput', 'window.ExamFunctions.calcTotal()'); // Rebind to global handler
                    }
                });

                // Hijack Buttons inside the loaded HTML
                // The loaded HTML has onclick="saveGradedExam()". We need to define these globally or rewrite them.
                // Rewriting onclicks is safer.
                const saveBtn = viewContainer.querySelector('button[onclick*="saveGradedExam"]');
                if(saveBtn) saveBtn.setAttribute('onclick', 'window.ExamFunctions.saveGradedExam()');
                
                const exportBtn = viewContainer.querySelector('button[onclick*="exportToDoc"]');
                if(exportBtn) exportBtn.setAttribute('onclick', 'window.ExamFunctions.exportToDoc()');

                // Initial Calc
                window.ExamFunctions.calcTotal();

                UI.showToast('המבחן נטען לבדיקה');

            } catch (err) {
                console.error(err);
                UI.showToast('שגיאה בטעינת הקובץ: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    closeSubmittedView: function() {
        const view = document.getElementById('submittedExamView');
        if(view) view.style.display = 'none';
        document.getElementById('questionsList').style.display = 'block';
    },

    // --- Question Management: Edit Feature ---
    editQuestion: function(id) {
        const q = ExamState.questions.find(q => q.id === id);
        if (!q) return;

        UI.elements.qText.value = q.text;
        UI.elements.qPoints.value = q.points;
        UI.elements.qModelAnswer.value = q.modelAnswer || '';
        UI.elements.qVideo.value = q.videoUrl || '';
        UI.elements.qImage.value = q.imageUrl || '';
        
        ExamState.tempSubQuestions = q.subQuestions ? [...q.subQuestions] : [];
        UI.renderSubQuestionInputs();

        if (q.part !== ExamState.currentTab) {
            this.setTab(q.part);
        }
        UI.elements.qPart.value = q.part; 

        ExamState.removeQuestion(id);
        UI.updateStats();
        UI.renderPreview();
        
        const rightPanel = document.getElementById('rightPanel');
        if(rightPanel) rightPanel.scrollTop = 0;
        UI.elements.qText.focus();
        UI.showToast('השאלה נטענה לעריכה.');
    },

    // --- Text Formatting Logic ---
    setupTextFormatting: function() {
        const tooltip = document.getElementById('textFormatTooltip');
        
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('#textFormatTooltip')) return; 
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            tooltip.style.display = 'none';
        });

        const handleInputInteraction = (e) => {
            const target = e.target;
            if ((target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) && 
                (target.closest('#rightPanel') || target.id === 'previewPartInstructions')) {
                
                this.activeFormatInput = target;
                const rect = target.getBoundingClientRect();
                tooltip.style.left = `${rect.left}px`;
                tooltip.style.top = `${rect.top - 40}px`; 
                tooltip.style.display = 'flex'; 
            }
        };

        document.addEventListener('focusin', handleInputInteraction);
        document.addEventListener('mouseup', handleInputInteraction);
    },

    applyFormat: function(tag) {
        if (!this.activeFormatInput) return;
        
        const el = this.activeFormatInput;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = el.value;
        const selectedText = text.substring(start, end);
        
        if (!selectedText) {
            UI.showToast('אנא סמן טקסט לעיצוב', 'error');
            return;
        }

        const newText = text.substring(0, start) + `<${tag}>${selectedText}</${tag}>` + text.substring(end);
        el.value = newText;

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        el.setSelectionRange(start, end + tag.length * 2 + 5); 
    },

    // --- Part Management Handlers ---
    onPartSelectChange: function() {
        const selectedPartId = UI.elements.qPart.value;
        const part = ExamState.parts.find(p => p.id === selectedPartId);
        if (part) {
            UI.elements.partNameInput.value = part.name;
            UI.elements.partNameLabel.textContent = part.name;
            
            const instructions = ExamState.instructions.parts[selectedPartId] || '';
            UI.elements.partInstructions.value = instructions;
            
            this.setTab(selectedPartId);
        }
    },

    setTab: function(partId) {
        ExamState.currentTab = partId;
        UI.renderTabs();
        
        const instructions = ExamState.instructions.parts[partId] || '';
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = instructions;
        
        UI.updatePartInstructionsInput(instructions);

        if(UI.elements.qPart.value !== partId) {
            UI.elements.qPart.value = partId;
            const part = ExamState.parts.find(p => p.id === partId);
            if(part) {
                UI.elements.partNameInput.value = part.name;
                UI.elements.partNameLabel.textContent = part.name;
            }
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
        UI.renderPartSelector();
        UI.updateStats();
    },

    savePartInstructions: function() {
        const val = UI.elements.partInstructions.value;
        ExamState.instructions.parts[UI.elements.qPart.value] = val;
        UI.updatePartInstructionsInput(val);
    },

    updatePartInstructionsFromPreview: function(value) {
        ExamState.instructions.parts[ExamState.currentTab] = value;
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = value;
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
