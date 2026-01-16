// Global helpers for injected teacher view
window.ExamFunctions = {
    calcTotal: function() {
        const view = document.getElementById('submittedExamView');
        if(!view) return;
        let t = 0;
        view.querySelectorAll('.grade-input').forEach(i => { if(i.value) t += parseFloat(i.value); });
        const display = view.querySelector('#teacherCalculatedScore');
        if(display) display.innerText = t;
    },
    saveGradedExam: function() {
        const view = document.getElementById('submittedExamView');
        if(!view) return;
        view.querySelectorAll('input, textarea').forEach(i => i.setAttribute('value', i.value));
        view.querySelectorAll('textarea').forEach(t => t.innerHTML = t.value);
        const content = view.innerHTML;
        const studentName = view.querySelector('#studentNameField')?.value || 'student';
        const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>בדוק-${studentName}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"><style>body{font-family:'Rubik',sans-serif;background:#f4f6f8;margin:0;padding:2%;} .container{max-width:800px;margin:0 auto;background:white;padding:5%;} .teacher-controls{display:none!important;}</style></head><body><div class="container">${content}</div></body></html>`;
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], {type:'text/html'})); a.download = "בדוק-"+studentName+".html"; a.click();
    },
    exportToDoc: function() {
        const view = document.getElementById('submittedExamView');
        if(!view) return;
        const name = view.querySelector('#studentNameField')?.value || '';
        const score = view.querySelector('#teacherCalculatedScore')?.innerText || '0';
        let content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset="utf-8"></head><body><h1>מבחן בדוק: ${name}</h1><h2>ציון: ${score}</h2>`;
        view.querySelectorAll('.q-block, .sub-question-block').forEach((block,i) => {
             const text = (block.querySelector('.q-content')||block.querySelector('.sub-q-text'))?.innerText;
             const ans = block.querySelector('.student-ans')?.value;
             const grade = block.querySelector('.grade-input')?.value;
             const comm = block.querySelector('.teacher-comment')?.value;
             content += `<p><strong>שאלה/סעיף:</strong> ${text}</p><p>תשובה: ${ans}</p><p style='color:red'>ציון: ${grade} | הערה: ${comm}</p><hr>`;
        });
        content += '</body></html>';
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff', content], {type:'application/msword'})); a.download = "בדוק-"+name+".doc"; a.click();
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
            confirmBtn.onclick = () => { if (UI.confirmCallback) UI.confirmCallback(); UI.closeModal(); };
        }
    },

    saveProject: function() {
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
        const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `exam-draft.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        UI.showToast('טיוטה נשמרה!');
    },

    handleProjectLoad: function(event) {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let loaded = JSON.parse(e.target.result); // Default JSON
                if(file.name.endsWith('.html')) {
                     const parser = new DOMParser();
                     const doc = parser.parseFromString(e.target.result, 'text/html');
                     const script = doc.getElementById('exam-engine-data');
                     if(script) loaded = JSON.parse(script.textContent);
                }
                
                ExamState.questions = loaded.state.questions;
                ExamState.parts = loaded.state.parts;
                ExamState.currentTab = loaded.state.parts[0].id;
                ExamState.studentName = loaded.state.studentName;
                ExamState.examTitle = loaded.state.examTitle;
                ExamState.logoData = loaded.state.logoData;
                ExamState.solutionDataUrl = loaded.state.solutionDataUrl;
                ExamState.instructions = loaded.state.instructions;
                
                // Restore UI inputs
                UI.elements.examDurationInput.value = loaded.meta.duration;
                UI.elements.unlockCodeInput.value = loaded.meta.unlockCode;
                UI.elements.teacherEmailInput.value = loaded.meta.teacherEmail;
                UI.elements.driveFolderInput.value = loaded.meta.driveLink;
                UI.elements.examTitleInput.value = loaded.meta.examTitle;
                UI.elements.examInstructions.value = loaded.meta.generalInstructions;

                if(ExamState.logoData) UI.elements.previewLogo.src = ExamState.logoData;
                UI.elements.previewExamTitle.textContent = ExamState.examTitle;
                App.updateInstructionsPreview();

                UI.renderPartSelector(); UI.renderTabs(); UI.updateStats(); App.setTab(ExamState.currentTab);
                UI.showToast('נטען בהצלחה!');
            } catch(err) { UI.showToast('שגיאה בטעינה', 'error'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    handleSubmittedExamLoad: function(event) {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const raw = e.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(raw, 'text/html');
            
            // Extract Content
            const mainContainer = doc.getElementById('mainContainer');
            if(!mainContainer) { UI.showToast('קובץ לא תקין', 'error'); return; }

            // Hide Editor
            document.getElementById('questionsList').style.display = 'none';

            // Create/Show View
            let view = document.getElementById('submittedExamView');
            if(!view) {
                view = document.createElement('div');
                view.id = 'submittedExamView';
                document.querySelector('.col-middle').appendChild(view);
            }
            view.style.display = 'block';
            
            // Inject content
            view.innerHTML = `
                <div class="review-toolbar"><strong>מצב בדיקה</strong> <button onclick="App.closeSubmittedView()" style="background:#e74c3c;border:none;color:white;padding:5px;">סגור</button></div>
                ${mainContainer.innerHTML}
            `;

            // Enable Controls
            view.querySelector('.teacher-controls').style.display = 'block';
            view.querySelectorAll('.grading-area, .model-answer-secret').forEach(e => e.style.display='block');
            view.querySelectorAll('.exam-section').forEach(e => e.style.display='block');
            view.querySelectorAll('.tabs').forEach(e => e.style.display='none');
            
            view.querySelectorAll('input, textarea').forEach(el => {
                el.disabled = false; el.removeAttribute('readonly');
                if(el.classList.contains('grade-input')) el.setAttribute('oninput', 'window.ExamFunctions.calcTotal()');
            });

            // Re-bind buttons
            const saveBtn = view.querySelector('button[onclick*="saveGradedExam"]');
            if(saveBtn) saveBtn.setAttribute('onclick', 'window.ExamFunctions.saveGradedExam()');
            const expBtn = view.querySelector('button[onclick*="exportToDoc"]');
            if(expBtn) expBtn.setAttribute('onclick', 'window.ExamFunctions.exportToDoc()');

            window.ExamFunctions.calcTotal();
            UI.showToast('נטען לבדיקה');
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    closeSubmittedView: function() {
        const view = document.getElementById('submittedExamView');
        if(view) view.style.display = 'none';
        document.getElementById('questionsList').style.display = 'block';
    },

    // --- Editing & Adding ---
    editQuestion: function(id) {
        const q = ExamState.questions.find(q => q.id === id);
        if(!q) return;
        
        UI.elements.qText.value = q.text;
        UI.elements.qPoints.value = q.points;
        UI.elements.qModelAnswer.value = q.modelAnswer || '';
        UI.elements.qVideo.value = q.videoUrl || '';
        UI.elements.qEmbed.value = q.embedCode || '';
        UI.elements.qImage.value = q.imageUrl || '';
        
        // Restore controls
        const c = q.videoControls || {download:false, fullscreen:false, playbackrate:true, pip:false};
        if(document.getElementById('vc-download')) document.getElementById('vc-download').checked = c.download;
        if(document.getElementById('vc-fullscreen')) document.getElementById('vc-fullscreen').checked = c.fullscreen;
        if(document.getElementById('vc-playbackrate')) document.getElementById('vc-playbackrate').checked = c.playbackrate;
        if(document.getElementById('vc-pip')) document.getElementById('vc-pip').checked = c.pip;

        ExamState.tempSubQuestions = q.subQuestions ? [...q.subQuestions] : [];
        UI.renderSubQuestionInputs();
        
        if(q.part !== ExamState.currentTab) App.setTab(q.part);
        UI.elements.qPart.value = q.part;

        ExamState.removeQuestion(id);
        UI.updateStats();
        UI.renderPreview();
        document.getElementById('rightPanel').scrollTop = 0;
        UI.showToast('שאלה בטעינה לעריכה');
    },

    addQuestion: function() {
        const text = UI.elements.qText.value.trim();
        if(!text) { UI.showToast('חסר תוכן', 'error'); return; }

        let points = parseInt(UI.elements.qPoints.value) || 0;
        if(ExamState.tempSubQuestions.length > 0) {
            points = ExamState.tempSubQuestions.reduce((acc,c) => acc+(c.points||0), 0);
        }

        const videoControls = {
            download: document.getElementById('vc-download')?.checked || false,
            fullscreen: document.getElementById('vc-fullscreen')?.checked || false,
            playbackrate: document.getElementById('vc-playbackrate')?.checked || false,
            pip: document.getElementById('vc-pip')?.checked || false
        };

        const q = {
            id: Date.now(),
            part: UI.elements.qPart.value,
            points,
            text,
            modelAnswer: UI.elements.qModelAnswer.value.trim(),
            videoUrl: UI.elements.qVideo.value.trim(),
            embedCode: UI.elements.qEmbed.value.trim(),
            imageUrl: UI.elements.qImage.value.trim(),
            videoControls,
            subQuestions: [...ExamState.tempSubQuestions]
        };

        ExamState.addQuestion(q);
        
        // Reset
        UI.elements.qText.value = '';
        UI.elements.qModelAnswer.value = '';
        UI.elements.qVideo.value = '';
        UI.elements.qEmbed.value = '';
        UI.elements.qImage.value = '';
        ExamState.tempSubQuestions = [];
        UI.renderSubQuestionInputs();
        UI.updateStats();
        UI.renderPreview();
        UI.showToast('שאלה נוספה');
    },

    deleteQuestion: function(id) {
        UI.showConfirm('מחיקה', 'למחוק?', () => {
            ExamState.removeQuestion(id);
            UI.updateStats();
            UI.renderPreview();
        });
    },

    // --- Sub Questions ---
    addSubQuestionField: function() {
        ExamState.tempSubQuestions.push({ id: Date.now(), text: '', points: 5, modelAnswer: '' });
        UI.renderSubQuestionInputs();
    },
    removeSubQuestionField: function(id) {
        ExamState.tempSubQuestions = ExamState.tempSubQuestions.filter(s => s.id !== id);
        UI.renderSubQuestionInputs();
    },
    updateSubQuestionData: function(id, field, value) {
        const s = ExamState.tempSubQuestions.find(s => s.id === id);
        if(s) {
            s[field] = value;
            if(field==='points') UI.renderSubQuestionInputs(false); // don't redraw focus
        }
    },

    // --- Inputs ---
    updateExamTitle: function() {
        ExamState.examTitle = UI.elements.examTitleInput.value || 'מבחן';
        UI.elements.previewExamTitle.textContent = ExamState.examTitle;
    },
    updateInstructionsPreview: function() {
        const txt = UI.elements.examInstructions.value;
        ExamState.instructions.general = txt;
        if(txt) {
            UI.elements.previewInstructionsBox.style.display = 'block';
            UI.elements.previewInstructionsBox.textContent = txt;
        } else {
            UI.elements.previewInstructionsBox.style.display = 'none';
        }
    },
    updatePartName: function() {
        ExamState.updatePartName(UI.elements.qPart.value, UI.elements.partNameInput.value);
        UI.elements.partNameLabel.textContent = UI.elements.partNameInput.value;
        UI.renderTabs();
        UI.renderPartSelector();
    },
    savePartInstructions: function() {
        const val = UI.elements.partInstructions.value;
        ExamState.instructions.parts[UI.elements.qPart.value] = val;
        UI.updatePartInstructionsInput(val);
    },
    updatePartInstructionsFromPreview: function(val) {
        ExamState.instructions.parts[ExamState.currentTab] = val;
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = val;
    },
    updateFilenamePreview: function() {
        ExamState.studentName = UI.elements.studentNameInput.value;
        UI.elements.filenamePreview.textContent = (ExamState.studentName || 'תלמיד') + ' - מבחן.html';
    },

    // --- Formatting ---
    setupTextFormatting: function() {
        const tool = document.getElementById('textFormatTooltip');
        document.addEventListener('mouseup', e => {
            const t = e.target;
            if((t.tagName==='TEXTAREA'||t.tagName==='INPUT') && (t.closest('#rightPanel')||t.id==='previewPartInstructions')) {
                if(t.selectionStart !== t.selectionEnd) {
                    this.activeFormatInput = t;
                    const r = t.getBoundingClientRect();
                    tool.style.left = r.left + 'px';
                    tool.style.top = (r.top - 40) + 'px';
                    tool.style.display = 'flex';
                } else {
                    tool.style.display = 'none';
                }
            } else if (!t.closest('#textFormatTooltip')) {
                tool.style.display = 'none';
            }
        });
    },
    applyFormat: function(tag) {
        const el = this.activeFormatInput;
        if(!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const txt = el.value;
        el.value = txt.slice(0, start) + `<${tag}>` + txt.slice(start, end) + `</${tag}>` + txt.slice(end);
        el.dispatchEvent(new Event('input', {bubbles:true}));
    },

    // --- Files ---
    handleLogoUpload: function(e) {
        const f = e.target.files[0];
        if(f) {
            const r = new FileReader();
            r.onload = ev => {
                ExamState.logoData = ev.target.result;
                UI.elements.previewLogo.src = ev.target.result;
                UI.elements.previewLogo.style.display = 'block';
            };
            r.readAsDataURL(f);
        }
    },
    handleSolutionUpload: function(e) {
        const f = e.target.files[0];
        if(f) {
            const r = new FileReader();
            r.onload = ev => {
                ExamState.solutionDataUrl = ev.target.result;
                UI.showToast('פתרון נטען');
            };
            r.readAsDataURL(f);
        }
    },

    // --- Parts ---
    addPart: function() {
        const id = ExamState.getNextPartId();
        ExamState.addPart({id, name: 'חלק חדש'});
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        UI.elements.qPart.value = id;
        App.onPartSelectChange();
    },
    removePart: function() {
        if(ExamState.parts.length <= 1) return;
        UI.showConfirm('מחיקה', 'למחוק חלק?', () => {
            ExamState.removePart(UI.elements.qPart.value);
            if(ExamState.parts.length > 0) ExamState.currentTab = ExamState.parts[0].id;
            UI.renderPartSelector();
            UI.renderTabs();
            UI.updateStats();
            App.onPartSelectChange();
            UI.renderPreview();
        });
    }
};

window.onload = function() { App.init(); };
